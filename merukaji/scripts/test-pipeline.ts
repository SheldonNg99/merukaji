// scripts/test-pipeline.ts

/**
 * Test script for the summarization pipeline
 * Run with: npx ts-node scripts/test-pipeline.ts
 */

import { extractVideoId, getVideoTranscript, getVideoMetadata } from '../lib/youtube';
import { processTranscriptSegments } from '../lib/textProcessing';
import { generateSummaryWithFallback } from '../lib/fallbackMechanisms';

// Test URLs
const TEST_URLS = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo (first YouTube video)
];

async function testPipeline() {
    console.log('🧪 Starting end-to-end pipeline test');

    for (const url of TEST_URLS) {
        console.log(`\n📺 Testing URL: ${url}`);

        try {
            // 1. Extract video ID
            const videoId = extractVideoId(url);
            console.log(`✅ Extracted Video ID: ${videoId}`);

            if (!videoId) {
                console.error('❌ Failed to extract video ID');
                continue;
            }

            // 2. Get metadata and transcript
            console.log('📥 Fetching metadata and transcript...');

            const [metadata, transcript] = await Promise.all([
                getVideoMetadata(videoId),
                getVideoTranscript(videoId)
            ]);

            console.log(`✅ Got metadata: ${metadata.title} (${transcript.length} segments)`);

            // 3. Process transcript
            const processedTranscript = processTranscriptSegments(transcript);
            console.log(`✅ Processed transcript (${processedTranscript.length} characters)`);

            // 4. Generate summary (short)
            console.log('🤖 Generating short summary...');
            const shortSummary = await generateSummaryWithFallback(
                processedTranscript,
                metadata,
                'short'
            );

            console.log(`✅ Generated short summary using ${shortSummary.provider}:`);
            console.log('---');
            console.log(shortSummary.summary.slice(0, 300) + '...');
            console.log('---');

            // 5. Generate summary (comprehensive)
            console.log('🤖 Generating comprehensive summary...');
            const comprehensiveSummary = await generateSummaryWithFallback(
                processedTranscript,
                metadata,
                'comprehensive'
            );

            console.log(`✅ Generated comprehensive summary using ${comprehensiveSummary.provider}:`);
            console.log('---');
            console.log(comprehensiveSummary.summary.slice(0, 300) + '...');
            console.log('---');

        } catch (error) {
            console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
        }
    }

    console.log('\n🏁 End-to-end test completed');
}

// Run the test
testPipeline().catch(console.error);