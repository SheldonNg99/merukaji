import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { extractVideoId, getVideoTranscript, getVideoMetadata } from '@/lib/youtube';
import { convertTranscriptToParagraphs, formatSummary } from '@/lib/textProcessing';
import { checkRateLimit, recordUsage } from '@/lib/rateLimiter';
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
        const userTier = session.user.tier || 'free';

        const rateLimitCheck = await checkRateLimit(userId, userTier);
        if (!rateLimitCheck.allowed) {
            return NextResponse.json({
                error: rateLimitCheck.reason === 'daily_limit_exceeded'
                    ? 'Daily limit exceeded. Please upgrade your plan.'
                    : 'Too many requests. Try again soon.',
                limits: rateLimitCheck.remaining
            }, { status: 429 });
        }

        const { url, summaryType = 'short' } = await req.json();

        const sanitizedUrl = sanitizeInput(url || '');
        if (!url || !validateYouTubeUrl(sanitizedUrl)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        // Check cache
        const { data: cached } = await supabaseAdmin
            .from('summaries')
            .select('*')
            .eq('user_id', userId)
            .eq('video_id', videoId)
            .eq('summary_type', summaryType)
            .single();

        if (cached) {
            await recordUsage(userId, videoId); // still count it
            return NextResponse.json({
                success: true,
                id: cached.id,
                summary: cached.summary,
                metadata: cached.metadata,
                provider: cached.provider,
                timestamp: cached.created_at,
                cached: true,
                limits: rateLimitCheck.remaining
            });
        }

        const [metadata, transcript] = await Promise.all([
            getVideoMetadata(videoId),
            getVideoTranscript(videoId)
        ]);

        const paragraphs = convertTranscriptToParagraphs(transcript);
        const processedTranscript = paragraphs.join('\n\n');

        const preferredProvider = userTier === 'max' ? 'openai' : 'gemini';
        const summaryResult = await generateSummaryWithFallback(
            processedTranscript,
            metadata,
            summaryType as 'short' | 'comprehensive',
            preferredProvider as 'gemini' | 'openai'
        );

        const formattedSummary = formatSummary(summaryResult.summary);

        // Save to Supabase
        const { data: insertResult, error: insertError } = await supabaseAdmin
            .from('summaries')
            .insert({
                user_id: userId,
                video_id: videoId,
                summary_type: summaryType,
                summary: formattedSummary,
                metadata,
                provider: summaryResult.provider,
            })
            .select('id, created_at')
            .single();

        if (insertError) {
            logger.error('Failed to cache summary', {
                requestId,
                videoId,
                error: insertError.message
            });
        }

        await recordUsage(userId, videoId);

        return NextResponse.json({
            success: true,
            id: insertResult?.id || null,
            summary: formattedSummary,
            metadata,
            provider: summaryResult.provider,
            timestamp: insertResult?.created_at || new Date().toISOString(),
            limits: rateLimitCheck.remaining
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
