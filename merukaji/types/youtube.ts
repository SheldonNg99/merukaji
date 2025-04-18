export interface VideoMetadata {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    channelTitle?: string;
    publishedAt?: string;
    duration?: string;
}

export interface TranscriptSegment {
    text: string;
    offset: number;
    duration: number;
}

export interface TranscriptResult {
    videoId: string;
    transcript: TranscriptSegment[];
    language?: string;
}

export interface CachedTranscript extends TranscriptResult {
    createdAt: Date;
    expiresAt: Date;
}

export interface ProcessedVideo {
    metadata: VideoMetadata;
    transcript: TranscriptSegment[];
}

export interface TranscriptResponse {
    success: boolean;
    metadata: VideoMetadata;
    transcript: TranscriptSegment[];
}