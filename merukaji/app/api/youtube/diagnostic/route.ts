// app/api/youtube/diagnostic/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { YoutubeTranscript } from 'youtube-transcript';
import axios from 'axios';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { videoId } = await req.json();

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        const diagnostics = {
            environment: process.env.NODE_ENV,
            nodeVersion: process.version,
            serverInfo: {
                platform: process.platform,
                arch: process.arch,
                region: process.env.VERCEL_REGION || 'unknown'
            },
            tests: {
                standardMethod: { success: false, error: null as string | null, data: null as string | null },
                directYouTube: { success: false, error: null as string | null, statusCode: null as number | null }
            }
        };

        // Test 1: Standard youtube-transcript
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            diagnostics.tests.standardMethod = {
                success: true,
                error: null,
                data: `Found ${transcript.length} segments`
            };
        } catch (error) {
            diagnostics.tests.standardMethod.error = error instanceof Error ? error.message : String(error);
        }

        // Test 2: Direct YouTube access
        try {
            const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000 // 10 second timeout
            });
            diagnostics.tests.directYouTube = {
                success: true,
                error: null,
                statusCode: response.status
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                diagnostics.tests.directYouTube.statusCode = error.response?.status || null;
                diagnostics.tests.directYouTube.error = error.message;
            } else {
                diagnostics.tests.directYouTube.error = error instanceof Error ? error.message : String(error);
            }
        }

        return NextResponse.json(diagnostics);
    } catch (error) {
        logger.error('Diagnostic failed', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'Diagnostic failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}