import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getSubscription } from '@/lib/paypal-server';
import { supabaseAdmin } from '@/lib/supabase';
import { PRICE_IDS } from '@/lib/paypal-client';
import { logger } from '@/lib/logger';

function getTierFromPlanId(planId?: string): string {
    if (!planId) return 'free';

    logger.info('Determining tier from plan ID', {
        planId,
        knownPlanIds: {
            proMonthly: process.env.NEXT_PUBLIC_PAYPAL_PRO_MONTHLY_PLAN_ID,
            proYearly: process.env.NEXT_PUBLIC_PAYPAL_PRO_YEARLY_PLAN_ID,
            maxMonthly: process.env.NEXT_PUBLIC_PAYPAL_MAX_MONTHLY_PLAN_ID,
            maxYearly: process.env.NEXT_PUBLIC_PAYPAL_MAX_YEARLY_PLAN_ID
        }
    });

    const map: Record<string, string> = {
        [process.env.NEXT_PUBLIC_PAYPAL_PRO_MONTHLY_PLAN_ID || '']: 'pro',
        [process.env.NEXT_PUBLIC_PAYPAL_PRO_YEARLY_PLAN_ID || '']: 'pro',
        [process.env.NEXT_PUBLIC_PAYPAL_MAX_MONTHLY_PLAN_ID || '']: 'max',
        [process.env.NEXT_PUBLIC_PAYPAL_MAX_YEARLY_PLAN_ID || '']: 'max',
    };

    const tier = map[planId] || 'free';
    logger.info('Tier determination result', { planId, determinedTier: tier });

    return tier;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        logger.info('check status route requested', {
            method: req.method,
            userId: session.user.id
        });

        // Get user subscription data from Supabase
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('tier, paypal_subscription_id, email')
            .eq('id', session.user.id)
            .single();

        if (error) {
            logger.error('Error getting user subscription data:', { error: error.message });
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch subscription data'
            }, { status: 500 });
        }

        // If user has no subscription, return database tier
        if (!user.paypal_subscription_id) {
            return NextResponse.json({
                success: true,
                tier: user.tier || 'free',
                status: null,
                subscriptionId: null,
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false
            });
        }

        // Fetch subscription details from PayPal
        try {
            const subscription = await getSubscription(user.paypal_subscription_id);

            if (!subscription) {
                return NextResponse.json({
                    success: true,
                    tier: user.tier || 'free',
                    status: 'unknown',
                    subscriptionId: user.paypal_subscription_id,
                    errorDetails: 'Subscription exists but could not be retrieved'
                });
            }

            // Get the plan ID
            const planId = subscription.plan_id;
            const tier = getTierFromPlanId(planId);

            // Get billing details from subscription
            const currentPeriodEnd = subscription.billing_info?.next_billing_time || null;
            const currentPeriodStart = subscription.start_time || null;

            // Determine interval from the plan
            const interval = subscription.plan?.billing_cycles?.[0]?.frequency?.interval_unit || null;

            return NextResponse.json({
                success: true,
                tier,
                status: subscription.status.toLowerCase(),
                subscriptionId: subscription.id,
                currentPeriodEnd,
                currentPeriodStart,
                cancelAtPeriodEnd: subscription.status === 'SUSPENDED',
                interval: interval === 'YEAR' ? 'year' : 'month'
            });
        } catch (err) {
            logger.error('Error fetching PayPal subscription:', {
                error: err instanceof Error ? err.message : String(err)
            });

            // Still return user data from database if PayPal API fails
            return NextResponse.json({
                success: true,
                tier: user.tier || 'free',
                status: 'unknown',
                subscriptionId: user.paypal_subscription_id,
                errorDetails: 'Could not fetch current subscription details from PayPal'
            });
        }
    } catch (err) {
        logger.error('check-status error:', {
            error: err instanceof Error ? err.message : String(err)
        });

        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { subscriptionId } = body;

        if (!subscriptionId) {
            return NextResponse.json({ success: false, error: 'Missing subscription ID' }, { status: 400 });
        }

        try {
            logger.info('Processing PayPal subscription', { subscriptionId });

            const subscription = await getSubscription(subscriptionId);

            if (subscription.status !== 'ACTIVE') {
                return NextResponse.json({ success: false, error: 'Payment not completed' }, { status: 400 });
            }

            logger.info('PayPal subscription retrieved', {
                status: subscription.status
            });

            // Determine tier from planId
            const planId = subscription.plan_id;
            let tier = 'free';

            if (planId === PRICE_IDS.pro.monthly || planId === PRICE_IDS.pro.yearly) {
                tier = 'pro';
            } else if (planId === PRICE_IDS.max.monthly || planId === PRICE_IDS.max.yearly) {
                tier = 'max';
            } else {
                // If we can't determine the tier, log it and default to pro
                logger.warn('Could not determine tier from plan ID', { planId });
                tier = 'pro'; // Default to pro if we can't determine tier
            }

            logger.info('Determined tier', { tier });

            const updates = {
                tier,
                paypal_subscription_id: subscription.id,
                subscription_status: subscription.status,
                updated_at: new Date().toISOString(),
            };

            logger.info('Updating user with subscription data', {
                userId: session.user.id,
                updates
            });

            const { error } = await supabaseAdmin
                .from('users')
                .update(updates)
                .eq('id', session.user.id);

            if (error) {
                logger.error('Failed to update user subscription:', { error: error.message });
                return NextResponse.json({
                    success: false,
                    error: 'Failed to update user subscription'
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                tier,
                subscriptionId: subscription.id,
            });

        } catch (err) {
            logger.error('Error with PayPal subscription:', {
                error: err instanceof Error ? err.message : String(err),
                subscriptionId
            });

            return NextResponse.json({
                success: false,
                error: 'Error processing payment information'
            }, { status: 500 });
        }
    } catch (err) {
        logger.error('check-status POST error:', {
            error: err instanceof Error ? err.message : String(err)
        });

        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}