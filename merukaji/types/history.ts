export interface HistoryItem {
    id: string;
    videoId: string;
    title: string;
    thumbnailUrl?: string;
    timestamp: string;
    summaryType: 'short' | 'comprehensive';
}

export interface HistoryResponse {
    success: boolean;
    count: number;
    summaries: HistoryItem[];
    error?: string;
}