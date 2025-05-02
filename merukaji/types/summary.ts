import { VideoMetadata } from "./youtube";

export interface SummaryResultsPageProps {
    summary: string;
    metadata?: VideoMetadata;
    timestamp?: string | null;
    provider?: string | null;
}

export interface SummaryCacheInput {
    userId: string;
    videoId: string;
    summaryType: string;
    summary: string;
    metadata: VideoMetadata;
    provider: string;
}

export interface CachedSummaryResult {
    id: string;
    summary: string;
    metadata: VideoMetadata;
    provider: string;
    timestamp: string;
}