// app/api/test/rapidapi/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
    const API_KEY = process.env.RAPID_API_KEY;
    const API_HOST = 'youtube-transcript3.p.rapidapi.com';

    // Test 1: Get Transcript with VideoId endpoint
    try {
        const response = await axios.get(`https://${API_HOST}/api/transcript`, {
            params: {
                videoId: 'dQw4w9WgXcQ',
                lang: 'en'
            },
            headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': API_HOST
            }
        });

        return NextResponse.json({
            success: true,
            endpoint: '/api/transcript',
            status: response.status,
            hasTranscript: !!response.data?.transcript,
            transcriptLength: response.data?.transcript?.length || 0,
            responseKeys: Object.keys(response.data || {}),
            data: response.data
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            endpoint: '/api/transcript',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: axios.isAxiosError(error) ? {
                status: error.response?.status,
                data: error.response?.data
            } : undefined
        }, { status: 500 });
    }
}