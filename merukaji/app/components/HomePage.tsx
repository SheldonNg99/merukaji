'use client';

import { BookDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TranscriptResponse } from '@/types/youtube';
import { useToast } from '@/app/components/contexts/ToastContext';
import SummaryResultsPage from '@/app/components/SummaryResultsPage';
import { VideoMetadata } from '@/types/youtube';
import { useRouter } from 'next/navigation';

export default function HomePage() {
    const { showToast } = useToast();
    const [isFocused, setIsFocused] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [, setResult] = useState<TranscriptResponse | null>(null);
    const [, setError] = useState<string | null>(null);
    const [, setMounted] = useState(false);
    const router = useRouter();
    const [summaryData, setSummaryData] = useState<{
        summary: string;
        metadata: VideoMetadata;
        timestamp: string;
        provider: string;
    } | null>(null);
    const [summaryType,] = useState<'short' | 'comprehensive'>('short');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [, setRateLimits] = useState<{ daily: number; minute: number } | null>(null);

    // Set mounted state once the component is mounted
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async () => {
        if (!youtubeUrl) {
            showToast('Please enter a YouTube URL', 'error');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        setSummaryData(null);
        setIsSummarizing(false);

        try {
            // First fetch transcript
            const response = await fetch('/api/youtube/transcript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: youtubeUrl }),
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.error || 'Failed to process video', 'error');
                setIsLoading(false);
                return;
            }

            setResult(data);

            // Then generate summary
            setIsSummarizing(true);

            const summaryResponse = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: youtubeUrl,
                    summaryType
                }),
            });

            const summaryData = await summaryResponse.json();

            if (!summaryResponse.ok) {
                if (summaryResponse.status === 429) {
                    setRateLimits(summaryData.limits);
                    if (summaryData.error.includes('Daily limit exceeded')) {
                        showToast(
                            `Daily limit reached (${summaryData.limits.daily}/3). Please upgrade for more summaries.`,
                            'warning',
                            8000
                        );
                    } else {
                        showToast(
                            'Too many requests. Please try again in a minute.',
                            'warning'
                        );
                    }

                    setIsSummarizing(false);
                    setIsLoading(false);
                    return;
                }

                showToast(summaryData.error || 'Failed to generate summary', 'error');
                setIsSummarizing(false);
                setIsLoading(false);
                return;
            }

            if (summaryData.cached) {
                showToast('Summary retrieved from cache', 'info', 2000);
            } else {
                showToast('Summary generated successfully', 'success', 2000);
            }

            router.push(`/summary/${summaryData.id}`);

            setIsSummarizing(false);
            setIsLoading(false);

        } catch (err: unknown) {
            // This catch block now only handles unexpected errors
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            console.error('Error:', err);

            // Show toast for unexpected errors
            showToast(errorMessage, 'error');
            setIsLoading(false);
            setIsSummarizing(false);
        }
    };

    // If we have summary data, show the results
    if (summaryData) {
        return (
            <div className="w-full min-h-screen bg-gray-50 dark:bg-[#202120]">
                <SummaryResultsPage
                    summary={summaryData.summary}
                    metadata={summaryData.metadata}
                    timestamp={summaryData.timestamp}
                    provider={summaryData.provider}
                />
            </div>
        );
    }

    // Otherwise, show the search interface
    return (
        <div className="w-full min-h-screen bg-[#f8f9fa] dark:bg-[#202120] flex flex-col items-center transition-colors">
            <div className="w-full max-w-4xl mx-auto px-4 flex flex-col items-center justify-center min-h-[80vh]">
                {/* Welcome Message */}
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
                        Welcome Back!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                        What would you like to summarize today?
                    </p>
                </div>

                {/* Search Section - Simplified without AI model dropdown */}
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
                                    if (e.key === 'Enter') {
                                        handleSubmit();
                                    }
                                }}
                            />
                        </div>

                        {/* Search Button */}
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
                                <BookDown className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    {/* Quick Tips */}
                    <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Try pasting a YouTube URL to get started
                    </div>
                </div>
            </div>
        </div>
    );
}