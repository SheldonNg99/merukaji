// app/api/youtube/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const { videoId } = await req.json();

        if (!videoId) {
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            );
        }

        logger.info('Proxying YouTube request', { videoId });

        const WORKER_URL = 'https://merukaji-youtube-proxy.merukaji413.workers.dev';

        const response = await fetch(`${WORKER_URL}?videoId=${videoId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(30000)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            logger.error('Worker returned error', {
                status: response.status,
                error: data.error,
                videoId
            });

            return NextResponse.json(
                { error: data.error || 'Failed to fetch transcript' },
                { status: response.status || 500 }
            );
        }

        // Convert the Innertube API response to match existing format
        const formattedResponse = {
            success: true,
            playerResponse: {
                videoDetails: data.videoDetails
            },
            transcript: data.transcript,
            languageCode: data.languageCode,
            trackName: data.trackName
        };

        logger.info('Successfully fetched transcript', {
            videoId,
            hasTranscript: !!data.transcript,
            languageCode: data.languageCode
        });

        return NextResponse.json(formattedResponse);

    } catch (error) {
        logger.error('YouTube proxy error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch video data' },
            { status: 500 }
        );
    }
}