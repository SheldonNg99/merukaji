// Create a new file: lib/youtube-transcript-custom.ts
import axios from 'axios';
import { TranscriptSegment } from '@/types/youtube';
import { logger } from './logger';

export class CustomYouTubeTranscript {
    static async fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
        try {
            // First, get the video page to extract the transcript data
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const response = await axios.get(videoUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            const html = response.data;

            // Extract the initial player response
            const ytInitialPlayerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
            if (!ytInitialPlayerResponseMatch) {
                throw new Error('Could not find player response');
            }

            const playerResponse = JSON.parse(ytInitialPlayerResponseMatch[1]);

            // Check if captions are available
            const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!captionTracks || captionTracks.length === 0) {
                throw new Error('No captions available for this video');
            }

            // Get the first available caption track (usually in the video's language)
            const captionTrack = captionTracks[0];
            const captionUrl = captionTrack.baseUrl;

            // Fetch the transcript
            const transcriptResponse = await axios.get(captionUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/xml'
                }
            });

            // Parse the transcript XML
            const transcriptXml = transcriptResponse.data;
            const segments: TranscriptSegment[] = [];

            // Simple XML parsing for transcript
            const textMatches = transcriptXml.matchAll(/<text start="([\d.]+)" dur="([\d.]+)"[^>]*>(.*?)<\/text>/g);

            for (const match of textMatches) {
                const [, start, duration, text] = match;
                segments.push({
                    text: this.decodeHtmlEntities(text.replace(/<[^>]*>/g, '')),
                    offset: parseFloat(start),
                    duration: parseFloat(duration)
                });
            }

            return segments;
        } catch (error) {
            logger.error('Failed to fetch transcript with custom method', {
                videoId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    private static decodeHtmlEntities(text: string): string {
        const entities: { [key: string]: string } = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&nbsp;': ' '
        };

        return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
    }
}