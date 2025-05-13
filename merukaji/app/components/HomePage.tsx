// app/components/HomePage.tsx
'use client';

import { useState } from 'react';
import { BookDown } from 'lucide-react';
import { useToast } from '@/app/components/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const YOUTUBE_URL_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})$/;

export default function HomePage() {
    const { showToast } = useToast();
    const [isFocused, setIsFocused] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [summaryType] = useState<'short' | 'comprehensive'>('short');
    const router = useRouter();
    const { data: session } = useSession();

    const validateYoutubeUrl = (url: string): boolean => {
        return YOUTUBE_URL_PATTERN.test(url);
    };

    const handleSubmit = async () => {
        if (!youtubeUrl) {
            showToast('Please enter a YouTube URL', 'error');
            return;
        }

        if (!validateYoutubeUrl(youtubeUrl)) {
            showToast('Please enter a valid YouTube URL', 'error');
            return;
        }

        setIsLoading(true);

        try {
            // Step 1: Get transcript
            const transcriptResponse = await fetch('/api/youtube/transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: youtubeUrl })
            });

            const transcriptData = await transcriptResponse.json();

            if (!transcriptResponse.ok) {
                throw new Error(transcriptData.error || 'Failed to fetch transcript');
            }

            // Step 2: Generate summary
            const summaryResponse = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: youtubeUrl,
                    videoId: transcriptData.metadata.videoId,
                    summaryType,
                    metadata: transcriptData.metadata,
                    transcript: transcriptData.transcript
                }),
            });

            const summaryData = await summaryResponse.json();

            if (!summaryResponse.ok) {
                if (summaryResponse.status === 402) {
                    showToast('Insufficient credits. Please purchase more credits.', 'warning');
                    router.push('/upgrade');
                    return;
                }
                throw new Error(summaryData.error || 'Failed to generate summary');
            }

            // Navigate to summary page
            router.push(`/summary/${summaryData.id}`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            showToast(errorMessage, 'error');
        } finally {
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
                                    if (e.key === 'Enter' && !isLoading && youtubeUrl) {
                                        handleSubmit();
                                    }
                                }}
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !youtubeUrl}
                            className={`px-5 py-3 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 
                            text-white rounded-xl transition-all duration-300 ease-in-out hover:shadow-md 
                            flex items-center justify-center ${isLoading || !youtubeUrl ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <BookDown className="w-5" />
                            )}
                        </button>
                    </div>
                    <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Try pasting a YouTube URL to get started
                    </div>
                </div>
            </div>
        </div>
    );
}