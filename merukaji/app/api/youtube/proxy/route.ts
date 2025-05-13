// app/api/youtube/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        // Ensure user is authenticated
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { videoId } = await req.json();

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        // Fetch video page with appropriate headers
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await fetch(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch video page: ${response.status}`);
        }

        const html = await response.text();

        // Extract ytInitialPlayerResponse
        const ytInitialPlayerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (!ytInitialPlayerResponseMatch) {
            throw new Error('Could not find player response');
        }

        const playerResponse = JSON.parse(ytInitialPlayerResponseMatch[1]);

        // Get the first available caption track
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!captionTracks || captionTracks.length === 0) {
            throw new Error('No captions available for this video');
        }

        // Fetch the transcript
        const captionUrl = captionTracks[0].baseUrl;
        const transcriptResponse = await fetch(captionUrl);

        if (!transcriptResponse.ok) {
            throw new Error('Failed to fetch transcript');
        }

        const transcriptXml = await transcriptResponse.text();

        // Return both the player response and transcript
        return NextResponse.json({
            success: true,
            playerResponse,
            transcript: transcriptXml
        });

    } catch (error) {
        logger.error('YouTube proxy error:', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch video data'
        }, { status: 500 });
    }
}