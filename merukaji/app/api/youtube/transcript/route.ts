// app/api/youtube/transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { extractVideoId } from '@/lib/youtube';
import { logger } from '@/lib/logger';
import { getTranscriptFromRapidAPI } from '@/lib/rapidapi-youtube';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { url } = await req.json();
        const videoId = extractVideoId(url);

        if (!videoId) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        logger.info('Fetching transcript', { videoId, userId: session.user.id });

        // Get transcript from RapidAPI
        const { transcript, metadata } = await getTranscriptFromRapidAPI(videoId);

        return NextResponse.json({
            success: true,
            metadata,
            transcript
        });

    } catch (error) {
        logger.error('Transcript fetch error', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'Failed to fetch transcript',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}