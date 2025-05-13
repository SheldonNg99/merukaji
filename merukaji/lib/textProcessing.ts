// lib/textProcessing.ts

/**
 * Convert raw transcript segments into coherent paragraphs
 */
export function convertTranscriptToParagraphs(transcript: { text: string; offset: number }[]): string[] {
    const paragraphs: string[] = [];
    let currentParagraph = '';
    let lastOffset = 0;

    for (let i = 0; i < transcript.length; i++) {
        const segment = transcript[i];
        const gap = segment.offset - lastOffset;
        const nextSegment = transcript[i + 1];
        const text = segment.text.trim();

        // Start new paragraph if:
        // 1. There's a significant pause (gap > 2 seconds)
        // 2. Current segment ends with sentence-ending punctuation
        // 3. Next segment starts with capital letter (likely new thought)
        const shouldStartNewParagraph =
            gap > 2 ||
            /[.!?]$/.test(currentParagraph.trim()) ||
            (nextSegment && /^[A-Z]/.test(nextSegment.text.trim()));

        if (shouldStartNewParagraph && currentParagraph.trim()) {
            paragraphs.push(currentParagraph.trim());
            currentParagraph = text;
        } else {
            // Add space only if we're adding to existing content
            currentParagraph += (currentParagraph ? ' ' : '') + text;
        }

        lastOffset = segment.offset;
    }

    // Add the final paragraph if there's content
    if (currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim());
    }

    // Additional cleanup: merge very short paragraphs
    return mergeTooShortParagraphs(paragraphs);
}

/**
 * Merge paragraphs that are too short (less than 100 characters)
 * with the next paragraph if available
 */
function mergeTooShortParagraphs(paragraphs: string[], minLength: number = 100): string[] {
    const merged: string[] = [];
    let current = '';

    for (const paragraph of paragraphs) {
        if (current && current.length < minLength) {
            current += ' ' + paragraph;
        } else if (current) {
            merged.push(current);
            current = paragraph;
        } else {
            current = paragraph;
        }
    }

    if (current) {
        merged.push(current);
    }

    return merged;
}

/**
 * Clean and format a summary for display
 */
// lib/textProcessing.ts
/**
 * Clean and format a summary for display
 */
export function formatSummary(rawSummary: string): string {
    // Remove potential AI artifacts like "Here's a summary:" prefixes
    let cleanSummary = rawSummary
        .replace(/^(here'?s? (is |)a summary:?|summary:)/i, '')
        .replace(/^(here are the key points:?|key points:)/i, '')
        .trim();

    // Convert HTML line breaks to regular line breaks
    cleanSummary = cleanSummary
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/br>/gi, '\n');

    // Convert any HTML entities
    cleanSummary = cleanSummary
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'");

    // Ensure proper spacing between sections
    return cleanSummary
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
        .trim();
}


/**
 * Process raw transcript segments into a single coherent text
 */
export function processTranscriptSegments(segments: Array<{ text: string, offset: number }>): string {
    // Sort segments by offset if they're not already in order
    const sortedSegments = [...segments].sort((a, b) => a.offset - b.offset);

    // Join all text together with spaces
    return sortedSegments.map(segment => segment.text.trim()).join(' ');
}

/**
 * Extract key points from a text into a structured format
 */
export function extractKeyPoints(text: string): string[] {
    // This regex looks for bullet points, numbered lists, or paragraph breaks
    const pointsPattern = /(?:^|\n)(?:\s*[-•*]\s*|\s*\d+\.\s*|\s{4,}|(?=\n\n))(.*?)(?=(?:\n\s*[-•*]|\n\s*\d+\.|\n{2,}|$))/gs;

    const matches = Array.from(text.matchAll(pointsPattern));
    if (matches.length > 0) {
        return matches.map(match => match[1].trim()).filter(Boolean);
    }

    // Fallback: if no bullet points are found, split by sentences
    return text
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 20); // Filter out very short sentences
}

/**
 * Truncate text to a specific length while maintaining complete sentences
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // Find the last complete sentence that fits within maxLength
    const truncated = text.substring(0, maxLength);
    const lastSentenceBreak = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?')
    );

    return lastSentenceBreak > 0
        ? text.substring(0, lastSentenceBreak + 1)
        : truncated + '...';
}