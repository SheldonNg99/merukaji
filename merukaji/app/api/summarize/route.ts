// app/api/summarize/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { extractVideoId, getVideoTranscript, getVideoMetadata } from '@/lib/youtube';
import { processTranscriptSegments, formatSummary } from '@/lib/textProcessing';
import { checkRateLimit, recordUsage } from '@/lib/rateLimiter';
import { generateSummaryWithFallback } from '@/lib/fallbackMechanisms';
import { logger } from '@/lib/logger';
import clientPromise from '@/lib/mongodb';

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

        // 5. Get cached summary if available
        const client = await clientPromise;
        const db = client.db();

        const cachedSummary = await db.collection('summaries').findOne({
            videoId,
            summaryType,
            // Only return relatively recent summaries (last 7 days)
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        if (cachedSummary) {
            logger.info('Returning cached summary', {
                requestId,
                videoId,
                summaryAge: `${Math.round((Date.now() - cachedSummary.createdAt.getTime()) / (60 * 60 * 1000))} hours`
            });

            // Still record usage for rate limiting
            await recordUsage(userId, videoId);

            return NextResponse.json({
                success: true,
                summary: cachedSummary.summary,
                metadata: cachedSummary.metadata,
                cached: true
            });
        }

        // 6. Get video metadata and transcript in parallel
        logger.debug('Fetching metadata and transcript', { requestId, videoId });

        const [metadata, transcript] = await Promise.all([
            getVideoMetadata(videoId),
            getVideoTranscript(videoId)
        ]);

        // 7. Process transcript segments into a single text
        const processedTranscript = processTranscriptSegments(transcript);

        // 8. Generate summary
        const preferredProvider = userTier === 'max' ? 'openai' : 'gemini'; // Example of tier benefits

        const summaryResult = await generateSummaryWithFallback(
            processedTranscript,
            metadata,
            summaryType as 'short' | 'comprehensive',
            preferredProvider as 'gemini' | 'openai'
        );

        const formattedSummary = formatSummary(summaryResult.summary);

        // 9. Cache the result
        await db.collection('summaries').insertOne({
            userId,
            videoId,
            summaryType,
            summary: formattedSummary,
            metadata,
            provider: summaryResult.provider,
            createdAt: new Date()
        });

        // 10. Record usage for rate limiting
        await recordUsage(userId, videoId);

        logger.info('Summary generated successfully', {
            requestId,
            videoId,
            provider: summaryResult.provider,
            summaryLength: formattedSummary.length
        });

        // 11. Return result
        return NextResponse.json({
            success: true,
            summary: formattedSummary,
            metadata,
            provider: summaryResult.provider,
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