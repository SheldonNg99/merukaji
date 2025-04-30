import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { extractVideoId, getVideoTranscript, getVideoMetadata } from '@/lib/youtube';
import { convertTranscriptToParagraphs, formatSummary } from '@/lib/textProcessing';
import { checkRateLimit, recordUsage } from '@/lib/rateLimiter';
import { generateSummaryWithFallback } from '@/lib/fallbackMechanisms';
import { getCachedSummary, cacheSummary } from '@/lib/summaryCache';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        logger.info('Summary request received', {
            requestId,
            method: req.method
        });

        // 1. Get user session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            logger.warn('Unauthorized summary request', { requestId });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const userTier = session.user.tier || 'free';

        logger.info('Authenticated summary request', {
            requestId,
            userId,
            userTier
        });

        // 2. Check rate limits
        const rateLimitCheck = await checkRateLimit(userId, userTier);
        if (!rateLimitCheck.allowed) {
            logger.warn('Rate limit exceeded', {
                requestId,
                userId,
                reason: rateLimitCheck.reason,
                remaining: rateLimitCheck.remaining
            });

            return NextResponse.json({
                error: rateLimitCheck.reason === 'daily_limit_exceeded'
                    ? 'Daily limit exceeded. Please upgrade your plan for more summaries.'
                    : 'Too many requests. Please try again in a minute.',
                limits: rateLimitCheck.remaining
            }, { status: 429 });
        }

        // 3. Get request data
        const data = await req.json();
        const { url, summaryType = 'short' } = data;

        if (!url) {
            logger.warn('Missing YouTube URL', { requestId });
            return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
        }

        // 4. Extract video ID
        const videoId = extractVideoId(url);
        if (!videoId) {
            logger.warn('Invalid YouTube URL format', { requestId, url });
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        logger.debug('Processing video', { requestId, videoId, summaryType });

        const cachedSummary = await getCachedSummary(videoId, summaryType, requestId);

        if (cachedSummary) {
            // Still record usage for rate limiting
            await recordUsage(userId, videoId);

            return NextResponse.json({
                success: true,
                id: cachedSummary.id,
                summary: cachedSummary.summary,
                metadata: cachedSummary.metadata,
                provider: cachedSummary.provider,
                timestamp: cachedSummary.timestamp,
                cached: true,
                limits: rateLimitCheck.remaining
            });
        }

        // 6. Get video metadata and transcript in parallel
        logger.debug('Fetching metadata and transcript', { requestId, videoId });

        const [metadata, transcriptSegments] = await Promise.all([
            getVideoMetadata(videoId),
            getVideoTranscript(videoId)
        ]);

        // 7. Process transcript into coherent paragraphs
        const paragraphs = convertTranscriptToParagraphs(transcriptSegments);
        const processedTranscript = paragraphs.join('\n\n');

        // Log transcript processing stats
        logger.debug('Transcript processed', {
            requestId,
            originalSegments: transcriptSegments.length,
            paragraphs: paragraphs.length,
            processedLength: processedTranscript.length
        });

        // 8. Generate summary
        const preferredProvider = userTier === 'max' ? 'openai' : 'gemini';

        const summaryResult = await generateSummaryWithFallback(
            processedTranscript,
            metadata,
            summaryType as 'short' | 'comprehensive',
            preferredProvider as 'gemini' | 'openai'
        );

        const formattedSummary = formatSummary(summaryResult.summary);

        // 9. Cache the result with better error handling
        let insertedId: string | null = null;
        try {
            insertedId = await cacheSummary({
                userId,
                videoId,
                summaryType,
                summary: formattedSummary,
                metadata,
                provider: summaryResult.provider,
            }, requestId);
        } catch (cacheError) {
            // Log cache error but continue - don't fail the request just because caching failed
            logger.error('Failed to cache summary', {
                requestId,
                videoId,
                error: cacheError instanceof Error ? cacheError.message : String(cacheError)
            });
        }

        // 10. Record usage for rate limiting
        await recordUsage(userId, videoId);

        // 11. Return result
        return NextResponse.json({
            success: true,
            id: insertedId,
            summary: formattedSummary,
            metadata,
            provider: summaryResult.provider,
            timestamp: new Date().toISOString(),
            limits: rateLimitCheck.remaining
        });

    } catch (error: unknown) {
        logger.error('Failed to generate summary', {
            requestId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            error: `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
}