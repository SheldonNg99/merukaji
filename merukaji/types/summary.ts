import { VideoMetadata } from "./youtube";

export type SummaryProvider = 'gemini' | 'openai' | 'basic' | string;

export interface SummaryData {
    summary: string;
    provider: SummaryProvider;
    error?: string;
    cached?: boolean;
    limits?: {
        daily: number;
        minute: number;
    };
}

export interface SummaryResultsPageProps {
    summary: string;
    metadata?: VideoMetadata;
    timestamp?: string | null;
    provider?: string | null;
}


export interface SummaryHistoryItem {
    id: string;
    userId: string;
    videoId: string;
    videoTitle: string;
    videoThumbnail?: string;
    summary: string;
    createdAt: string;
    length: 'short' | 'comprehensive';
    provider: SummaryProvider;
}