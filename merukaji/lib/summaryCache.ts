import clientPromise from './mongodb';
import { logger } from './logger';
import { VideoMetadata } from '@/types/youtube';
import { ObjectId } from 'mongodb';

interface SummaryCacheInput {
    userId: string;
    videoId: string;
    summaryType: string;
    summary: string;
    metadata: VideoMetadata;
    provider: string;
}

interface CachedSummaryResult {
    id: string;
    summary: string;
    metadata: VideoMetadata;
    provider: string;
    timestamp: string;
}

const CACHE_TTL_DAYS = 7;

/**
 * Get cached summary from MongoDB
 */
export async function getCachedSummary(
    videoId: string,
    summaryType: string,
    requestId: string
): Promise<CachedSummaryResult | null> {
    try {
        logger.debug('Checking cache for summary', { videoId, requestId });

        const client = await clientPromise;
        const db = client.db();

        const cachedSummary = await db.collection('summaries').findOne({
            videoId,
            summaryType,
            // Only return summaries from last 7 days
            createdAt: {
                $gte: new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)
            }
        });

        if (cachedSummary) {
            logger.info('Cache hit for summary', {
                requestId,
                videoId,
                age: `${Math.round((Date.now() - cachedSummary.createdAt.getTime()) / (1000 * 60))}min`
            });

            return {
                id: cachedSummary._id.toString(),
                summary: cachedSummary.summary,
                metadata: cachedSummary.metadata,
                provider: cachedSummary.provider,
                timestamp: cachedSummary.createdAt.toISOString()
            };
        }

        logger.info('Cache miss for summary', { requestId, videoId });
        return null;

    } catch (error) {
        logger.error('Error retrieving cached summary', {
            requestId,
            videoId,
            error: error instanceof Error ? error.message : String(error)
        });
        return null; // Continue without cache on error
    }
}

/**
 * Cache summary in MongoDB
 */
export async function cacheSummary(
    summary: SummaryCacheInput,
    requestId: string
): Promise<string> {
    try {
        logger.debug('Caching summary', {
            requestId,
            videoId: summary.videoId
        });

        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection('summaries').insertOne({
            ...summary,
            createdAt: new Date(),
            // Add TTL index
            expiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)
        });

        const insertedId = result.insertedId.toString();

        logger.info('Summary cached successfully', {
            requestId,
            videoId: summary.videoId,
            summaryId: insertedId
        });

        return insertedId;

    } catch (error) {
        logger.error('Error caching summary', {
            requestId,
            videoId: summary.videoId,
            error: error instanceof Error ? error.message : String(error)
        });

        throw error; // Propagate error to caller
    }
}

/**
 * Delete a cached summary by ID
 */
export async function deleteCachedSummary(
    summaryId: string,
    userId: string
): Promise<boolean> {
    try {
        const client = await clientPromise;
        const db = client.db();

        // Only allow deletion if user owns the summary
        const result = await db.collection('summaries').deleteOne({
            _id: new ObjectId(summaryId),
            userId
        });

        return result.deletedCount > 0;

    } catch (error) {
        logger.error('Error deleting cached summary', {
            summaryId,
            userId,
            error: error instanceof Error ? error.message : String(error)
        });
        return false;
    }
}

/**
 * Clean up expired summaries
 * Should be run as a scheduled task
 */
export async function cleanupExpiredSummaries(): Promise<number> {
    try {
        const client = await clientPromise;
        const db = client.db();

        const cutoffDate = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

        const result = await db.collection('summaries').deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        logger.info('Cleaned up expired summaries', {
            deletedCount: result.deletedCount
        });

        return result.deletedCount;

    } catch (error) {
        logger.error('Error cleaning up expired summaries', {
            error: error instanceof Error ? error.message : String(error)
        });
        return 0;
    }
}

// Add MongoDB Index for TTL-based cleanup
// This should be run during app initialization
export async function setupSummaryIndexes(): Promise<void> {
    try {
        const client = await clientPromise;
        const db = client.db();

        // Create compound index for efficient lookups
        await db.collection('summaries').createIndex(
            { videoId: 1, summaryType: 1, createdAt: -1 }
        );

        // Create TTL index for automatic cleanup
        await db.collection('summaries').createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 }
        );

        // Create index for user history lookups
        await db.collection('summaries').createIndex(
            { userId: 1, createdAt: -1 }
        );

        logger.info('Summary cache indexes created successfully');

    } catch (error) {
        logger.error('Error creating summary cache indexes', {
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}