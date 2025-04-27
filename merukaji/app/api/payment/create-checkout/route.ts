import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { priceId } = await req.json();

        // Validate the price ID
        const validPriceIds = Object.values(PRICE_IDS).flatMap(Object.values);
        if (!validPriceIds.includes(priceId)) {
            return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
        }

        // Create or retrieve Stripe customer
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne({ email: session.user.email });

        let stripeCustomerId = user?.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: session.user.email!,
                metadata: {
                    userId: session.user.id,
                },
            });
            stripeCustomerId = customer.id;

            // Save Stripe customer ID to user record
            await db.collection('users').updateOne(
                { email: session.user.email },
                { $set: { stripeCustomerId } }
            );
        }

        // Create checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?canceled=true`,
            metadata: {
                userId: session.user.id,
            },
        });

        return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}