import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import { supabaseAdmin } from '@/lib/supabase';
import { PRICE_IDS } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';

function getTierFromPriceId(priceId?: string): string {
    const map = {
        [PRICE_IDS.pro.monthly]: 'pro',
        [PRICE_IDS.pro.yearly]: 'pro',
        [PRICE_IDS.max.monthly]: 'max',
        [PRICE_IDS.max.yearly]: 'max',
    };
    return map[priceId || ''] || 'free';
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    try {

        logger.info('check status route requested', {
            method: req.method
        });

        // Get user subscription data from Supabase
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('tier, stripe_subscription_id, stripe_customer_id')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Error getting user subscription data:', error);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch subscription data'
            }, { status: 500 });
        }

        // If user has no subscription, return free tier
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

            // Get the subscription item to access period data
            const subscriptionItem = subscription.items.data[0];

            const priceId = subscriptionItem?.price.id;
            const tier = getTierFromPriceId(priceId);

            // Get period data from the subscription item
            const currentPeriodEnd = subscriptionItem?.current_period_end
                ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
                : null;

            const currentPeriodStart = subscriptionItem?.current_period_start
                ? new Date(subscriptionItem.current_period_start * 1000).toISOString()
                : null;

            // Determine interval from the plan
            const interval = subscriptionItem?.plan.interval || null;

            return NextResponse.json({
                success: true,
                tier: tier,
                status: subscription.status,
                subscriptionId: subscription.id,
                currentPeriodEnd: currentPeriodEnd,
                currentPeriodStart: currentPeriodStart,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                interval: interval
            });
        } catch (stripeError) {
            console.error('Error fetching Stripe subscription:', stripeError);

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
        console.error('check-status error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Missing session ID' }, { status: 400 });
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

    if (checkoutSession.status !== 'complete') {
        return NextResponse.json({ success: false, error: 'Payment not completed' }, { status: 400 });
    }

    const subscription = checkoutSession.subscription as Stripe.Subscription;
    const priceId = subscription.items.data[0]?.price.id;
    const tier = getTierFromPriceId(priceId);

    const updates = {
        tier,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        subscription_status: subscription.status,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', session.user.id);

    if (error) {
        return NextResponse.json({ success: false, error: 'Failed to update user subscription' }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        tier,
        subscriptionId: subscription.id,
    });
}
