import clientPromise from "./mongodb";
import { logger } from "./logger";

interface UsageQuota {
    tier: string;
    dailyLimit: number;
    minuteLimit: number;
}

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

/**
 * Check if the user has exceeded their rate limits
 */
export async function checkRateLimit(userId: string, tier: string = 'free'): Promise<{
    allowed: boolean;
    reason?: string;
    remaining: { daily: number; minute: number; }
}> {
    try {
        const client = await clientPromise;
        const db = client.db();

        const userQuota = TIER_QUOTAS[tier] || TIER_QUOTAS.free;
        const now = new Date();

        // Get the start of the current day in user's timezone (simplified to UTC)
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        // Get the start of the current minute
        const startOfMinute = new Date(now);
        startOfMinute.setSeconds(0, 0);

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
                remaining: { daily: dailyRemaining, minute: minuteRemaining }
            };
        }

        if (minuteUsage >= userQuota.minuteLimit) {
            return {
                allowed: false,
                reason: 'minute_limit_exceeded',
                remaining: { daily: dailyRemaining, minute: minuteRemaining }
            };
        }

        return {
            allowed: true,
            remaining: { daily: dailyRemaining, minute: minuteRemaining }
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