// app/api/youtube/transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { extractVideoId } from '@/lib/youtube';
import { logger } from '@/lib/logger';

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

        // Use the proxy endpoint internally
        const proxyResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ videoId })
        });

        const data = await proxyResponse.json();

        if (!proxyResponse.ok) {
            throw new Error(data.error || 'Failed to fetch transcript');
        }

        // Format response to match expected structure
        return NextResponse.json({
            success: true,
            metadata: {
                videoId,
                title: data.playerResponse?.videoDetails?.title || 'Untitled Video',
                thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                channelTitle: data.playerResponse?.videoDetails?.author || '',
                duration: data.playerResponse?.videoDetails?.lengthSeconds || ''
            },
            transcript: data.transcript
        });

    } catch (error) {
        logger.error('Transcript route error', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'Failed to fetch transcript',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}