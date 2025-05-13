// Updated HomePage.tsx
'use client';

import { useState } from 'react';
import { BookDown } from 'lucide-react';
import { useToast } from '@/app/components/contexts/ToastContext';
import { VideoMetadata, TranscriptSegment } from '@/types/youtube';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ClientTranscriptFetcher from './ClientTranscriptFetcher';

const YOUTUBE_URL_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})$/;

export default function HomePage() {
    const { showToast } = useToast();
    const [isFocused, setIsFocused] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [shouldFetchTranscript, setShouldFetchTranscript] = useState(false);

    const [summaryType] = useState<'short' | 'comprehensive'>('short');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const router = useRouter();
    const { data: session } = useSession();

    const extractVideoId = (url: string): string | null => {
        const match = url.match(YOUTUBE_URL_PATTERN);
        return match ? match[4] : null;
    };

    const validateYoutubeUrl = (url: string): boolean => {
        return YOUTUBE_URL_PATTERN.test(url);
    };

    const handleTranscriptFetched = async (transcript: TranscriptSegment[], metadata: VideoMetadata) => {
        try {
            setIsSummarizing(true);

            const summaryResponse = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: youtubeUrl,
                    videoId: metadata.videoId,
                    summaryType,
                    metadata,
                    transcript
                }),
            });

            const summaryData = await summaryResponse.json();

            if (!summaryResponse.ok) {
                if (summaryResponse.status === 402) {
                    showToast(
                        summaryData.details || 'Insufficient credits. Please purchase more credits.',
                        'warning',
                        8000
                    );
                    router.push('/upgrade');
                    return;
                }

                throw new Error(summaryData.error || 'Failed to generate summary');
            }

            // Navigate to summary page
            if (summaryData.id) {
                router.push(`/summary/${summaryData.id}`);
            }
        } catch (err) {
            console.error('Error during summary generation:', err);
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            showToast(errorMessage, 'error', 5000);
        } finally {
            setIsLoading(false);
            setIsSummarizing(false);
            setShouldFetchTranscript(false);
        }
    };

    const handleSubmit = async () => {
        if (!youtubeUrl) {
            showToast('Please enter a YouTube URL', 'error');
            return;
        }

        if (!validateYoutubeUrl(youtubeUrl)) {
            showToast('Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=... or https://youtu.be/...)', 'error');
            return;
        }

        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            showToast('Could not extract video ID from URL', 'error');
            return;
        }

        setIsLoading(true);
        setIsSummarizing(false);
        setShouldFetchTranscript(false);

        try {
            // Check cache first
            const cacheResponse = await fetch('/api/summary/check-cache', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId,
                    summaryType
                }),
            });

            if (!cacheResponse.ok) {
                throw new Error('Failed to check cache');
            }

            const cacheResult = await cacheResponse.json();

            // If we have a cache hit, redirect to the summary
            if (cacheResult.success && cacheResult.cached) {
                showToast('Summary retrieved from cache', 'info', 2000);

                if (cacheResult.data.id) {
                    router.push(`/summary/${cacheResult.data.id}`);
                    setIsLoading(false);
                    return;
                }
            }

            // No cache hit, proceed with transcript fetching
            setShouldFetchTranscript(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            showToast(errorMessage, 'error', 5000);
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#f8f9fa] dark:bg-[#202120] flex flex-col items-center transition-colors">
            <div className="w-full max-w-4xl mx-auto px-4 flex flex-col items-center justify-center min-h-[80vh]">
                {/* Welcome Message */}
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
                        Welcome{session?.user?.name ? `, ${session.user.name}` : ' Back'}!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                        What would you like to summarize today?
                    </p>
                </div>

                {/* Search Section */}
                <div className={`w-full max-w-2xl transition-all duration-300 ease-in-out ${isFocused ? 'scale-105' : 'scale-100'}`}>
                    <div className="flex gap-3 bg-[#f2f5f6] dark:bg-[#2E2E2E] p-2 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-transparent dark:border-gray-700">
                        {/* Search Input */}
                        <div className="flex-1">
                            <input
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="Enter YouTube URL..."
                                className="w-full px-6 py-4 rounded-xl bg-transparent focus:outline-none text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isLoading && !isSummarizing && youtubeUrl) {
                                        handleSubmit();
                                    }
                                }}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || isSummarizing || !youtubeUrl}
                            className={`px-5 py-3 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 
                            text-white rounded-xl transition-all duration-300 ease-in-out hover:shadow-md 
                            flex items-center justify-center ${isLoading || isSummarizing || !youtubeUrl ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {isLoading || isSummarizing ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <BookDown className="w-5" />
                            )}
                        </button>
                    </div>
                    {/* Quick Tips */}
                    <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Try pasting a YouTube URL to get started
                    </div>
                </div>
            </div>

            {/* ClientTranscriptFetcher - Only render when needed */}
            {shouldFetchTranscript && (
                <ClientTranscriptFetcher
                    videoId={extractVideoId(youtubeUrl) || ''}
                    onTranscriptFetched={handleTranscriptFetched}
                    onError={(error) => {
                        showToast(error, 'error', 5000);
                        setIsLoading(false);
                        setShouldFetchTranscript(false);
                    }}
                />
            )}
        </div>
    );
}