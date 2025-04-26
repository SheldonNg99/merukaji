// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from './logger';
import { SummaryType } from '@/types/gemini';
import { VideoMetadata } from '@/types/youtube';

const API_KEY = process.env.GOOGLE_AI_API_KEY;

if (!API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY environment variable is required");
}

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(API_KEY);

// Create a client for the Gemini-Flash-2.0 model
export const geminiProModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Generate a summary from YouTube transcript using Gemini API
 */
export async function generateSummary(
    transcript: string,
    videoMetadata: VideoMetadata,
    summaryType: SummaryType = 'short'
): Promise<string> {
    try {
        logger.info('Generating summary with Gemini API', {
            videoId: videoMetadata.videoId,
            summaryType
        });

        // Create a prompt based on the summary type
        const prompt = createSummaryPrompt(transcript, videoMetadata, summaryType);

        // Get a response from Gemini
        const result = await geminiProModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        logger.info('Successfully generated summary', {
            videoId: videoMetadata.videoId,
            summaryLength: text.length
        });

        return text;
    } catch (error) {
        logger.error('Failed to generate summary with Gemini', {
            error: error instanceof Error ? error.message : String(error),
            videoId: videoMetadata.videoId
        });
        throw error;
    }
}

/**
 * Create an optimized prompt for summarizing YouTube transcripts
 */
function createSummaryPrompt(
    transcript: string,
    videoMetadata: VideoMetadata,
    summaryType: SummaryType
): string {
    // Process the transcript text
    const processedTranscript = transcript.replace(/(\r\n|\n|\r)/gm, " ").trim();

    // Create metadata context
    const metadataContext = `
Title: ${videoMetadata.title || 'Unknown'}
${videoMetadata.channelTitle ? `Channel: ${videoMetadata.channelTitle}` : ''}
${videoMetadata.duration ? `Duration: ${videoMetadata.duration}` : ''}
  `.trim();

    // Define summary type expectations
    const summaryInstructions = summaryType === 'short'
        ? "Create a concise summary with 5-10 key points. Format with clear headings and bullet points where appropriate."
        : "Create a comprehensive summary that includes main topics and insights. Use clear headings for each section and proper spacing between paragraphs.";

    // Construct the full prompt
    return `
You are a professional video summarizer for Merukaji, a platform that helps busy people get the key points from YouTube videos.

CONTEXT:
${metadataContext}

TRANSCRIPT:
${processedTranscript}

TASK:
${summaryInstructions}

FORMAT GUIDELINES:
- Be direct and concise
- Prioritize accuracy over completeness
- Use clear, simple language
- Maintain an objective tone
- Focus on factual information
- Highlight any key takeaways or actionable insights
- Do not add information not present in the transcript
- Do not begin with phrases like "This video is about" or "In this video"
- Use bold headings for main sections
- Separate different topics with line breaks
- Use bullet points for lists of related items
- Structure the summary with a clear introduction and conclusion

Your summary:
`;
}