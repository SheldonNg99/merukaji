import { supabaseAdmin } from "./supabase";
import { logger } from "./logger";
import { UsageQuota } from "@/types/ratelimit"

// Tier-based usage quotas
const TIER_QUOTAS: Record<string, UsageQuota> = {
    free: {
        tier: 'free',
        dailyLimit: 3,
        minuteLimit: 1
    },
    pro: {
        tier: 'pro',
        dailyLimit: 20,
        minuteLimit: 3
    },
    max: {
        tier: 'max',
        dailyLimit: 100,
        minuteLimit: 10
    }
};

// Cleanup retention period in days
const USAGE_RETENTION_DAYS = 30;

/**
 * Check if the user has exceeded their rate limits
 */
export async function checkRateLimit(userId: string, tier: string = 'free'): Promise<{
    allowed: boolean;
    reason?: string;
    remaining: { daily: number; minute: number; }
    resetTime?: { daily: Date; minute: Date; }
}> {
    try {
        const userQuota = TIER_QUOTAS[tier] || TIER_QUOTAS.free;
        const now = new Date();

        // Get the start of the current day in UTC
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        // Get the start of the current minute
        const startOfMinute = new Date(now);
        startOfMinute.setSeconds(0, 0);

        // Calculate when the limits reset
        const nextDay = new Date(startOfDay);
        nextDay.setDate(nextDay.getDate() + 1);

        const nextMinute = new Date(startOfMinute);
        nextMinute.setMinutes(nextMinute.getMinutes() + 1);

        // Get daily usage count
        const { count: dailyUsage, error: dailyError } = await supabaseAdmin
            .from('usage_stats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('timestamp', startOfDay.toISOString())
            .eq('reset', false);

        if (dailyError) {
            throw dailyError;
        }

        // Get minute usage count
        const { count: minuteUsage, error: minuteError } = await supabaseAdmin
            .from('usage_stats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('timestamp', startOfMinute.toISOString())
            .eq('reset', false);

        if (minuteError) {
            throw minuteError;
        }

        // Calculate remaining
        const dailyRemaining = Math.max(0, userQuota.dailyLimit - (dailyUsage || 0));
        const minuteRemaining = Math.max(0, userQuota.minuteLimit - (minuteUsage || 0));

        // Check if user has exceeded limits
        if ((dailyUsage || 0) >= userQuota.dailyLimit) {
            return {
                allowed: false,
                reason: 'daily_limit_exceeded',
                remaining: { daily: dailyRemaining, minute: minuteRemaining },
                resetTime: { daily: nextDay, minute: nextMinute }
            };
        }

        if ((minuteUsage || 0) >= userQuota.minuteLimit) {
            return {
                allowed: false,
                reason: 'minute_limit_exceeded',
                remaining: { daily: dailyRemaining, minute: minuteRemaining },
                resetTime: { daily: nextDay, minute: nextMinute }
            };
        }

        return {
            allowed: true,
            remaining: { daily: dailyRemaining, minute: minuteRemaining },
            resetTime: { daily: nextDay, minute: nextMinute }
        };
    } catch (error) {
        logger.error('Failed to check rate limits', {
            userId,
            error: error instanceof Error ? error.message : String(error)
        });

        // In case of error, allow the request but log it
        return { allowed: true, remaining: { daily: 0, minute: 0 } };
    }
}

/**
 * Record usage for rate limiting
 */
export async function recordUsage(userId: string, videoId: string): Promise<void> {
    try {
        const { error } = await supabaseAdmin
            .from('usage_stats')
            .insert({
                user_id: userId,
                video_id: videoId,
                timestamp: new Date().toISOString(),
                action: 'summarize',
                reset: false
            });

        if (error) {
            throw error;
        }

        logger.info('Recorded usage for rate limiting', { userId, videoId });
    } catch (error) {
        logger.error('Failed to record usage', {
            userId,
            videoId,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

/**
 * Explicitly reset a user's daily usage limit
 * Useful for administrative purposes or testing
 */
export async function resetUserDailyLimit(userId: string): Promise<boolean> {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { error } = await supabaseAdmin
            .from('usage_stats')
            .update({ reset: true })
            .eq('user_id', userId)
            .gte('timestamp', startOfDay.toISOString())
            .eq('reset', false);

        if (error) {
            throw error;
        }

        logger.info('Manually reset daily limit for user', { userId });
        return true;
    } catch (error) {
        logger.error('Failed to reset user daily limit', {
            userId,
            error: error instanceof Error ? error.message : String(error)
        });

        return false;
    }
}

/**
 * Clean up old usage records to prevent database bloat
 * This should be run as a scheduled task (e.g., once per day)
 */
export async function cleanupOldUsageRecords(): Promise<number> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - USAGE_RETENTION_DAYS);

        const { error, count } = await supabaseAdmin
            .from('usage_stats')
            .delete()
            .lt('timestamp', cutoffDate.toISOString())
            .select('count');

        if (error) {
            throw error;
        }

        const deletedCount = count || 0;

        logger.info('Cleaned up old usage records', {
            deletedCount,
            retentionDays: USAGE_RETENTION_DAYS
        });

        return deletedCount;
    } catch (error) {
        logger.error('Failed to clean up old usage records', {
            error: error instanceof Error ? error.message : String(error)
        });

        return 0;
    }
}

/**
 * Get a user's current usage statistics
 */
export async function getUserUsageStats(userId: string): Promise<{
    dailyUsage: number;
    dailyLimit: number;
    dailyRemaining: number;
    nextReset: Date;
    usageHistory: { date: string; count: number }[];
}> {
    try {
        // Get user tier
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('tier')
            .eq('id', userId)
            .single();

        if (userError) {
            throw userError;
        }

        const userTier = userData?.tier || 'free';
        const userQuota = TIER_QUOTAS[userTier] || TIER_QUOTAS.free;

        // Get start of today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Get daily usage
        const { count: dailyUsage, error: countError } = await supabaseAdmin
            .from('usage_stats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('timestamp', startOfDay.toISOString())
            .eq('reset', false);

        if (countError) {
            throw countError;
        }

        // Calculate next reset time
        const nextReset = new Date(startOfDay);
        nextReset.setDate(nextReset.getDate() + 1);

        // Get usage history for the last 7 days
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 6); // Last 7 days including today
        startOfWeek.setHours(0, 0, 0, 0);

        // This is more complex with Supabase - we'll need to do some post-processing
        const { data: usageData, error: usageError } = await supabaseAdmin
            .from('usage_stats')
            .select('timestamp')
            .eq('user_id', userId)
            .gte('timestamp', startOfWeek.toISOString())
            .eq('reset', false);

        if (usageError) {
            throw usageError;
        }

        // Group by date
        const usageByDate = new Map<string, number>();
        for (const item of usageData || []) {
            const date = new Date(item.timestamp).toISOString().split('T')[0];
            usageByDate.set(date, (usageByDate.get(date) || 0) + 1);
        }

        const usageHistory = Array.from(usageByDate.entries()).map(([date, count]) => ({
            date,
            count
        }));

        return {
            dailyUsage: dailyUsage || 0,
            dailyLimit: userQuota.dailyLimit,
            dailyRemaining: Math.max(0, userQuota.dailyLimit - (dailyUsage || 0)),
            nextReset,
            usageHistory
        };
    } catch (error) {
        logger.error('Failed to get user usage stats', {
            userId,
            error: error instanceof Error ? error.message : String(error)
        });

        // Return default values in case of error
        const nextReset = new Date();
        nextReset.setHours(24, 0, 0, 0);

        return {
            dailyUsage: 0,
            dailyLimit: TIER_QUOTAS.free.dailyLimit,
            dailyRemaining: TIER_QUOTAS.free.dailyLimit,
            nextReset,
            usageHistory: []
        };
    }
}