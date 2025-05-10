// app/api/credits/balance/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get user's credit balance and free tier status
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('credit_balance, free_tier_used, last_credit_reset')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            logger.error('Failed to fetch credit balance', {
                userId: session.user.id,
                error: userError.message
            });
            return NextResponse.json({ error: 'Failed to fetch credit balance' }, { status: 500 });
        }

        // Get user's daily usage
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: dailyUsage, error: usageError } = await supabaseAdmin
            .from('usage_stats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .gte('timestamp', today.toISOString())
            .eq('reset', false);

        if (usageError) {
            logger.error('Failed to fetch daily usage', {
                userId: session.user.id,
                error: usageError.message
            });
            // Continue anyway, this is not critical
        }

        // Calculate when free credits reset (if applicable)
        let nextReset = null;
        if (user.last_credit_reset) {
            const lastReset = new Date(user.last_credit_reset);
            nextReset = new Date(lastReset);
            nextReset.setDate(lastReset.getDate() + 30); // Assuming 30-day cycle for free credits
        }

        return NextResponse.json({
            success: true,
            balance: user.credit_balance || 0,
            freeTierUsed: user.free_tier_used || false,
            dailyUsage: dailyUsage || 0,
            nextReset: nextReset,
        });
    } catch (error) {
        logger.error('Failed to get credit balance', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'An error occurred while fetching your credit balance'
        }, { status: 500 });
    }
}