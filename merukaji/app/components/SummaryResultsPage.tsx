// app/components/SummaryResultsPage.tsx
import React, { useState, useEffect } from 'react';
import { Copy, Clock, Bookmark, ExternalLink, Plus, Lock } from 'lucide-react';
import Image from 'next/image';
import { SummaryResultsPageProps } from '@/types/summary';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/app/components/contexts/ToastContext';
import PdfViewer from './PdfViewer'; // Import our new PdfViewer component

const SummaryResultsPage = ({ summary, metadata, timestamp, provider }: SummaryResultsPageProps) => {
    const [, setCopied] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');
    const router = useRouter();
    const { data: session } = useSession();
    const { showToast } = useToast();

    useEffect(() => {
        // Add custom scrollbar styles
        const style = document.createElement('style');
        style.textContent = `
            .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #aaa;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #555;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #777;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Check if user can copy (Pro and Max tiers only)
    const canCopy = session?.user?.tier && ['pro', 'max'].includes(session.user.tier.toLowerCase());

    // Format the timestamp
    const formatDate = (timestamp: string | null | undefined): string => {
        if (!timestamp) return 'Just now';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Extract key points/highlights from summary
    const extractHighlights = (text: string): string[] => {
        if (!text) return [];

        // Look for bullet points or numbered lists first
        const bulletPointRegex = /(?:^|\n)(?:\s*[-•*]\s*|\s*\d+\.\s*)(.+?)(?=\n|$)/g;
        const bulletMatches = Array.from(text.matchAll(bulletPointRegex)).map(m => m[1].trim());

        if (bulletMatches.length > 0) {
            return bulletMatches.slice(0, 5); // Limit to 5 points
        }

        // If no bullet points, extract sentences that might be key points
        const sentenceRegex = /[^.!?]+[.!?]+/g;
        const sentences = Array.from(text.matchAll(sentenceRegex)).map(m => m[0].trim());

        const keyPhrases = ['important', 'key', 'main', 'significant', 'crucial', 'essential'];
        const keyPoints = sentences.filter(s =>
            keyPhrases.some(phrase => s.toLowerCase().includes(phrase))
        );

        // If we found key points, return them, otherwise return first few sentences
        return keyPoints.length > 0
            ? keyPoints.slice(0, 5)
            : sentences.slice(0, Math.min(5, sentences.length));
    };

    // Format summary for display
    const formatSummaryForDisplay = (text: string): React.ReactNode[] => {
        if (!text) return [];

        // Split into sections based on **Section headers**
        const sectionRegex = /(?:\*\*(.+?)\*\*)\s*((?:.|\n)*?)(?=\n\s*\*\*|$)/g;
        const matches = Array.from(text.matchAll(sectionRegex));

        return matches.map(([, header, body], index) => {
            const paragraphs = body.trim().split(/\n\n+/);

            return (
                <div key={index} className="mb-6">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
                        <span className="text-orange-500 mr-2">•</span>{header}
                    </h3>

                    {paragraphs.map((paragraph, pIndex) => {
                        const lines = paragraph.split('\n');

                        return (
                            <div key={`p-${pIndex}`} className="mb-4">
                                {lines.map((line, lineIndex) => {
                                    const bulletMatch = line.match(/^\s*([-•*]|\d+\.)\s*(.+)$/);

                                    if (bulletMatch) {
                                        return (
                                            <div key={`line-${lineIndex}`} className="flex items-start mb-2 ml-2">
                                                <div className="flex-shrink-0 h-2 w-2 rounded-full bg-orange-400 mt-2 mr-2"></div>
                                                <p className="text-gray-800 dark:text-gray-200">
                                                    {bulletMatch[2]}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <p key={`line-${lineIndex}`} className="text-gray-800 dark:text-gray-200 mb-2">
                                            {line}
                                        </p>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            );
        });
    };


    const highlights = extractHighlights(summary);
    const formattedSummary = formatSummaryForDisplay(summary);

    const handleCopy = () => {
        // Free users see upgrade prompt instead of copying
        if (!canCopy) {
            showToast('Upgrade to Pro or Max to copy summaries', 'info', 5000);
            return;
        }

        if (summary) {
            navigator.clipboard.writeText(summary);
            setCopied(true);
            showToast('Summary copied to clipboard', 'success', 2000);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleBookmark = () => {
        setBookmarked(!bookmarked);
    };

    if (!summary) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                        No summary available
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                        Enter a YouTube URL to generate a summary
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#f8f9fa] dark:bg-[#202120]">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4">
                {/* Top header with New Summary button */}
                <div className="flex justify-end items-center mb-4">
                    <button
                        onClick={() => router.push('/home')}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        <span>New Summary</span>
                    </button>
                </div>

                {/* Main content - Made fully responsive with grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                    {/* Left column - Video info and key points */}
                    <div className="md:col-span-5 lg:col-span-4">
                        {/* Video thumbnail and info */}
                        <div className="bg-white dark:bg-[#2E2E2E] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
                            <div className="aspect-video relative overflow-hidden">
                                {metadata?.thumbnailUrl && (
                                    <Image
                                        src={metadata.thumbnailUrl}
                                        alt={metadata.title || "Video thumbnail"}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                )}
                            </div>
                            <div className="p-4">
                                <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {metadata?.title}
                                </h1>
                                <div className="flex flex-col space-y-2">
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                        {metadata?.channelTitle}
                                    </p>
                                    <div className="flex flex-wrap justify-between items-center">
                                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-2 sm:mb-0">
                                            <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                                            <span>Summarized {formatDate(timestamp)}</span>
                                        </div>
                                        <a
                                            href={`https://www.youtube.com/watch?v=${metadata?.videoId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-blue-500 hover:text-blue-600 text-sm"
                                        >
                                            <span>Watch on YouTube</span>
                                            <ExternalLink className="h-4 w-4 ml-1 flex-shrink-0" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key Points Card - Scrollable with max-height */}
                        <div className="bg-white dark:bg-[#2E2E2E] rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col mb-4 md:mb-0">
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="font-medium text-gray-900 dark:text-white">Key Points</h2>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-80 custom-scrollbar">
                                <ul className="space-y-3">
                                    {highlights.map((point, index) => (
                                        <li key={index} className="flex items-start">
                                            <div className="flex-shrink-0 h-5 w-5 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mr-2 mt-0.5 text-orange-500">
                                                <span className="text-xs font-medium">{index + 1}</span>
                                            </div>
                                            <div className="text-gray-700 dark:text-gray-300 text-sm">
                                                {point}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Right column - Summary Content */}
                    <div className="md:col-span-7 lg:col-span-8">
                        <div className="bg-white dark:bg-[#2E2E2E] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                            {/* Tabs */}
                            <div className="border-b border-gray-200 dark:border-gray-700">
                                <div className="flex">
                                    <button
                                        onClick={() => setActiveTab('summary')}
                                        className={`px-4 py-3 text-sm font-medium ${activeTab === 'summary'
                                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Summary
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('pdf')}
                                        className={`px-4 py-3 text-sm font-medium ${activeTab === 'pdf'
                                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        PDF
                                    </button>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex justify-end items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleBookmark}
                                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#383838]"
                                    >
                                        <Bookmark className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={handleCopy}
                                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#383838]"
                                        title={canCopy ? "Copy to clipboard" : "Premium feature"}
                                    >
                                        {canCopy ? (
                                            <Copy className="h-4 w-4" />
                                        ) : (
                                            <div className="relative">
                                                <Copy className="h-4 w-4" />
                                                <Lock className="h-3 w-3 absolute -top-1 -right-1 text-orange-500" />
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Summary content - Scrollable with min-height */}
                            {activeTab === 'summary' && (
                                <div className="px-6 py-4 overflow-y-auto min-h-[300px] max-h-[600px] md:max-h-[800px] custom-scrollbar">
                                    <div className="prose dark:prose-invert max-w-none">
                                        {formattedSummary}
                                    </div>
                                </div>
                            )}

                            {/* PDF tab content */}
                            {activeTab === 'pdf' && (
                                <div className="h-[calc(100vh-150px)] min-h-[500px]">
                                    <PdfViewer
                                        summary={summary}
                                        metadata={metadata}
                                        timestamp={timestamp}
                                        provider={provider}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryResultsPage;