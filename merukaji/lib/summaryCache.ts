import { supabaseAdmin } from './supabase';
import { logger } from './logger';
import { CachedSummaryResult, SummaryCacheInput } from '@/types/summary';

const CACHE_TTL_DAYS = 7;

/**
 * Get cached summary from Supabase
 */
export async function getCachedSummary(
    videoId: string,
    summaryType: string,
    requestId: string
): Promise<CachedSummaryResult | null> {
    try {
        logger.debug('Checking cache for summary', { videoId, requestId });

        // Calculate the date 7 days ago
        const cacheDate = new Date();
        cacheDate.setDate(cacheDate.getDate() - CACHE_TTL_DAYS);

        const { data, error } = await supabaseAdmin
            .from('summaries')
            .select('*')
            .eq('video_id', videoId)
            .eq('summary_type', summaryType)
            .gte('created_at', cacheDate.toISOString())
            .single();

        if (error || !data) {
            logger.info('Cache miss for summary', { requestId, videoId });
            return null;
        }

        logger.info('Cache hit for summary', {
            requestId,
            videoId,
            age: `${Math.round((Date.now() - new Date(data.created_at).getTime()) / (1000 * 60))}min`
        });

        return {
            id: data.id,
            summary: data.summary,
            metadata: data.metadata,
            provider: data.provider,
            timestamp: data.created_at
        };

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
 * Cache summary in Supabase
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

        // Calculate expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + CACHE_TTL_DAYS);

        const { data, error } = await supabaseAdmin
            .from('summaries')
            .insert({
                user_id: summary.userId,
                video_id: summary.videoId,
                summary_type: summary.summaryType,
                summary: summary.summary,
                metadata: summary.metadata,
                provider: summary.provider,
                created_at: new Date().toISOString(),
                expires_at: expiryDate.toISOString()
            })
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        const insertedId = data.id;

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
        const { error } = await supabaseAdmin
            .from('summaries')
            .delete()
            .eq('id', summaryId)
            .eq('user_id', userId);

        return !error;

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
 * Handled automatically by Supabase using TTL
 */
export async function cleanupExpiredSummaries(): Promise<number> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - CACHE_TTL_DAYS);

        const { error, count } = await supabaseAdmin
            .from('summaries')
            .delete()
            .lt('created_at', cutoffDate.toISOString())
            .select('count');

        if (error) {
            throw error;
        }

        logger.info('Cleaned up expired summaries', {
            deletedCount: count
        });

        return count || 0;

    } catch (error) {
        logger.error('Error cleaning up expired summaries', {
            error: error instanceof Error ? error.message : String(error)
        });
        return 0;
    }
}