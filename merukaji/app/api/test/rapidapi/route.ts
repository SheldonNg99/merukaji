// app/api/test/rapidapi/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

interface VideoDetailsResponse {
    title: string;
    author?: {
        title: string;
    };
    thumbnails?: Array<{
        url: string;
        width: number;
        height: number;
    }>;
    lengthSeconds: string;
}

interface TranscriptResponse {
    success: boolean;
    transcript?: Array<{
        text: string;
        duration: number;
        offset: number;
        lang: string;
    }>;
}

export async function GET() {
    const API_KEY = process.env.RAPID_API_KEY;
    const testVideoId = 'kJQP7kiw5Fk';

    try {
        // Test Video Details API
        const detailsResponse = await axios.get<VideoDetailsResponse>('https://youtube138.p.rapidapi.com/video/details/', {
            params: {
                id: testVideoId,
                hl: 'en',
                gl: 'US'
            },
            headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': 'youtube138.p.rapidapi.com'
            }
        });

        // Test Transcript API
        const transcriptResponse = await axios.get<TranscriptResponse>('https://youtube-transcript3.p.rapidapi.com/api/transcript', {
            params: {
                videoId: testVideoId
            },
            headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': 'youtube-transcript3.p.rapidapi.com'
            }
        });

        return NextResponse.json({
            success: true,
            videoDetails: {
                title: detailsResponse.data.title,
                author: detailsResponse.data.author?.title,
                thumbnails: detailsResponse.data.thumbnails?.length,
                lengthSeconds: detailsResponse.data.lengthSeconds
            },
            transcript: {
                success: transcriptResponse.data.success,
                itemCount: transcriptResponse.data.transcript?.length || 0,
                firstItem: transcriptResponse.data.transcript?.[0]
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: axios.isAxiosError(error) ? {
                status: error.response?.status,
                data: error.response?.data
            } : undefined
        }, { status: 500 });
    }
}