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

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `Server error: ${response.status}`);
                }

                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch video data');
                }

                const { playerResponse, transcript: transcriptXml } = data;

                // Extract video metadata from the response
                const metadata: VideoMetadata = {
                    videoId,
                    title: playerResponse.videoDetails?.title || 'Untitled Video',
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    channelTitle: playerResponse.videoDetails?.author || '',
                    publishedAt: '', // Innertube API doesn't provide this directly
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

                onTranscriptFetched(segments, metadata);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transcript';
                console.error('Transcript fetch error:', error);
                onError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTranscript();
    }, [videoId, onTranscriptFetched, onError]);

    return null;
}