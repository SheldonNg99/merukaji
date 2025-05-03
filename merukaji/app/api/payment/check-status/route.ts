import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import { supabaseAdmin } from '@/lib/supabase';
import { PRICE_IDS } from '@/lib/stripe';
import { logger } from '@/lib/logger';

// Helper function with improved logging
function getTierFromPriceId(priceId?: string): string {
    if (!priceId) return 'free';

    logger.info('Determining tier from price ID', {
        priceId,
        knownPriceIds: {
            proMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
            proYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
            maxMonthly: process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY_PRICE_ID,
            maxYearly: process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY_PRICE_ID
        }
    });

    const map: Record<string, string> = {
        [process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '']: 'pro',
        [process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '']: 'pro',
        [process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY_PRICE_ID || '']: 'max',
        [process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY_PRICE_ID || '']: 'max',
    };

    const tier = map[priceId] || 'free';
    logger.info('Tier determination result', { priceId, determinedTier: tier });

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
            .select('tier, stripe_subscription_id, stripe_customer_id')
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
        if (!user.stripe_subscription_id) {
            return NextResponse.json({
                success: true,
                tier: user.tier || 'free',
                status: null,
                subscriptionId: null,
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false
            });
        }

        // Fetch subscription details from Stripe
        try {
            const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

            // Check if the subscription has items
            if (!subscription?.items?.data?.length) {
                return NextResponse.json({
                    success: true,
                    tier: user.tier || 'free',
                    status: 'unknown',
                    subscriptionId: user.stripe_subscription_id,
                    errorDetails: 'Subscription exists but has no items'
                });
            }

            // Get the subscription item to access period data
            const subscriptionItem = subscription.items.data[0];

            const priceId = subscriptionItem?.price?.id;
            const tier = getTierFromPriceId(priceId);

            // Get period data from the subscription item
            const currentPeriodEnd = subscriptionItem?.current_period_end
                ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
                : null;

            const currentPeriodStart = subscriptionItem?.current_period_start
                ? new Date(subscriptionItem.current_period_start * 1000).toISOString()
                : null;

            // Determine interval from the plan
            const interval = subscriptionItem?.plan?.interval || null;

            return NextResponse.json({
                success: true,
                tier,
                status: subscription.status,
                subscriptionId: subscription.id,
                currentPeriodEnd,
                currentPeriodStart,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                interval
            });
        } catch (stripeError) {
            logger.error('Error fetching Stripe subscription:', {
                error: stripeError instanceof Error ? stripeError.message : String(stripeError)
            });

            // Still return user data from database if Stripe API fails
            return NextResponse.json({
                success: true,
                tier: user.tier || 'free',
                status: 'unknown',
                subscriptionId: user.stripe_subscription_id,
                errorDetails: 'Could not fetch current subscription details from Stripe'
            });
        }
    } catch (error) {
        logger.error('check-status error:', {
            error: error instanceof Error ? error.message : String(error)
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
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ success: false, error: 'Missing session ID' }, { status: 400 });
        }

        try {
            logger.info('Processing checkout session', { sessionId });

            const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['subscription', 'subscription.items.data.price']
            });

            if (checkoutSession.status !== 'complete') {
                return NextResponse.json({ success: false, error: 'Payment not completed' }, { status: 400 });
            }

            logger.info('Checkout session retrieved', {
                status: checkoutSession.status,
                hasSubscription: !!checkoutSession.subscription
            });

            if (!checkoutSession.subscription) {
                return NextResponse.json({
                    success: false,
                    error: 'No subscription found in checkout session'
                }, { status: 400 });
            }

            const subscription = typeof checkoutSession.subscription === 'string'
                ? await stripe.subscriptions.retrieve(checkoutSession.subscription)
                : checkoutSession.subscription;

            logger.info('Subscription details', {
                id: subscription.id,
                status: subscription.status,
                hasItems: subscription.items.data.length > 0
            });

            if (!subscription?.items?.data?.length) {
                return NextResponse.json({
                    success: false,
                    error: 'Subscription exists but has no items'
                }, { status: 400 });
            }

            const priceId = subscription.items.data[0]?.price?.id;
            logger.info('Price ID from subscription', { priceId });

            // Determine tier from priceId
            let tier = 'free';

            if (priceId === PRICE_IDS.pro.monthly || priceId === PRICE_IDS.pro.yearly) {
                tier = 'pro';
            } else if (priceId === PRICE_IDS.max.monthly || priceId === PRICE_IDS.max.yearly) {
                tier = 'max';
            } else {
                // If we can't determine the tier, log it and default to pro
                logger.warn('Could not determine tier from price ID', { priceId });
                tier = 'pro'; // Default to pro if we can't determine tier
            }

            logger.info('Determined tier', { tier });

            const updates = {
                tier,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: subscription.customer as string,
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

        } catch (stripeError) {
            logger.error('Error with Stripe checkout session:', {
                error: stripeError instanceof Error ? stripeError.message : String(stripeError),
                sessionId
            });

            return NextResponse.json({
                success: false,
                error: 'Error processing payment information'
            }, { status: 500 });
        }
    } catch (error) {
        logger.error('check-status POST error:', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}