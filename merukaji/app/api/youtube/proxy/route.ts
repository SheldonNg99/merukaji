// app/api/youtube/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { videoId } = await req.json();

        // Use your Cloudflare Worker
        const response = await fetch(
            `https://merukaji-youtube-proxy.merukaji413.workers.dev?videoId=${videoId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch from proxy');
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch video data'
        }, { status: 500 });
    }
}