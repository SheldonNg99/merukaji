import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { PRICE_IDS } from '@/lib/stripe-client';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

function getTierFromPriceId(priceId: string): string {
    const map = {
        [PRICE_IDS.pro.monthly]: 'pro',
        [PRICE_IDS.pro.yearly]: 'pro',
        [PRICE_IDS.max.monthly]: 'max',
        [PRICE_IDS.max.yearly]: 'max',
    };
    return map[priceId] || 'free';
}

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error('Webhook failed:', err.message);
        } else {
            console.error('Webhook failed:', err);
        }
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;

            if (!session.subscription) return NextResponse.json({ received: true });

            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const priceId = subscription.items.data[0].price.id;
            const tier = getTierFromPriceId(priceId);
            const customerId = session.customer as string;

            // Update user
            await supabaseAdmin
                .from('users')
                .update({
                    tier,
                    stripe_subscription_id: subscription.id,
                    stripe_customer_id: customerId,
                    subscription_status: subscription.status,
                    updated_at: new Date().toISOString(),
                })
                .eq('stripe_customer_id', customerId);

            // Record transaction
            await supabaseAdmin.from('transactions').insert({
                user_id: session.metadata?.userId || null,
                subscription_id: subscription.id,
                price_id: priceId,
                amount: session.amount_total,
                currency: session.currency,
                status: 'completed',
                stripe_payment_intent_id: session.payment_intent,
                stripe_customer_id: customerId,
                created_at: new Date().toISOString(),
            });

        } else if (
            event.type === 'customer.subscription.updated' ||
            event.type === 'customer.subscription.deleted'
        ) {
            const subscription = event.data.object as Stripe.Subscription;
            const tier = subscription.status === 'active'
                ? getTierFromPriceId(subscription.items.data[0].price.id)
                : 'free';

            await supabaseAdmin
                .from('users')
                .update({
                    tier,
                    subscription_status: subscription.status,
                    updated_at: new Date().toISOString(),
                })
                .eq('stripe_subscription_id', subscription.id);
        }

        return NextResponse.json({ received: true });
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error('Webhook failed:', err.message);
        } else {
            console.error('Webhook failed:', err);
        }

        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
