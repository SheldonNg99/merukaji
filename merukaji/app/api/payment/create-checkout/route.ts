import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { priceId } = await req.json();
    if (!priceId?.startsWith('price_')) return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('stripe_customer_id')
        .eq('id', session.user.id)
        .single();

    let stripeCustomerId = user?.stripe_customer_id;

    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({ email: session.user.email!, metadata: { userId: session.user.id } });
        stripeCustomerId = customer.id;

        await supabaseAdmin
            .from('users')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', session.user.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/upgrade?canceled=true`,
        metadata: { userId: session.user.id }
    });

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
}
