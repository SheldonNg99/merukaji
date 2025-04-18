'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { TranscriptSegment, TranscriptResponse } from '@/types/youtube'; // Import types


export default function HomePage() {
    const [isFocused, setIsFocused] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<TranscriptResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState('');

    const handleSubmit = async () => {
        if (!youtubeUrl) {
            setError('Please enter a YouTube URL');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/youtube/transcript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: youtubeUrl }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process video');
            }

            setResult(data);
            console.log('Transcript data:', data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            console.error('Error fetching transcript:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-orange-50/30 flex flex-col items-center justify-center px-4">
            {/* Welcome Message */}
            <div className="text-center mb-12 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                    Welcome Back!
                </h1>
                <p className="text-gray-500 text-lg">
                    What would you like to summarize today?
                </p>
            </div>

            {/* Search Section */}
            <div className={`w-full max-w-2xl transition-all duration-300 ease-in-out transform
        ${isFocused ? 'scale-105' : 'scale-100'}`}>
                <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-lg shadow-orange-100/50">
                    {/* Search Input */}
                    <div className="flex-1">
                        <input
                            type="text"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="Enter YouTube URL..."
                            className="w-full px-6 py-4 rounded-xl bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </div>

                    {/* AI Model Dropdown */}
                    <div className="self-center">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="h-12 px-4 rounded-xl bg-gray-50 border-none appearance-none pr-8 focus:outline-none text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                            <option value="">AI Model</option>
                            <option value="openai">OpenAI</option>
                            <option value="google">Google AI</option>
                        </select>
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={`px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl transition-all duration-300 ease-in-out hover:shadow-md flex items-center justify-center ${isLoading ? 'opacity-75 cursor-not-allowed' : ''
                            }`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Search className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {/* Quick Tips */}
                <div className="mt-6 text-center text-sm text-gray-400">
                    Try pasting a YouTube URL to get started
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-6 text-red-500 text-center p-4 bg-red-50 rounded-xl">
                        {error}
                    </div>
                )}

                {/* Results Preview */}
                {result && (
                    <div className="mt-6 p-6 bg-white rounded-xl shadow-md">
                        <h2 className="text-xl font-bold mb-2">{result.metadata.title}</h2>
                        {result.metadata.thumbnailUrl && (
                            <div className="mb-4">
                                <img
                                    src={result.metadata.thumbnailUrl}
                                    alt={result.metadata.title}
                                    className="w-full max-h-48 object-cover rounded-lg"
                                />
                            </div>
                        )}
                        <div className="mt-4">
                            <h3 className="font-semibold text-lg mb-2">Transcript Preview:</h3>
                            <div className="max-h-60 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                                {result.transcript.slice(0, 5).map((segment: TranscriptSegment, index: number) => (
                                    <div key={index} className="mb-2 pb-2 border-b border-gray-100">
                                        <p className="text-gray-700">{segment.text}</p>
                                        <span className="text-xs text-gray-400">
                                            {Math.floor(segment.offset / 1000)}s
                                        </span>
                                    </div>
                                ))}
                                {result.transcript.length > 5 && (
                                    <p className="text-center text-gray-500 mt-2">
                                        ... and {result.transcript.length - 5} more segments
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}