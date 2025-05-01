import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Copy, Clock, Bookmark, ExternalLink, ThumbsUp, Flag, Plus } from 'lucide-react';
import Image from 'next/image';
import { SummaryResultsPageProps } from '@/types/summary'
import { useRouter } from 'next/navigation';

const SummaryResultsPage = ({ summary, metadata, timestamp, provider }: SummaryResultsPageProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [copied, setCopied] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [liked, setLiked] = useState(false);
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

    // Split summary into pages (paragraphs)
    const paragraphs = summary ? summary.split('\n\n').filter(p => p.trim().length > 0) : [];
    const pagesCount = Math.max(1, paragraphs.length);

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

    const handleNewSummary = () => {
        // Navigate back to home page to create a new summary
        router.push('/home');
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
        <div className="w-full min-h-screen bg-[#fffefe] dark:bg-[#202120] py-8">
            <div className="w-full max-w-4xl mx-auto px-4">
                {/* New Summary Button */}
                <div className="mb-6 flex justify-end">
                    <button
                        onClick={handleNewSummary}
                        className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Summary
                    </button>
                </div>

                {/* Video metadata card */}
                {metadata && (
                    <div className="mb-8 bg-white dark:bg-[#2E2E2E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
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

                {/* Summary content card */}
                <div className="bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {/* Summary actions bar */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-600 flex justify-between items-center">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Summary {currentPage} of {pagesCount}
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
                        </div>
                    </div>

                    {/* Summary content */}
                    <div className="px-6 py-5 min-h-[240px]">
                        <div className="prose dark:prose-invert max-w-none">
                            {currentPage <= paragraphs.length && (
                                <div>
                                    {paragraphs[currentPage - 1].split('\n').map((line, i) => (
                                        <p key={i} className="mb-4 text-gray-800 dark:text-gray-200 leading-relaxed">
                                            {line}
                                        </p>
                                    ))}
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

                {/* Feedback controls */}
                <div className="mt-6 flex justify-center space-x-6">
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
            </div>
        </div>
    );
};

export default SummaryResultsPage;