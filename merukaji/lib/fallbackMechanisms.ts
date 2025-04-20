// lib/fallbackMechanisms.ts

import { generateSummary as generateGeminiSummary } from './gemini';
import { logger } from './logger';
import OpenAI from 'openai';
import { VideoMetadata } from '@/types/youtube';

// Initialize OpenAI as a fallback option
const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

/**
 * Generate a summary with fallback options
 */
export async function generateSummaryWithFallback(
    transcript: string,
    videoMetadata: VideoMetadata,
    summaryType: 'short' | 'comprehensive' = 'short',
    preferredProvider: 'gemini' | 'openai' = 'gemini'
): Promise<{
    summary: string;
    provider: string;
    error?: string;
}> {
    // First try the preferred provider
    try {
        if (preferredProvider === 'gemini') {
            // Try Gemini first
            const summary = await generateGeminiSummary(transcript, videoMetadata, summaryType);
            return { summary, provider: 'gemini' };
        } else {
            // Try OpenAI first
            const summary = await generateOpenAISummary(transcript, videoMetadata, summaryType);
            return { summary, provider: 'openai' };
        }
    } catch (primaryError) {
        logger.error(`Primary AI provider (${preferredProvider}) failed`, {
            error: primaryError instanceof Error ? primaryError.message : String(primaryError),
            videoId: videoMetadata.videoId
        });

        // Try the fallback provider
        try {
            if (preferredProvider === 'gemini') {
                // Fallback to OpenAI
                if (!openai) {
                    throw new Error('OpenAI fallback not configured');
                }
                const summary = await generateOpenAISummary(transcript, videoMetadata, summaryType);
                return {
                    summary,
                    provider: 'openai',
                    error: `Gemini API failed: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`
                };
            } else {
                // Fallback to Gemini
                const summary = await generateGeminiSummary(transcript, videoMetadata, summaryType);
                return {
                    summary,
                    provider: 'gemini',
                    error: `OpenAI API failed: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`
                };
            }
        } catch (fallbackError) {
            logger.error('Both primary and fallback AI providers failed', {
                primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
                fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                videoId: videoMetadata.videoId
            });

            // Last resort: return a basic summary based on the transcript
            return {
                summary: generateBasicSummary(transcript, videoMetadata),
                provider: 'basic',
                error: 'AI summarization services unavailable. Generated basic summary.'
            };
        }
    }
}

/**
 * Generate a summary using OpenAI
 */
async function generateOpenAISummary(
    transcript: string,
    videoMetadata: VideoMetadata,
    summaryType: 'short' | 'comprehensive'
): Promise<string> {
    if (!openai) {
        throw new Error('OpenAI API key not configured');
    }

    // Create a prompt for OpenAI (similar structure to Gemini but adapted for OpenAI)
    const systemPrompt = `You are a professional video summarizer that extracts key information from YouTube video transcripts.`;

    const userPrompt = `
CONTEXT:
Title: ${videoMetadata.title || 'Unknown'}
${videoMetadata.channelTitle ? `Channel: ${videoMetadata.channelTitle}` : ''}
${videoMetadata.duration ? `Duration: ${videoMetadata.duration}` : ''}

TRANSCRIPT:
${transcript}

TASK:
${summaryType === 'short'
            ? "Create a concise summary in about 3-5 bullet points that captures the key information."
            : "Create a comprehensive summary with sections, key insights, and actionable information."}

FORMAT GUIDELINES:
- Be direct and concise
- Prioritize accuracy over completeness
- Use clear, simple language
- Maintain an objective tone
- Focus on factual information
- Highlight any key takeaways or actionable insights
- Do not add information not present in the transcript
- Do not begin with phrases like "This video is about" or "In this video"
`;

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: summaryType === 'short' ? 300 : 800,
    });

    return response.choices[0]?.message?.content || '';
}

/**
 * Generate a basic summary when both AI services fail
 */
function generateBasicSummary(transcript: string, videoMetadata: VideoMetadata): string {
    // Extract the first few sentences for a very basic summary
    const sentences = transcript.split(/(?<=[.!?])\s+/);
    const firstFewSentences = sentences.slice(0, 3).join(' ');

    return `
# ${videoMetadata.title || 'Video Summary'}

This is an automatically generated basic summary due to AI service unavailability.

## Content Preview:
${firstFewSentences}...

The video transcript is approximately ${transcript.length} characters long.
`.trim();
}