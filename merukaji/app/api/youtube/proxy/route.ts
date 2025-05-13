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

        // Your Cloudflare Worker URL
        const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL ||
            'https://merukaji-youtube-proxy.merukaji413.workers.dev';

        const response = await fetch(`${WORKER_URL}?videoId=${videoId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        const data = await response.json();

        if (!response.ok) {
            logger.error('Cloudflare Worker error', {
                status: response.status,
                error: data.error,
                videoId
            });

            throw new Error(data.error || 'Failed to fetch from proxy');
        }

        logger.info('Successfully fetched transcript', {
            videoId,
            hasTranscript: !!data.transcript,
            languageCode: data.languageCode
        });

        return NextResponse.json(data);

    } catch (error) {
        logger.error('YouTube proxy error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return NextResponse.json(
                    { error: 'Request timeout - video transcript fetch took too long' },
                    { status: 504 }
                );
            }

            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch video data' },
            { status: 500 }
        );
    }
}