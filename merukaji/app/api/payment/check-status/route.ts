import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import { supabaseAdmin } from '@/lib/supabase';
import { PRICE_IDS } from '@/lib/stripe';
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
