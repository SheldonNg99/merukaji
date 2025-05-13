// app/api/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { convertTranscriptToParagraphs, formatSummary } from '@/lib/textProcessing';
import { checkCreditAvailability } from '@/lib/rateLimiter';
import { generateSummaryWithFallback } from '@/lib/fallbackMechanisms';
import { validateYouTubeUrl } from '@/lib/securityUtils';
import { logger } from '@/lib/logger';
import { TranscriptSegment } from '@/types/youtube';

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        logger.info('Summary request received', { requestId });

        // 1. Authentication Check
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logger.warn('Unauthorized request', { requestId });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        logger.info('User authenticated', { requestId, userId });

        // 2. Parse request body
        let body;
        try {
            body = await req.json();
            logger.info('Request body received', {
                requestId,
                url: body.url,
                summaryType: body.summaryType,
                hasMetadata: !!body.metadata,
                hasTranscript: !!body.transcript
            });
        } catch (error) {
            logger.error('Failed to parse request body', {
                requestId,
                error: error instanceof Error ? error.message : 'Unknown parsing error'
            });
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { url, summaryType = 'short', metadata: providedMetadata, transcript: providedTranscript } = body;

        if (!url) {
            logger.warn('No URL provided', { requestId });
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 3. URL Validation
        if (!validateYouTubeUrl(url)) {
            logger.warn('Invalid YouTube URL format', {
                requestId,
                url
            });
            return NextResponse.json({
                error: 'Invalid YouTube URL',
                details: 'URL must be in format: https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID'
            }, { status: 400 });
        }

        // 4. Calculate credit cost
        const creditCost = summaryType === 'comprehensive' ? 2 : 1;
        logger.info('Credit cost calculated', {
            requestId,
            summaryType,
            creditCost
        });

        // 5. Check credit availability
        const creditCheck = await checkCreditAvailability(userId, creditCost);
        logger.info('Credit check completed', {
            requestId,
            allowed: creditCheck.allowed,
            remaining: creditCheck.remaining
        });

        if (!creditCheck.allowed) {
            return NextResponse.json({
                error: 'Insufficient credits',
                details: creditCheck.reason,
                credits: creditCheck.remaining,
                requiresUpgrade: creditCheck.requiresUpgrade
            }, { status: 402 });
        }

        // 6. Check cache
        const { data: cached } = await supabaseAdmin
            .from('summaries')
            .select('*')
            .eq('user_id', userId)
            .eq('video_id', providedMetadata.videoId)
            .eq('summary_type', summaryType)
            .single();

        if (cached) {
            logger.info('Cache hit', {
                requestId,
                videoId: providedMetadata.videoId,
                summaryId: cached.id
            });

            return NextResponse.json({
                success: true,
                id: cached.id,
                summary: cached.summary,
                metadata: cached.metadata,
                provider: cached.provider,
                timestamp: cached.created_at,
                cached: true,
                credits: {
                    used: 0,
                    remaining: creditCheck.remaining
                }
            });
        }

        logger.info('Cache miss, proceeding with summary generation', {
            requestId,
            videoId: providedMetadata.videoId
        });

        // 7. Process Transcript and Generate Summary
        try {
            if (!providedTranscript || !providedMetadata) {
                throw new Error('Missing transcript or metadata');
            }

            // Process transcript
            const transcript = providedTranscript as TranscriptSegment[];
            const paragraphs = convertTranscriptToParagraphs(transcript);
            const processedTranscript = paragraphs.join('\n\n');

            // Generate summary
            const preferredProvider = summaryType === 'comprehensive' ? 'openai' : 'gemini';
            logger.info('Starting summary generation', {
                requestId,
                provider: preferredProvider,
                transcriptLength: processedTranscript.length
            });

            const summaryResult = await generateSummaryWithFallback(
                processedTranscript,
                providedMetadata,
                summaryType,
                preferredProvider
            );

            const formattedSummary = formatSummary(summaryResult.summary);

            logger.info('Summary generated', {
                requestId,
                summaryLength: formattedSummary.length,
                actualProvider: summaryResult.provider
            });

            // Create summary record
            const { data: newSummary, error: insertError } = await supabaseAdmin
                .from('summaries')
                .insert({
                    user_id: userId,
                    video_id: providedMetadata.videoId,
                    summary_type: summaryType,
                    summary: formattedSummary,
                    metadata: providedMetadata,
                    provider: summaryResult.provider,
                    created_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (insertError || !newSummary) {
                logger.error('Failed to save summary', {
                    requestId,
                    error: insertError?.message || 'No data returned'
                });
                throw new Error('Failed to save summary');
            }

            // Deduct credits
            const { error: creditError } = await supabaseAdmin
                .from('credits')
                .insert({
                    user_id: userId,
                    amount: -creditCost,
                    description: `Used: ${creditCost} credit${creditCost > 1 ? 's' : ''} for ${summaryType} summary`,
                    created_at: new Date().toISOString()
                });

            if (creditError) {
                logger.error('Failed to deduct credits', {
                    requestId,
                    error: creditError.message
                });
                // Don't throw here, summary was created successfully
            }

            // Update user balance
            const { error: balanceError } = await supabaseAdmin
                .from('users')
                .update({
                    credit_balance: creditCheck.remaining - creditCost,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (balanceError) {
                logger.error('Failed to update user balance', {
                    requestId,
                    error: balanceError.message
                });
            }

            const newBalance = creditCheck.remaining - creditCost;

            logger.info('Summary process completed successfully', {
                requestId,
                videoId: providedMetadata.videoId,
                summaryId: newSummary.id,
                creditsUsed: creditCost,
                remainingCredits: newBalance
            });

            return NextResponse.json({
                success: true,
                id: newSummary.id,  // This is the critical fix
                summary: formattedSummary,
                metadata: providedMetadata,
                provider: summaryResult.provider,
                timestamp: new Date().toISOString(),
                credits: {
                    used: creditCost,
                    remaining: newBalance
                }
            });

        } catch (error) {
            logger.error('Error processing video', {
                requestId,
                videoId: providedMetadata?.videoId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });

            return NextResponse.json({
                error: 'Failed to process video',
                details: error instanceof Error ? error.message : 'Unknown error'
            }, { status: 500 });
        }

    } catch (error) {
        logger.error('Failed to generate summary', {
            requestId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}