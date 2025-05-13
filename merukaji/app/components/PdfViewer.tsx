// app/components/PdfViewer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { File } from 'lucide-react';
import { VideoMetadata } from '@/types/youtube';
import { generateSummaryPDF } from '@/lib/pdfGenerator';
import { useToast } from '@/app/components/contexts/ToastContext';

interface PdfViewerProps {
    summary: string;
    metadata?: VideoMetadata;
    timestamp?: string | null;
    provider?: string | null;
}

export default function PdfViewer({ summary, metadata, timestamp, provider }: PdfViewerProps) {
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const { showToast } = useToast();

    // Generate PDF when component mounts
    useEffect(() => {
        try {
            // Only generate PDF for display if user has valid content
            if (summary) {
                setLoading(true);

                // Generate PDF without watermark
                const pdfBlob = generateSummaryPDF(summary, metadata, timestamp);

                // Create object URL for preview
                const url = URL.createObjectURL(pdfBlob);
                setPdfUrl(url);

                // Clean up on component unmount
                return () => {
                    if (url) URL.revokeObjectURL(url);
                };
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            showToast('Failed to generate PDF', 'error');
        } finally {
            setLoading(false);
        }
    }, [summary, metadata, timestamp, provider, showToast]);

    // Handle PDF download
    const handleDownload = () => {
        try {
            if (!summary) {
                showToast('No summary available to download', 'warning');
                return;
            }

            // Generate PDF for download (no watermark)
            const pdfBlob = generateSummaryPDF(summary, metadata, timestamp);

            // Create temporary download link
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${metadata?.title || 'summary'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 100);

            showToast('PDF downloaded successfully', 'success');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showToast('Failed to download PDF', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Generating PDF...</p>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                    <File className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No summary available</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Enter a YouTube URL to generate a summary</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* PDF Controls */}
            <div className="flex justify-between items-center px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    {metadata?.title ? metadata.title : 'Video Summary'}
                </div>
                <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors bg-orange-500 hover:bg-orange-600 text-white"
                >
                    Download
                </button>
            </div>

            {/* PDF Preview */}
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4 h-[calc(100vh-220px)]">
                {pdfUrl ? (
                    <div className="bg-white dark:bg-gray-900 shadow-md rounded-lg overflow-hidden mx-auto h-full">
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full"
                            title="PDF Preview"
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <File className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">PDF preview not available</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}