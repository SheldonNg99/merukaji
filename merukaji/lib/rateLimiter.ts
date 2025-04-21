import clientPromise from "./mongodb";
import { logger } from "./logger";
import { ObjectId } from "mongodb";
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
        const client = await clientPromise;
        const db = client.db();

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

        // Get usage counts
        const dailyUsage = await db.collection('usageStats').countDocuments({
            userId,
            timestamp: { $gte: startOfDay }
        });

        const minuteUsage = await db.collection('usageStats').countDocuments({
            userId,
            timestamp: { $gte: startOfMinute }
        });

        // Calculate remaining
        const dailyRemaining = Math.max(0, userQuota.dailyLimit - dailyUsage);
        const minuteRemaining = Math.max(0, userQuota.minuteLimit - minuteUsage);

        // Check if user has exceeded limits
        if (dailyUsage >= userQuota.dailyLimit) {
            return {
                allowed: false,
                reason: 'daily_limit_exceeded',
                remaining: { daily: dailyRemaining, minute: minuteRemaining },
                resetTime: { daily: nextDay, minute: nextMinute }
            };
        }

        if (minuteUsage >= userQuota.minuteLimit) {
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
        const client = await clientPromise;
        const db = client.db();

        await db.collection('usageStats').insertOne({
            userId,
            videoId,
            timestamp: new Date(),
            action: 'summarize'
        });

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
        const client = await clientPromise;
        const db = client.db();

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // We don't actually delete the records, but tag them as reset
        const result = await db.collection('usageStats').updateMany(
            {
                userId,
                timestamp: { $gte: startOfDay },
                reset: { $ne: true }
            },
            {
                $set: { reset: true }
            }
        );

        logger.info('Manually reset daily limit for user', {
            userId,
            entriesReset: result.modifiedCount
        });

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
        const client = await clientPromise;
        const db = client.db();

        // Calculate cutoff date (e.g., 30 days ago)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - USAGE_RETENTION_DAYS);

        // Delete old records
        const result = await db.collection('usageStats').deleteMany({
            timestamp: { $lt: cutoffDate }
        });

        const deletedCount = result.deletedCount || 0;

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
        const client = await clientPromise;
        const db = client.db();

        const userTier = await getUserTier(userId);
        const userQuota = TIER_QUOTAS[userTier] || TIER_QUOTAS.free;

        // Get today's usage
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const dailyUsage = await db.collection('usageStats').countDocuments({
            userId,
            timestamp: { $gte: startOfDay },
            reset: { $ne: true }
        });

        // Calculate next reset time
        const nextReset = new Date(startOfDay);
        nextReset.setDate(nextReset.getDate() + 1);

        // Get usage history for the last 7 days
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 6); // Last 7 days including today
        startOfWeek.setHours(0, 0, 0, 0);

        const usageHistoryData = await db.collection('usageStats').aggregate([
            {
                $match: {
                    userId,
                    timestamp: { $gte: startOfWeek },
                    reset: { $ne: true }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$timestamp" },
                        month: { $month: "$timestamp" },
                        day: { $dayOfMonth: "$timestamp" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]).toArray();

        // Format usage history
        const usageHistory = usageHistoryData.map(item => {
            const date = new Date(item._id.year, item._id.month - 1, item._id.day);
            return {
                date: date.toISOString().split('T')[0], // YYYY-MM-DD format
                count: item.count
            };
        });

        return {
            dailyUsage,
            dailyLimit: userQuota.dailyLimit,
            dailyRemaining: Math.max(0, userQuota.dailyLimit - dailyUsage),
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

/**
 * Helper function to get a user's current tier
 */
async function getUserTier(userId: string): Promise<string> {
    try {
        const client = await clientPromise;
        const db = client.db();

        // Create a query that handles both ObjectId and string IDs
        let query;

        // Check if userId is in valid ObjectId format
        if (ObjectId.isValid(userId)) {
            query = { _id: new ObjectId(userId) };
        } else {
            // Fallback to using the string ID directly
            query = { id: userId };
        }

        const user = await db.collection('users').findOne(query);
        return user?.tier || 'free';
    } catch (error) {
        logger.error('Failed to get user tier', {
            userId,
            error: error instanceof Error ? error.message : String(error)
        });

        return 'free';
    }
}

/**
 * Setup a scheduled job to clean up old usage records
 * This can be called when the application starts
 */
export function setupRateLimitCleanupJob(): {
    initialTimeout: NodeJS.Timeout;
    scheduledInterval: NodeJS.Timeout | null;
} {
    // Run cleanup once a day at 2 AM UTC
    const msUntilNextRun = getMillisecondsUntil(2); // 2 AM
    let scheduledInterval: NodeJS.Timeout | null = null;

    // Set up initial timeout
    const initialTimeout = setTimeout(() => {
        // Run first cleanup
        cleanupOldUsageRecords();

        // Then set it up to run daily
        scheduledInterval = setInterval(() => {
            cleanupOldUsageRecords();
        }, 24 * 60 * 60 * 1000); // 24 hours

    }, msUntilNextRun);

    return { initialTimeout, scheduledInterval };
}

/**
 * Helper function to calculate milliseconds until a specific hour UTC
 */
function getMillisecondsUntil(hour: number): number {
    const now = new Date();
    const target = new Date(now);

    target.setUTCHours(hour, 0, 0, 0);

    // If the target time has already passed today, set for tomorrow
    if (target <= now) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
}