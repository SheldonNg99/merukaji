
export type SummaryType = 'short' | 'comprehensive';
import { VideoMetadata } from './youtube';

export interface SummaryRequest {
    transcript: string;
    videoMetadata: VideoMetadata;
    summaryType: SummaryType;
    preferredProvider?: 'gemini' | 'openai';
}

export interface SummaryResponse {
    summary: string;
    provider: 'gemini' | 'openai' | 'basic';
    error?: string;
    cached?: boolean;
}