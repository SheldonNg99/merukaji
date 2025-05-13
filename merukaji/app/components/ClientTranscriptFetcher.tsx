// app/components/ClientTranscriptFetcher.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    TranscriptSegment,
    TranscriptFetcherProps,
    VideoMetadata,
    HtmlEntities
} from '@/types/youtube';

export default function ClientTranscriptFetcher({
    videoId,
    onTranscriptFetched,
    onError
}: TranscriptFetcherProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    // HTML entities mapping
    const htmlEntities: HtmlEntities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' '
    };

    // Helper function to decode HTML entities
    const decodeHtmlEntities = (text: string): string => {
        return text.replace(/&[^;]+;/g, (entity: string) => {
            return htmlEntities[entity] || entity;
        });
    };

    useEffect(() => {
        const fetchTranscript = async () => {
            if (!videoId || isLoading) return;

            setIsLoading(true);
            try {
                const response = await fetch('/api/youtube/proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ videoId })
                });

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Invalid response type from server');
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `Server error: ${response.status}`);
                }

                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch video data');
                }

                const { playerResponse, transcript: transcriptXml } = data;

                // Extract video metadata
                const metadata: VideoMetadata = {
                    videoId,
                    title: playerResponse.videoDetails?.title || 'Untitled Video',
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    channelTitle: playerResponse.videoDetails?.author || '',
                    publishedAt: playerResponse.microformat?.playerMicroformatRenderer?.publishDate || '',
                    duration: playerResponse.videoDetails?.lengthSeconds || ''
                };

                // Parse the transcript XML
                const segments: TranscriptSegment[] = [];
                const pattern = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>(.*?)<\/text>/g;
                const matches = [...transcriptXml.matchAll(pattern)] as RegExpMatchArray[];

                matches.forEach(match => {
                    if (match[1] && match[2] && match[3]) {
                        segments.push({
                            text: decodeHtmlEntities(match[3].replace(/<[^>]*>/g, '')),
                            offset: parseFloat(match[1]),
                            duration: parseFloat(match[2])
                        });
                    }
                });

                if (segments.length === 0) {
                    throw new Error('No transcript segments found');
                }

                // Reset retry count on success
                setRetryCount(0);
                onTranscriptFetched(segments, metadata);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transcript';

                // Retry logic
                if (retryCount < MAX_RETRIES) {
                    console.log(`Retrying... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                    setRetryCount(prev => prev + 1);
                    setTimeout(() => {
                        setIsLoading(false); // Reset loading to allow retry
                    }, 2000 * (retryCount + 1)); // Exponential backoff
                    return;
                }

                console.error('Transcript fetch error:', error);
                onError(errorMessage);
            } finally {
                if (retryCount >= MAX_RETRIES) {
                    setIsLoading(false);
                }
            }
        };

        fetchTranscript();
    }, [videoId, onTranscriptFetched, onError, retryCount]);

    return null;
}