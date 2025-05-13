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

            // Start database transaction
            const { data: transaction, error: transactionError } = await supabaseAdmin
                .rpc('handle_summary_creation', {
                    p_user_id: userId,
                    p_video_id: providedMetadata.videoId,
                    p_summary_type: summaryType,
                    p_summary: formattedSummary,
                    p_metadata: providedMetadata,
                    p_provider: summaryResult.provider,
                    p_credit_cost: creditCost,
                    p_credits_description: `Used: ${creditCost} credit${creditCost > 1 ? 's' : ''} for ${summaryType} summary`
                });

            if (transactionError) {
                logger.error('Transaction failed', {
                    requestId,
                    error: transactionError.message
                });
                throw new Error('Failed to process summary');
            }

            logger.info('Database transaction completed', {
                requestId,
                summaryId: transaction.summary_id
            });

            // Get updated balance
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('credit_balance')
                .eq('id', userId)
                .single();

            const newBalance = userData?.credit_balance || 0;

            // Record usage
            await supabaseAdmin
                .from('usage_stats')
                .insert({
                    user_id: userId,
                    video_id: providedMetadata.videoId,
                    action: 'summarize',
                    timestamp: new Date().toISOString(),
                    reset: false
                });

            logger.info('Summary process completed successfully', {
                requestId,
                videoId: providedMetadata.videoId,
                summaryId: transaction.summary_id,
                creditsUsed: creditCost,
                remainingCredits: newBalance
            });

            return NextResponse.json({
                success: true,
                id: transaction.summary_id,
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