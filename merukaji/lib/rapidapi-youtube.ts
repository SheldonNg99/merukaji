// lib/rapidapi-youtube.ts
import axios from 'axios';
import { TranscriptSegment, VideoMetadata } from '@/types/youtube';
import { logger } from '@/lib/logger';

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_API_HOST = 'youtube-transcript3.p.rapidapi.com';

if (!RAPID_API_KEY) {
    throw new Error('RAPID_API_KEY is not set in environment variables');
}

interface RapidAPITranscriptItem {
    text: string;
    start: string | number;
    duration: string | number;
    offset?: string | number;
}

interface RapidAPIResponse {
    content?: RapidAPITranscriptItem[];
    transcript?: RapidAPITranscriptItem[];
    title?: string;
    channel?: string;
    duration?: string;
    error?: string;
    message?: string;
    success?: boolean;
}

export async function getTranscriptFromRapidAPI(videoId: string): Promise<{
    transcript: TranscriptSegment[];
    metadata: VideoMetadata;
}> {
    try {
        const options = {
            method: 'GET' as const,
            url: `https://${RAPID_API_HOST}/api/transcript`,
            params: {
                videoId: videoId,
                lang: 'en'
            },
            headers: {
                'X-RapidAPI-Key': RAPID_API_KEY,
                'X-RapidAPI-Host': RAPID_API_HOST
            }
        };

        logger.info('Making RapidAPI request', {
            videoId,
            url: options.url,
            host: RAPID_API_HOST,
            params: options.params
        });

        const response = await axios.request<RapidAPIResponse>(options);

        logger.info('RapidAPI response received', {
            status: response.status,
            success: response.data?.success,
            hasContent: !!response.data?.content,
            hasTranscript: !!response.data?.transcript,
            responseKeys: Object.keys(response.data || {})
        });

        // Check if the API returned an error
        if (response.data?.success === false && response.data?.error) {
            throw new Error(`API Error: ${response.data.error}`);
        }

        // Get transcript data
        const transcriptData = response.data?.transcript || response.data?.content;

        if (!transcriptData || transcriptData.length === 0) {
            throw new Error('No transcript available for this video');
        }

        // Transform transcript data
        const transcript: TranscriptSegment[] = transcriptData.map((item) => ({
            text: item.text,
            offset: item.offset !== undefined
                ? (typeof item.offset === 'string' ? parseFloat(item.offset) : item.offset)
                : (typeof item.start === 'string' ? parseFloat(item.start) : item.start || 0),
            duration: typeof item.duration === 'string' ? parseFloat(item.duration) : item.duration
        }));

        // Get video details
        const metadata: VideoMetadata = {
            videoId,
            title: response.data.title || 'Video',
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            channelTitle: response.data.channel || '',
            duration: response.data.duration || ''
        };

        logger.info('Successfully fetched transcript', {
            videoId,
            segmentCount: transcript.length,
            title: metadata.title
        });

        return { transcript, metadata };

    } catch (error) {
        logger.error('RapidAPI request failed', {
            videoId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        throw error instanceof Error ? error : new Error('Failed to fetch transcript');
    }
}