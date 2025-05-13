// lib/rapidapi-youtube.ts
import axios from 'axios';
import { TranscriptSegment, VideoMetadata } from '@/types/youtube';
import { logger } from '@/lib/logger';

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const YOUTUBE_DETAILS_HOST = 'youtube138.p.rapidapi.com';
const YOUTUBE_TRANSCRIPT_HOST = 'youtube-transcript3.p.rapidapi.com';

if (!RAPID_API_KEY) {
    throw new Error('RAPID_API_KEY is not set in environment variables');
}

// Type definitions for YouTube138 API response
interface YouTubeDetailsResponse {
    videoId: string;
    title: string;
    lengthSeconds: string;
    publishedDate?: string;
    thumbnails?: Array<{
        url: string;
        width: number;
        height: number;
    }>;
    author?: {
        title: string;
        channelId: string;
    };
}

// Type definitions for YouTube-Transcript3 API response
interface TranscriptItem {
    text: string;
    duration: number;
    offset: number;
    lang: string;
}

interface YouTubeTranscriptResponse {
    success: boolean;
    transcript: TranscriptItem[];
}

export async function getTranscriptFromRapidAPI(videoId: string): Promise<{
    transcript: TranscriptSegment[];
    metadata: VideoMetadata;
}> {
    try {
        // Step 1: Get video details from YouTube138 API
        logger.info('Fetching video details', { videoId });

        const detailsResponse = await axios.get<YouTubeDetailsResponse>(`https://${YOUTUBE_DETAILS_HOST}/video/details/`, {
            params: {
                id: videoId,
                hl: 'en',
                gl: 'US'
            },
            headers: {
                'X-RapidAPI-Key': RAPID_API_KEY,
                'X-RapidAPI-Host': YOUTUBE_DETAILS_HOST
            }
        });

        logger.info('Video details received', {
            status: detailsResponse.status,
            hasData: !!detailsResponse.data
        });

        const videoDetails = detailsResponse.data;

        // Step 2: Get transcript from YouTube-Transcript3 API
        logger.info('Fetching transcript', { videoId });

        const transcriptResponse = await axios.get<YouTubeTranscriptResponse>(`https://${YOUTUBE_TRANSCRIPT_HOST}/api/transcript`, {
            params: {
                videoId: videoId
            },
            headers: {
                'X-RapidAPI-Key': RAPID_API_KEY,
                'X-RapidAPI-Host': YOUTUBE_TRANSCRIPT_HOST
            }
        });

        logger.info('Transcript received', {
            status: transcriptResponse.status,
            success: transcriptResponse.data?.success,
            transcriptLength: transcriptResponse.data?.transcript?.length || 0
        });

        if (!transcriptResponse.data?.success || !transcriptResponse.data?.transcript) {
            throw new Error('No transcript available for this video');
        }

        // Transform transcript data
        const transcript: TranscriptSegment[] = transcriptResponse.data.transcript.map((item) => ({
            text: item.text,
            offset: item.offset,
            duration: item.duration
        }));

        // Create metadata from video details
        const metadata: VideoMetadata = {
            videoId,
            title: videoDetails.title || `YouTube Video ${videoId}`,
            thumbnailUrl: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            channelTitle: videoDetails.author?.title || '',
            duration: videoDetails.lengthSeconds || '',
            publishedAt: videoDetails.publishedDate
        };

        logger.info('Successfully fetched video data', {
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

        // If details fail, try to continue with just transcript
        if (error instanceof Error && error.message.includes('details')) {
            try {
                logger.info('Falling back to transcript-only mode', { videoId });

                const transcriptResponse = await axios.get<YouTubeTranscriptResponse>(`https://${YOUTUBE_TRANSCRIPT_HOST}/api/transcript`, {
                    params: {
                        videoId: videoId
                    },
                    headers: {
                        'X-RapidAPI-Key': RAPID_API_KEY,
                        'X-RapidAPI-Host': YOUTUBE_TRANSCRIPT_HOST
                    }
                });

                if (!transcriptResponse.data?.success || !transcriptResponse.data?.transcript) {
                    throw new Error('No transcript available for this video');
                }

                const transcript: TranscriptSegment[] = transcriptResponse.data.transcript.map((item) => ({
                    text: item.text,
                    offset: item.offset,
                    duration: item.duration
                }));

                // Basic metadata when details API fails
                const metadata: VideoMetadata = {
                    videoId,
                    title: `YouTube Video ${videoId}`,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    channelTitle: '',
                    duration: ''
                };

                return { transcript, metadata };
            } catch (transcriptError) {
                throw transcriptError;
            }
        }

        throw error instanceof Error ? error : new Error('Failed to fetch transcript');
    }
}