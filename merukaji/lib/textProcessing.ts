// lib/textProcessing.ts

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
 * Clean and format a summary for display
 */
export function formatSummary(rawSummary: string): string {
    // Remove potential AI artifacts like "Here's a summary:" prefixes
    const cleanSummary = rawSummary
        .replace(/^(here'?s? (is |)a summary:?|summary:)/i, '')
        .replace(/^(here are the key points:?|key points:)/i, '')
        .trim();

    return cleanSummary;
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