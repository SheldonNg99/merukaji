import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('stripe_customer_id')
        .eq('id', session.user.id)
        .single();

    if (!user?.stripe_customer_id) {
        return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${baseUrl}/settings`
    });

    return NextResponse.json({ url: portalSession.url });
}
