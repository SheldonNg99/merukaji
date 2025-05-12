import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { supabaseAdmin } from './supabase';
import {
    VideoMetadata,
    TranscriptSegment,
    ProcessedVideo
} from '@/types/youtube';
import { logger } from './logger';

// Cache settings
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// YouTube API key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Main class for handling YouTube operations
 */
export class YouTubeProcessor {
    private requestsThisMinute = 0;
    private requestsResetTime = Date.now() + 60000;
    private readonly MAX_REQUESTS_PER_MINUTE = 60; // Adjust based on your rate limits

    constructor() {
        // Reset request counter every minute
        setInterval(() => {
            this.requestsThisMinute = 0;
            this.requestsResetTime = Date.now() + 60000;
        }, 60000);
    }

    /**
     * Main function to extract and process a YouTube video
     */
    async processVideo(url: string): Promise<{
        metadata: VideoMetadata;
        transcript: TranscriptSegment[];
    }> {
        // 1. Extract video ID
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        // 2. Check cache
        const cachedData = await this.getCachedTranscript(videoId);
        let transcript: TranscriptSegment[] = [];

        if (cachedData) {
            transcript = cachedData;
        } else {
            // 3. Get transcript
            transcript = await this.getTranscript(videoId);

            // 4. Cache the result
            await this.cacheTranscript(videoId, transcript);
        }

        // 5. Get metadata
        const metadata = await this.getVideoMetadata(videoId);

        return {
            metadata,
            transcript
        };
    }

    /**
     * Extract YouTube video ID from various URL formats
     */
    extractVideoId(url: string): string | null {
        if (!url) return null;

        // Handle different YouTube URL formats
        // Standard: https://www.youtube.com/watch?v=VIDEO_ID
        // Short: https://youtu.be/VIDEO_ID
        // Embedded: https://www.youtube.com/embed/VIDEO_ID
        // Shorts: https://www.youtube.com/shorts/VIDEO_ID

        let videoId: string | null = null;

        // Regular expressions for different URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&?/]+)/i,
            /^([^&?/]+)$/i // Direct video ID input
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                videoId = match[1];
                break;
            }
        }

        return videoId;
    }

    /**
     * Get video transcript using youtube-transcript package
     */
    async getTranscript(videoId: string, retryCount = 0): Promise<TranscriptSegment[]> {
        try {
            if (this.shouldThrottle()) {
                await this.delay(this.getBackoffTime());
            }

            this.requestsThisMinute++;

            const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

            return transcriptData.map(segment => ({
                text: segment.text,
                offset: segment.offset,
                duration: segment.duration
            }));
        } catch (error) {
            if (retryCount < MAX_RETRY_ATTEMPTS) {
                // Exponential backoff
                const delayTime = RETRY_DELAY * Math.pow(2, retryCount);
                await this.delay(delayTime);
                return this.getTranscript(videoId, retryCount + 1);
            }

            console.error(`Failed to get transcript for video ${videoId}:`, error);
            throw new Error(`Could not retrieve transcript: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get video metadata from YouTube API
     */
    // In lib/youtube.ts
    async getVideoMetadata(videoId: string, retryCount = 0): Promise<VideoMetadata> {
        if (!YOUTUBE_API_KEY) {
            throw new Error('YouTube API key is not configured');
        }

        try {
            if (this.shouldThrottle()) {
                await this.delay(this.getBackoffTime());
            }

            this.requestsThisMinute++;

            const response = await axios.get(
                `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${YOUTUBE_API_KEY}`,
                {
                    headers: {
                        'Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://merukaji.com',
                        'User-Agent': 'Merukaji/1.0',
                        'Accept': 'application/json'
                    }
                }
            );

            const videoData = response.data.items[0];

            if (!videoData) {
                throw new Error('Video not found');
            }

            return {
                videoId,
                title: videoData.snippet.title,
                thumbnailUrl: videoData.snippet.thumbnails.high.url,
                channelTitle: videoData.snippet.channelTitle,
                publishedAt: videoData.snippet.publishedAt,
                duration: videoData.contentDetails.duration
            };
        } catch (error) {
            // Handle 403 specifically
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                logger.error('YouTube API 403 Error', {
                    videoId,
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });

                // Return minimal metadata without API
                return this.getMetadataFallback(videoId);
            }

            if (retryCount < MAX_RETRY_ATTEMPTS) {
                const delayTime = RETRY_DELAY * Math.pow(2, retryCount);
                await this.delay(delayTime);
                return this.getVideoMetadata(videoId, retryCount + 1);
            }

            logger.error(`Failed to get metadata for video ${videoId}:`);

            // Fallback to basic metadata
            return this.getMetadataFallback(videoId);
        }
    }

    // Add a fallback method that doesn't use the API
    private getMetadataFallback(videoId: string): VideoMetadata {
        return {
            videoId,
            title: 'Video Title Unavailable',
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            channelTitle: 'Channel information unavailable',
            publishedAt: new Date().toISOString(),
            duration: 'Unknown'
        };
    }

    /**
     * Check if we should throttle requests based on rate limits
     */
    private shouldThrottle(): boolean {
        return this.requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE;
    }

    /**
     * Calculate backoff time when rate limit is hit
     */
    private getBackoffTime(): number {
        const timeUntilReset = this.requestsResetTime - Date.now();
        return Math.max(timeUntilReset, 1000); // At least 1 second
    }

    /**
     * Helper method for delays
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get cached transcript from Supabase
     */
    private async getCachedTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
        try {
            logger.debug('Checking cache for transcript', { videoId });

            const { data, error } = await supabaseAdmin
                .from('cached_transcripts')
                .select('transcript')
                .eq('video_id', videoId)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error) {
                logger.info('Cache miss for transcript', { videoId });
                return null;
            }

            if (data) {
                return data.transcript;
            }

            return null;
        } catch (error) {
            logger.error('Error retrieving cached transcript', {
                videoId,
                error: error instanceof Error ? error.message : String(error)
            });
            return null; // Continue without cache on error
        }
    }

    /**
     * Cache transcript in Supabase
     */
    private async cacheTranscript(videoId: string, transcript: TranscriptSegment[], ttlDays: number = 30): Promise<void> {
        try {
            logger.debug('Caching transcript', { videoId, ttlDays });

            const now = new Date();
            const expiresAt = new Date(now.getTime() + (ttlDays * 24 * 60 * 60 * 1000)); // Convert days to milliseconds

            const { error } = await supabaseAdmin
                .from('cached_transcripts')
                .upsert({
                    video_id: videoId,
                    transcript,
                    created_at: now.toISOString(),
                    expires_at: expiresAt.toISOString()
                });

            if (error) {
                throw error;
            }

            logger.info('Transcript cached successfully', {
                videoId,
                segmentsCount: transcript.length,
                expiryDate: expiresAt.toISOString()
            });
        } catch (error) {
            logger.error('Error caching transcript', {
                videoId,
                error: error instanceof Error ? error.message : String(error)
            });
            // Continue without caching on error
        }
    }
}

// Export instance for easy use
export const youtubeProcessor = new YouTubeProcessor();

// Export standalone functions for flexibility
export const extractVideoId = (url: string): string | null => {
    return new YouTubeProcessor().extractVideoId(url);
};

export const getVideoTranscript = async (videoIdOrUrl: string): Promise<TranscriptSegment[]> => {
    const processor = new YouTubeProcessor();
    const videoId = processor.extractVideoId(videoIdOrUrl) || videoIdOrUrl;
    return processor.getTranscript(videoId);
};

export const getVideoMetadata = async (videoIdOrUrl: string): Promise<VideoMetadata> => {
    const processor = new YouTubeProcessor();
    const videoId = processor.extractVideoId(videoIdOrUrl) || videoIdOrUrl;
    return processor.getVideoMetadata(videoId);
};

export const processYoutubeVideo = async (url: string) => {
    return youtubeProcessor.processVideo(url);
};

export async function testYouTubeProcessor(url: string): Promise<{
    success: boolean;
    data?: ProcessedVideo;
    error?: string;
}> {
    try {
        const processor = new YouTubeProcessor();
        const result = await processor.processVideo(url);

        // Validate the result
        if (!result.metadata || !result.metadata.videoId) {
            return {
                success: false,
                error: 'Failed to extract video metadata'
            };
        }

        if (!result.transcript || result.transcript.length === 0) {
            return {
                success: false,
                error: 'Failed to extract transcript'
            };
        }

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Get cached transcript from Supabase
 */
export async function getCachedTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('cached_transcripts')
            .select('transcript')
            .eq('video_id', videoId)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error) {
            console.error('Error retrieving cached transcript:', error);
            return null;
        }

        return data?.transcript || null;
    } catch (error) {
        console.error('Error retrieving cached transcript:', error);
        return null; // Continue without cache on error
    }
}

/**
 * Cache transcript in Supabase
 */
export async function cacheTranscript(
    videoId: string,
    transcript: TranscriptSegment[],
    ttlDays: number = 30 // Default TTL of 30 days
): Promise<void> {
    try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (ttlDays * 24 * 60 * 60 * 1000)); // Convert days to milliseconds

        const { error } = await supabaseAdmin
            .from('cached_transcripts')
            .upsert({
                video_id: videoId,
                transcript,
                created_at: now.toISOString(),
                expires_at: expiresAt.toISOString()
            });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error caching transcript:', error);
        // Continue without caching on error
    }
}