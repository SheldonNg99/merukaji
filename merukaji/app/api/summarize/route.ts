// app/api/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { extractVideoId, getVideoTranscript, getVideoMetadata } from '@/lib/youtube';
import { convertTranscriptToParagraphs, formatSummary } from '@/lib/textProcessing';
import { checkCreditAvailability } from '@/lib/rateLimiter';
import { generateSummaryWithFallback } from '@/lib/fallbackMechanisms';
import { validateYouTubeUrl, sanitizeInput } from '@/lib/securityUtils';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        logger.info('Summary request received', { requestId });

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Get request parameters
        const { url, summaryType = 'short' } = await req.json();

        const sanitizedUrl = sanitizeInput(url || '');
        if (!url || !validateYouTubeUrl(sanitizedUrl)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        // Calculate credit cost based on summary type
        const creditCost = summaryType === 'comprehensive' ? 2 : 1;

        // Check if user has enough credits
        const creditCheck = await checkCreditAvailability(userId, creditCost);
        if (!creditCheck.allowed) {
            return NextResponse.json({
                error: 'Insufficient credits',
                details: creditCheck.reason,
                credits: creditCheck.remaining,
                requiresUpgrade: creditCheck.requiresUpgrade
            }, { status: 402 }); // 402: Payment Required
        }

        // Check if summary is already cached
        const { data: cached } = await supabaseAdmin
            .from('summaries')
            .select('*')
            .eq('user_id', userId)
            .eq('video_id', videoId)
            .eq('summary_type', summaryType)
            .single();

        // If cached, return it without deducting credits
        if (cached) {
            logger.info('Returning cached summary', {
                requestId,
                videoId,
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
                    used: 0, // No credits used for cached summaries
                    remaining: creditCheck.remaining
                }
            });
        }

        // Continue with transcript extraction and summarization
        const [metadata, transcript] = await Promise.all([
            getVideoMetadata(videoId),
            getVideoTranscript(videoId)
        ]);

        const paragraphs = convertTranscriptToParagraphs(transcript);
        const processedTranscript = paragraphs.join('\n\n');

        // Choose AI provider based on summary type
        const preferredProvider = summaryType === 'comprehensive' ? 'openai' : 'gemini';

        const summaryResult = await generateSummaryWithFallback(
            processedTranscript,
            metadata,
            summaryType as 'short' | 'comprehensive',
            preferredProvider as 'gemini' | 'openai'
        );

        const formattedSummary = formatSummary(summaryResult.summary);

        // Deduct credits from user
        const { error: creditError } = await supabaseAdmin
            .from('credits')
            .insert({
                user_id: userId,
                amount: -creditCost,
                description: `Used: ${creditCost} credit${creditCost > 1 ? 's' : ''} for ${summaryType} summary`,
                created_at: new Date().toISOString(),
            });

        if (creditError) {
            logger.error('Failed to record credit usage', {
                requestId,
                userId,
                credits: creditCost,
                error: creditError.message
            });
            // Continue anyway, as we want to deliver the summary even if credit tracking fails
        }

        // Update user's credit balance
        const { data: userData, error: balanceReadError } = await supabaseAdmin
            .from('users')
            .select('credit_balance')
            .eq('id', userId)
            .single();

        if (balanceReadError) {
            logger.error('Failed to read user credit balance', {
                requestId,
                userId,
                error: balanceReadError.message
            });
        }

        // Calculate new balance and update
        const currentBalance = userData?.credit_balance || 0;
        const newBalance = currentBalance - creditCost;

        const { error: balanceError } = await supabaseAdmin
            .from('users')
            .update({
                credit_balance: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (balanceError) {
            logger.error('Failed to update user credit balance', {
                requestId,
                userId,
                credits: creditCost,
                error: balanceError.message
            });
            // Continue anyway
        }

        // Save summary to database
        const { data: insertResult, error: insertError } = await supabaseAdmin
            .from('summaries')
            .insert({
                user_id: userId,
                video_id: videoId,
                summary_type: summaryType,
                summary: formattedSummary,
                metadata,
                provider: summaryResult.provider,
                credits_used: creditCost,
                created_at: new Date().toISOString(),
            })
            .select('id, created_at')
            .single();

        if (insertError) {
            logger.error('Failed to save summary', {
                requestId,
                videoId,
                error: insertError.message
            });
        }

        // Record usage statistics
        const { error: usageError } = await supabaseAdmin
            .from('usage_stats')
            .insert({
                user_id: userId,
                video_id: videoId,
                action: 'summarize',
                timestamp: new Date().toISOString(),
                reset: false
            });

        if (usageError) {
            logger.error('Failed to record usage stats', {
                requestId,
                userId,
                videoId,
                error: usageError.message
            });
        }

        // Get updated credit balance
        const { data: userCredits } = await supabaseAdmin
            .from('users')
            .select('credit_balance')
            .eq('id', userId)
            .single();

        const remainingCredits = userCredits?.credit_balance || 0;

        logger.info('Summary generated successfully', {
            requestId,
            videoId,
            summaryId: insertResult?.id,
            creditsUsed: creditCost,
            remainingCredits
        });

        return NextResponse.json({
            success: true,
            id: insertResult?.id || null,
            summary: formattedSummary,
            metadata,
            provider: summaryResult.provider,
            timestamp: insertResult?.created_at || new Date().toISOString(),
            credits: {
                used: creditCost,
                remaining: remainingCredits
            }
        });

    } catch (error) {
        logger.error('Failed to generate summary', {
            requestId,
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
}