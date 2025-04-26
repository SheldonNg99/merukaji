'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SummaryResultsPage from '@/app/components/SummaryResultsPage';
import { VideoMetadata } from '@/types/youtube';

export default function SummaryPage() {
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summaryData, setSummaryData] = useState<{
        summary: string;
        metadata: VideoMetadata;
        timestamp: string;
        provider: string;
    } | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('Fetching summary with ID:', id);

                const response = await fetch(`/api/summary/${id}`);

                console.log('Response status:', response.status);

                const contentType = response.headers.get("content-type");

                if (!contentType || !contentType.includes("application/json")) {
                    const text = await response.text();
                    console.error('Non-JSON response:', text);
                    throw new Error('Server returned non-JSON response');
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch summary');
                }

                setSummaryData(data);
            } catch (err) {
                console.error('Error fetching summary:', err);
                setError(err instanceof Error ? err.message : 'Failed to load summary');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSummary();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-gray-700 dark:text-gray-300">Loading summary...</p>
                </div>
            </div>
        );
    }

    if (error || !summaryData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error || 'Summary not found'}</p>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        The summary you are looking for might have been deleted or you do not have permission to view it.
                    </p>
                    <a
                        href="/home"
                        className="inline-block px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                        Return to home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <SummaryResultsPage
            summary={summaryData.summary}
            metadata={summaryData.metadata}
            timestamp={summaryData.timestamp}
            provider={summaryData.provider}
        />
    );
}