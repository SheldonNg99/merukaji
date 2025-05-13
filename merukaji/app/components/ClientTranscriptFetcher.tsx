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
    const [, setIsLoading] = useState(false);

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
            if (!videoId) return;

            setIsLoading(true);
            try {
                // Use our proxy endpoint instead of direct YouTube access
                const response = await fetch('/api/youtube/proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ videoId })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to fetch video data');
                }

                const { playerResponse, transcript: transcriptXml } = await response.json();

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

                // Define the regex pattern
                const pattern = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>(.*?)<\/text>/g;

                // Use type assertion for the matchAll result
                const matches = [...transcriptXml.matchAll(pattern)] as RegExpMatchArray[];

                // Process matches with proper typing
                matches.forEach(match => {
                    if (match[1] && match[2] && match[3]) {
                        segments.push({
                            text: decodeHtmlEntities(match[3].replace(/<[^>]*>/g, '')),
                            offset: parseFloat(match[1]),
                            duration: parseFloat(match[2])
                        });
                    }
                });

                // Call the success callback with both transcript and metadata
                onTranscriptFetched(segments, metadata);

            } catch (error) {
                onError(error instanceof Error ? error.message : 'Failed to fetch transcript');
            } finally {
                setIsLoading(false);
            }
        };

        // Start fetching when component mounts
        fetchTranscript();
    }, [videoId, onTranscriptFetched, onError]);

    // This is a utility component, no UI needed
    return null;
}