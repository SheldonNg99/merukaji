import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import clientPromise from '@/lib/mongodb';
import Stripe from 'stripe';

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
        return NextResponse.json({ error: err }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

                // Update user tier based on subscription
                const tierMap: { [key: string]: string } = {
                    [PRICE_IDS.pro.monthly]: 'pro',
                    [PRICE_IDS.pro.yearly]: 'pro',
                    [PRICE_IDS.max.monthly]: 'max',
                    [PRICE_IDS.max.yearly]: 'max',
                };

                const tier = tierMap[subscription.items.data[0].price.id] || 'free';

                await db.collection('users').updateOne(
                    { email: session.customer_email },
                    {
                        $set: {
                            tier,
                            stripeSubscriptionId: subscription.id,
                            stripeCustomerId: session.customer,
                            subscriptionStatus: subscription.status,
                        },
                    }
                );

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
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const status = subscription.status;
                const tier = status === 'active' ? getTierFromPriceId(subscription.items.data[0].price.id) : 'free';

                await db.collection('users').updateOne(
                    { stripeSubscriptionId: subscription.id },
                    {
                        $set: {
                            tier,
                            subscriptionStatus: status,
                        },
                    }
                );
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
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