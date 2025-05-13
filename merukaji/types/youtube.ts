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

// New types for client-side transcript fetching
export interface YouTubePlayerResponse {
    videoDetails?: {
        title?: string;
        author?: string;
        lengthSeconds?: string;
    };
    microformat?: {
        playerMicroformatRenderer?: {
            publishDate?: string;
        };
    };
    captions?: {
        playerCaptionsTracklistRenderer?: {
            captionTracks?: Array<{
                baseUrl: string;
                name?: {
                    simpleText?: string;
                };
                languageCode?: string;
                kind?: string;
            }>;
        };
    };
}

export interface TranscriptFetcherProps {
    videoId: string | null;
    onTranscriptFetched: (transcript: TranscriptSegment[], metadata: VideoMetadata) => void;
    onError: (error: string) => void;
}

// Type for HTML entities mapping
export interface HtmlEntities {
    [key: string]: string;
    '&amp;': string;
    '&lt;': string;
    '&gt;': string;
    '&quot;': string;
    '&#39;': string;
    '&nbsp;': string;
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