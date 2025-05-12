// lib/rateLimiter.ts
import { supabaseAdmin } from "./supabase";
import { logger } from "./logger";

// Global usage quotas for API rate limits (separate from credits)
const USAGE_QUOTAS = {
    // Requests per minute - to prevent abuse
    minuteLimit: 5
};

// Free tier settings
const FREE_CREDITS = 3;
const FREE_CREDIT_PERIOD_DAYS = 30;

// Cleanup retention period in days
const USAGE_RETENTION_DAYS = 30;

/**
 * Check if the user has sufficient credits for the requested operation
 */
export async function checkCreditAvailability(userId: string, requiredCredits: number = 1): Promise<{
    allowed: boolean;
    reason?: string;
    remaining: number;
    requiresUpgrade?: boolean;
}> {
    try {
        const now = new Date();

        // Get user's credit balance
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('credit_balance, free_tier_used, last_credit_reset')
            .eq('id', userId)
            .single();

        if (userError) {
            throw userError;
        }

        // Initialize credit balance if not set
        let creditBalance = user.credit_balance || 0;

        // Check if free credits should be applied
        if (!user.free_tier_used || shouldResetFreeCredits(user.last_credit_reset)) {
            const { creditBalance: updatedBalance, wasReset } = await handleFreeCredits(
                userId,
                creditBalance,
                user.free_tier_used,
                user.last_credit_reset
            );

            creditBalance = updatedBalance;

            if (wasReset) {
                // Update the return value since we just added free credits
                logger.info('Free credits reset applied', { userId, newBalance: creditBalance });
            }
        }

        // Check if sufficient credits
        if (creditBalance < requiredCredits) {
            logger.info('Insufficient credits', {
                userId,
                required: requiredCredits,
                available: creditBalance
            });

            return {
                allowed: false,
                reason: 'insufficient_credits',
                remaining: creditBalance,
                requiresUpgrade: true
            };
        }

        // Check minute rate limit to prevent abuse
        const startOfMinute = new Date(now);
        startOfMinute.setSeconds(0, 0);

        const { count: minuteUsage, error: minuteError } = await supabaseAdmin
            .from('usage_stats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('timestamp', startOfMinute.toISOString())
            .eq('reset', false);

        if (minuteError) {
            throw minuteError;
        }

        if ((minuteUsage || 0) >= USAGE_QUOTAS.minuteLimit) {
            return {
                allowed: false,
                reason: 'rate_limit_exceeded',
                remaining: creditBalance
            };
        }

        return {
            allowed: true,
            remaining: creditBalance
        };
    } catch (error) {
        logger.error('Failed to check credit availability', {
            userId,
            error: error instanceof Error ? error.message : String(error)
        });

        // In case of error, allow the request but log it
        return { allowed: true, remaining: 0 };
    }
}

/**
 * Determine if free credits should be reset based on last reset date
 */
function shouldResetFreeCredits(lastReset: string | null): boolean {
    if (!lastReset) return true;

    const now = new Date();
    const resetDate = new Date(lastReset);
    const daysSinceReset = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysSinceReset >= FREE_CREDIT_PERIOD_DAYS;
}

/**
 * Handle the assignment of free credits to users
 */
async function handleFreeCredits(
    userId: string,
    currentBalance: number,
    freeTierUsed: boolean,
    lastReset: string | null
): Promise<{ creditBalance: number, wasReset: boolean }> {
    try {
        const now = new Date();
        let wasReset = false;

        // First-time user or eligible for reset
        if (!freeTierUsed || shouldResetFreeCredits(lastReset)) {
            // Add free credits
            const { error: creditError } = await supabaseAdmin
                .from('credits')
                .insert({
                    user_id: userId,
                    amount: FREE_CREDITS,
                    description: freeTierUsed
                        ? `Monthly free ${FREE_CREDITS} credits reset`
                        : `Welcome! ${FREE_CREDITS} free credits`,
                    created_at: now.toISOString(),
                });

            if (creditError) {
                throw creditError;
            }

            // Update user's free tier status and balance directly
            const newBalance = currentBalance + FREE_CREDITS;
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    free_tier_used: true,
                    last_credit_reset: now.toISOString(),
                    credit_balance: newBalance,
                    updated_at: now.toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                throw updateError;
            }

            wasReset = true;
            return { creditBalance: newBalance, wasReset };
        }

        return { creditBalance: currentBalance, wasReset };
    } catch (error) {
        logger.error('Failed to handle free credits', {
            userId,
            error: error instanceof Error ? error.message : String(error)
        });

        // Return original balance if something went wrong
        return { creditBalance: currentBalance, wasReset: false };
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