// app/api/payment/check-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { PRICE_IDS } from '@/lib/stripe';

// GET handler for fetching subscription status
export async function GET(req: NextRequest) {
    try {
        logger.info('Subscription status requested', {
            method: req.method
        });

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db();

        // Get user's subscription details
        const user = await db.collection('users').findOne({ email: session.user.email });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Return basic info if no subscription
        if (!user.stripeSubscriptionId) {
            return NextResponse.json({
                tier: user.tier || 'free',
                status: null,
                subscription: null
            });
        }

        try {
            // Fetch subscription details from Stripe
            const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

            // Get the subscription item data (first item)
            const subscriptionItem = subscription.items.data[0];

            return NextResponse.json({
                tier: user.tier || 'free',
                status: subscription.status,
                currentPeriodEnd: subscriptionItem.current_period_end
                    ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
                    : null,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                // Get the billing interval from the plan
                interval: subscriptionItem?.plan?.interval || 'month',
                // Get the amount from the plan
                amount: subscriptionItem?.plan?.amount
                    ? subscriptionItem.plan.amount / 100
                    : 0,
                created: subscription.created
                    ? new Date(subscription.created * 1000).toISOString()
                    : null
            });
        } catch (stripeError) {
            logger.error('Failed to fetch stripe subscription details', {
                userId: user.id,
                subscriptionId: user.stripeSubscriptionId,
                error: stripeError instanceof Error ? stripeError.message : String(stripeError)
            });

            // Return basic info with user tier if Stripe API fails
            return NextResponse.json({
                tier: user.tier || 'free',
                status: user.subscriptionStatus || null,
                subscription: null,
                error: 'Failed to fetch complete subscription details'
            });
        }
    } catch (error) {
        logger.error('Error fetching subscription details:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            error: 'Failed to fetch subscription details'
        }, { status: 500 });
    }
}

// POST handler for checking subscription status after checkout
export async function POST(req: NextRequest) {
    try {
        // Get current user from session
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            logger.warn('Unauthorized status check attempt');
            return NextResponse.json({
                success: false,
                error: 'Not authenticated'
            }, { status: 401 });
        }

        const { sessionId } = await req.json();

        if (!sessionId) {
            logger.error('Missing sessionId in check-status request');
            return NextResponse.json({
                success: false,
                error: 'Missing session ID'
            }, { status: 400 });
        }

        // Get the checkout session from Stripe
        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription']
        });

        logger.info('Retrieved checkout session', {
            sessionId,
            status: checkoutSession.status,
            subscriptionId: checkoutSession.subscription ?
                (typeof checkoutSession.subscription === 'string' ?
                    checkoutSession.subscription :
                    checkoutSession.subscription.id) :
                undefined
        });

        if (checkoutSession.status !== 'complete') {
            return NextResponse.json({
                success: false,
                error: 'Payment not completed'
            }, { status: 400 });
        }

        // Make sure we have access to the subscription object
        if (!checkoutSession.subscription) {
            return NextResponse.json({
                success: false,
                error: 'No subscription found in session'
            }, { status: 400 });
        }

        // If subscription is a string ID, we need to retrieve it
        if (typeof checkoutSession.subscription === 'string') {
            const subscriptionId = checkoutSession.subscription;

            // Fetch the subscription
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            // Determine the tier based on the Price ID
            const priceId = subscription.items.data[0]?.price.id;
            const tier = getTierFromPriceId(priceId);

            // Update user in database
            const client = await clientPromise;
            const db = client.db();

            await db.collection('users').updateOne(
                { email: session.user.email },
                {
                    $set: {
                        tier,
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: subscription.customer as string,
                        subscriptionStatus: subscription.status,
                        updatedAt: new Date()
                    },
                }
            );

            logger.info('User tier updated after payment', {
                userId: session.user.id,
                email: session.user.email,
                tier,
                subscriptionId: subscription.id
            });

            return NextResponse.json({
                success: true,
                tier,
                subscriptionId: subscription.id
            });
        } else {
            // We already have the expanded subscription object
            const subscription = checkoutSession.subscription;

            // Determine the tier based on the Price ID
            const priceId = subscription.items.data[0]?.price.id;
            const tier = getTierFromPriceId(priceId);

            // Update user in database
            const client = await clientPromise;
            const db = client.db();

            await db.collection('users').updateOne(
                { email: session.user.email },
                {
                    $set: {
                        tier,
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: subscription.customer as string,
                        subscriptionStatus: subscription.status,
                        updatedAt: new Date()
                    },
                }
            );

            logger.info('User tier updated after payment', {
                userId: session.user.id,
                email: session.user.email,
                tier,
                subscriptionId: subscription.id
            });

            return NextResponse.json({
                success: true,
                tier,
                subscriptionId: subscription.id
            });
        }
    } catch (error) {
        logger.error('Error checking subscription status', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            success: false,
            error: 'Failed to verify subscription status'
        }, { status: 500 });
    }
}

// Helper function to determine tier from price ID
function getTierFromPriceId(priceId: string | undefined): string {
    if (!priceId) return 'free';

    const tierMap: { [key: string]: string } = {
        [PRICE_IDS.pro.monthly]: 'pro',
        [PRICE_IDS.pro.yearly]: 'pro',
        [PRICE_IDS.max.monthly]: 'max',
        [PRICE_IDS.max.yearly]: 'max',
    };

    return tierMap[priceId] || 'free';
}