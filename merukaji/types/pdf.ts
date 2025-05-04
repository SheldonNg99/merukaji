// types/pdf.ts
import { VideoMetadata } from './youtube';

export interface PdfGeneratorOptions {
    summary: string;
    metadata?: VideoMetadata;
    timestamp?: string | null;
    provider?: string | null;
    isFreeTier?: boolean;
}

export interface PdfViewerProps {
    summary: string;
    metadata?: VideoMetadata;
    timestamp?: string | null;
    provider?: string | null;
}