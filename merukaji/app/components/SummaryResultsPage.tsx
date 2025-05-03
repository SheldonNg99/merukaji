import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Copy, Clock, Bookmark, ExternalLink, ThumbsUp, Flag, Plus, Download, Share2, Tag } from 'lucide-react';
import Image from 'next/image';
import { SummaryResultsPageProps } from '@/types/summary';
import { useRouter } from 'next/navigation';

const SummaryResultsPage = ({ summary, metadata, timestamp, provider }: SummaryResultsPageProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [copied, setCopied] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [liked, setLiked] = useState(false);
    const [showHighlights, setShowHighlights] = useState(true);
    const router = useRouter();

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
        // (sentences with key phrases like "important", "key", "main", etc.)
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

    // Split summary into pages (paragraphs)
    const paragraphs = summary ? summary.split('\n\n').filter(p => p.trim().length > 0) : [];
    const pagesCount = Math.max(1, paragraphs.length);
    const highlights = extractHighlights(summary);

    const handleCopy = () => {
        if (summary) {
            navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleBookmark = () => {
        setBookmarked(!bookmarked);
    };

    const handleLike = () => {
        setLiked(!liked);
    };

    const handleDownloadAsTxt = () => {
        if (!summary) return;

        const element = document.createElement('a');
        const file = new Blob([summary], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${metadata?.title || 'summary'}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    // Next page
    const nextPage = () => {
        if (currentPage < pagesCount) {
            setCurrentPage(currentPage + 1);
        }
    };

    // Previous page
    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    useEffect(() => {
        // Reset to page 1 when a new summary is loaded
        setCurrentPage(1);
    }, [summary]);

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
        <div className="w-full min-h-screen bg-[#f8f9fa] dark:bg-[#202120] py-8">
            <div className="w-full max-w-5xl mx-auto px-4">
                {/* Top Action Bar */}
                <div className="mb-6 flex justify-end items-center">
                    <button
                        onClick={() => router.push('/home')}
                        className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Summary
                    </button>
                </div>

                {/* Video metadata card */}
                {/* Video metadata card */}
                {metadata && (
                    <div className="mb-6 bg-white dark:bg-[#2E2E2E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row">
                            {metadata.thumbnailUrl && (
                                <div className="md:w-64 h-48 md:h-auto flex-shrink-0 relative overflow-hidden">
                                    <Image
                                        src={metadata.thumbnailUrl}
                                        alt={metadata.title}
                                        width={256}
                                        height={144}
                                        className="object-cover w-full h-full"
                                        priority
                                    />
                                </div>
                            )}
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                            {metadata.title}
                                        </h1>
                                        {metadata.channelTitle && (
                                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                                                {metadata.channelTitle}
                                            </p>
                                        )}
                                    </div>
                                    <a
                                        href={`https://www.youtube.com/watch?v=${metadata.videoId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 text-sm"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-1" />
                                        <span className="hidden sm:inline">Watch on YouTube</span>
                                    </a>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                                    {timestamp && (
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 mr-1" />
                                            <span>Summarized {formatDate(timestamp)}</span>
                                        </div>
                                    )}
                                    {provider && (
                                        <div className="flex items-center">
                                            <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></div>
                                            <span>AI: {provider}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Highlights panel (left sidebar) */}
                    {highlights.length > 0 && showHighlights && (
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-600">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Key Points</h3>
                                </div>
                                <div className="p-6">
                                    <ul className="space-y-4">
                                        {highlights.map((point, index) => (
                                            <li key={index} className="flex">
                                                <div className="flex-shrink-0 h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mr-3 mt-0.5">
                                                    <span className="text-xs font-medium">{index + 1}</span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300">{point}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary content card (main content) */}
                    <div className={showHighlights && highlights.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
                        <div className="bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            {/* Summary actions bar */}
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-600 flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-4">
                                        Summary {currentPage} of {pagesCount}
                                    </div>
                                    {highlights.length > 0 && (
                                        <button
                                            onClick={() => setShowHighlights(!showHighlights)}
                                            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            {showHighlights ? "Hide Key Points" : "Show Key Points"}
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={handleBookmark}
                                        className={`p-1.5 rounded-lg transition-colors ${bookmarked
                                            ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#383838]'
                                            }`}
                                        title={bookmarked ? "Bookmarked" : "Add to bookmarks"}
                                    >
                                        <Bookmark className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={handleCopy}
                                        className={`p-1.5 rounded-lg transition-colors ${copied
                                            ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#383838]'
                                            }`}
                                        title={copied ? "Copied!" : "Copy summary"}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={handleDownloadAsTxt}
                                        className="p-1.5 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#383838]"
                                        title="Download as text file"
                                    >
                                        <Download className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-5 min-h-[240px]">
                                <div className="prose dark:prose-invert max-w-none">
                                    {currentPage <= paragraphs.length && (
                                        <div>
                                            {paragraphs[currentPage - 1].split('\n').map((line, i) => {
                                                // Remove any bullet point markers from the beginning of the line
                                                const cleanLine = line.replace(/^\s*[-•*]\s*|\s*\d+\.\s*/, '');
                                                return (
                                                    <p key={i} className="mb-4 text-gray-800 dark:text-gray-200 leading-relaxed">
                                                        {cleanLine}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pagination controls */}
                            {pagesCount > 1 && (
                                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-600 flex justify-between items-center">
                                    <button
                                        onClick={prevPage}
                                        disabled={currentPage === 1}
                                        className={`flex items-center text-sm font-medium rounded-lg px-3 py-1.5 ${currentPage === 1
                                            ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#383838]'
                                            }`}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </button>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Page {currentPage} of {pagesCount}
                                    </div>
                                    <button
                                        onClick={nextPage}
                                        disabled={currentPage === pagesCount}
                                        className={`flex items-center text-sm font-medium rounded-lg px-3 py-1.5 ${currentPage === pagesCount
                                            ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#383838]'
                                            }`}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Feedback and extra actions */}
                        <div className="mt-6 flex justify-between">
                            <div className="flex items-center space-x-6">
                                <button
                                    onClick={handleLike}
                                    className={`flex items-center text-sm py-1.5 px-3 rounded-lg transition-colors ${liked
                                        ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#383838]'
                                        }`}
                                >
                                    <ThumbsUp className="h-4 w-4 mr-1.5" />
                                    <span>{liked ? 'Liked' : 'Like'}</span>
                                </button>
                                <button
                                    className="flex items-center text-sm text-gray-500 dark:text-gray-400 py-1.5 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#383838]"
                                >
                                    <Flag className="h-4 w-4 mr-1.5" />
                                    <span>Report Issue</span>
                                </button>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button
                                    className="flex items-center text-sm text-gray-500 dark:text-gray-400 py-1.5 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#383838]"
                                >
                                    <Tag className="h-4 w-4 mr-1.5" />
                                    <span>Add Tags</span>
                                </button>
                                <button
                                    className="flex items-center text-sm text-gray-500 dark:text-gray-400 py-1.5 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#383838]"
                                >
                                    <Share2 className="h-4 w-4 mr-1.5" />
                                    <span>Share</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryResultsPage;