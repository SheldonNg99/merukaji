// api/youtube/transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { extractVideoId, getVideoTranscript, getVideoMetadata, cacheTranscript } from '@/lib/youtube';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID(); // Generate unique ID for this request

    try {
        logger.info('YouTube transcript request received', {
            requestId,
            method: req.method
        });

        // 1. Get user session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            logger.warn('Unauthorized transcript request', { requestId });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        logger.info('Authenticated user request', {
            requestId,
            userId: session.user.id,
            userTier: session.user.tier
        });

        // 2. Get request data
        const data = await req.json();
        const { url } = data;

        if (!url) {
            logger.warn('Missing YouTube URL', { requestId });
            return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
        }

        // 3. Extract video ID from URL
        const videoId = extractVideoId(url);
        if (!videoId) {
            logger.warn('Invalid YouTube URL format', { requestId, url });
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        logger.debug('Video ID extracted successfully', { requestId, videoId, originalUrl: url });

        // 4. Get video metadata and transcript in parallel
        const startTime = Date.now();
        logger.debug('Fetching metadata and transcript', { requestId, videoId });

        const [metadata, transcript] = await Promise.all([
            getVideoMetadata(videoId),
            getVideoTranscript(videoId)
        ]);

        await cacheTranscript(videoId, transcript);
        logger.info('Transcript cached successfully', { requestId, videoId });

        const duration = Date.now() - startTime;
        logger.info('Fetched video data successfully', {
            requestId,
            videoId,
            duration: `${duration}ms`,
            transcriptSegments: transcript.length,
            videoTitle: metadata.title
        });

        // 5. Return result
        return NextResponse.json({
            success: true,
            metadata,
            transcript
        });

    } catch (error: unknown) {
        logger.error('Failed to process YouTube transcript', {
            requestId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            error: `Failed to process video: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
}