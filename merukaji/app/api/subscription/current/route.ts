import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    logger.info('subscription route requested', {
        method: req.method
    });

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('tier, subscription_status, stripe_subscription_id')
        .eq('id', session.user.id)
        .single();

    if (error || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('billing_cycle')
        .eq('id', user.stripe_subscription_id)
        .single();

    return NextResponse.json({
        tier: user.tier,
        status: user.subscription_status,
        subscriptionId: user.stripe_subscription_id,
        billingCycle: subscription?.billing_cycle || null
    });
}
