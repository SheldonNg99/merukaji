// app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { PRICE_IDS } from '@/lib/stripe-client';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        logger.error('❌ Webhook signature verification failed:', {
            error: err instanceof Error ? err.message : String(err)
        });
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    // Log the incoming event
    logger.info('🔔 Webhook received:', {
        eventType: event.type,
        eventId: event.id
    });

    const client = await clientPromise;
    const db = client.db();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;

                // Debug logging
                logger.info('📝 Checkout session completed:', {
                    sessionId: session.id,
                    customerEmail: session.customer_email,
                    customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
                    subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
                });

                if (!session.subscription) {
                    logger.warn('No subscription found in completed checkout session', {
                        sessionId: session.id
                    });
                    return NextResponse.json({ received: true });
                }

                const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

                // Log subscription details
                logger.info('💰 Subscription details:', {
                    subscriptionId: subscription.id,
                    status: subscription.status,
                    priceId: subscription.items.data[0].price.id,
                    productId: typeof subscription.items.data[0].price.product === 'string'
                        ? subscription.items.data[0].price.product
                        : subscription.items.data[0].price.product?.id
                });

                // Log the price ID mapping for debugging
                logger.info('🗺️ Price ID mapping:', {
                    receivedPriceId: subscription.items.data[0].price.id,
                    priceIDs: PRICE_IDS,
                    proMonthly: PRICE_IDS.pro.monthly,
                    proYearly: PRICE_IDS.pro.yearly,
                    maxMonthly: PRICE_IDS.max.monthly,
                    maxYearly: PRICE_IDS.max.yearly
                });

                // Update user tier based on subscription
                const tierMap: { [key: string]: string } = {
                    [PRICE_IDS.pro.monthly]: 'pro',
                    [PRICE_IDS.pro.yearly]: 'pro',
                    [PRICE_IDS.max.monthly]: 'max',
                    [PRICE_IDS.max.yearly]: 'max',
                };

                const tier = tierMap[subscription.items.data[0].price.id] || 'free';

                // Log the tier determination
                logger.info('🎯 Tier determination:', {
                    priceId: subscription.items.data[0].price.id,
                    mappedTier: tier,
                    tierMap: tierMap
                });

                // Try multiple methods to find and update the user
                let updateResult = { matchedCount: 0, modifiedCount: 0 };

                // 1. First try to find and update user by email
                if (session.customer_email) {
                    updateResult = await db.collection('users').updateOne(
                        { email: session.customer_email },
                        {
                            $set: {
                                tier,
                                stripeSubscriptionId: subscription.id,
                                stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
                                subscriptionStatus: subscription.status,
                                updatedAt: new Date()
                            },
                        }
                    );

                    logger.info('📊 Database update result by email:', {
                        matched: updateResult.matchedCount,
                        modified: updateResult.modifiedCount,
                        email: session.customer_email
                    });
                }

                // 2. If email update didn't work, try by userId from metadata
                if (updateResult.matchedCount === 0 && session.metadata?.userId) {
                    logger.info('Trying to update user by userId from metadata', {
                        userId: session.metadata.userId
                    });

                    type UserQuery =
                        { _id: ObjectId } |
                        { id: string };

                    let query: UserQuery;
                    if (ObjectId.isValid(session.metadata.userId)) {
                        query = { _id: new ObjectId(session.metadata.userId) };
                    } else {
                        query = { id: session.metadata.userId };
                    }

                    updateResult = await db.collection('users').updateOne(
                        query,
                        {
                            $set: {
                                tier,
                                stripeSubscriptionId: subscription.id,
                                stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
                                subscriptionStatus: subscription.status,
                                updatedAt: new Date()
                            },
                        }
                    );

                    logger.info('📊 Database update result by userId:', {
                        matched: updateResult.matchedCount,
                        modified: updateResult.modifiedCount,
                        userId: session.metadata.userId
                    });
                }

                // 3. If still not found, try by customer ID
                if (updateResult.matchedCount === 0 && session.customer) {
                    const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;

                    logger.info('Trying to update user by Stripe customerId', {
                        customerId
                    });

                    updateResult = await db.collection('users').updateOne(
                        { stripeCustomerId: customerId },
                        {
                            $set: {
                                tier,
                                stripeSubscriptionId: subscription.id,
                                subscriptionStatus: subscription.status,
                                updatedAt: new Date()
                            },
                        }
                    );

                    logger.info('📊 Database update result by customerId:', {
                        matched: updateResult.matchedCount,
                        modified: updateResult.modifiedCount,
                        customerId
                    });
                }

                // Log if we couldn't find the user
                if (updateResult.matchedCount === 0) {
                    logger.error('❌ Could not find user by any identifier', {
                        email: session.customer_email,
                        userId: session.metadata?.userId,
                        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id
                    });
                }

                // Record transaction
                await db.collection('transactions').insertOne({
                    userId: session.metadata?.userId,
                    subscriptionId: subscription.id,
                    priceId: subscription.items.data[0].price.id,
                    amount: session.amount_total,
                    currency: session.currency,
                    status: 'completed',
                    stripePaymentIntentId: session.payment_intent,
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: subscription.id,
                    createdAt: new Date(),
                });

                logger.info('✅ Transaction recorded successfully');
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;

                logger.info('🔄 Subscription updated/deleted:', {
                    subscriptionId: subscription.id,
                    status: subscription.status,
                    priceId: subscription.items.data[0].price.id
                });

                const status = subscription.status;
                const tier = status === 'active' ? getTierFromPriceId(subscription.items.data[0].price.id) : 'free';

                // Try by subscriptionId first
                const updateBySubscriptionResult = await db.collection('users').updateOne(
                    { stripeSubscriptionId: subscription.id },
                    {
                        $set: {
                            tier,
                            subscriptionStatus: status,
                            updatedAt: new Date()
                        },
                    }
                );

                logger.info('📊 Database update result by subscriptionId:', {
                    matched: updateBySubscriptionResult.matchedCount,
                    modified: updateBySubscriptionResult.modifiedCount,
                    subscriptionId: subscription.id
                });

                // If no user found by subscription ID, try by customer ID
                if (updateBySubscriptionResult.matchedCount === 0 && subscription.customer) {
                    const customerId = typeof subscription.customer === 'string' ?
                        subscription.customer : subscription.customer.id;

                    const updateByCustomerResult = await db.collection('users').updateOne(
                        { stripeCustomerId: customerId },
                        {
                            $set: {
                                tier,
                                subscriptionStatus: status,
                                stripeSubscriptionId: subscription.id,
                                updatedAt: new Date()
                            },
                        }
                    );

                    logger.info('📊 Database update result by customerId:', {
                        matched: updateByCustomerResult.matchedCount,
                        modified: updateByCustomerResult.modifiedCount,
                        customerId
                    });

                    if (updateByCustomerResult.matchedCount === 0) {
                        logger.error('❌ Could not find user for subscription update:', {
                            subscriptionId: subscription.id,
                            customerId
                        });
                    }
                }

                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        logger.error('❌ Webhook handler failed:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}

function getTierFromPriceId(priceId: string): string {
    const tierMap: { [key: string]: string } = {
        [PRICE_IDS.pro.monthly]: 'pro',
        [PRICE_IDS.pro.yearly]: 'pro',
        [PRICE_IDS.max.monthly]: 'max',
        [PRICE_IDS.max.yearly]: 'max',
    };
    return tierMap[priceId] || 'free';
}