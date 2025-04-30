import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            logger.warn('Unauthorized checkout attempt');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { priceId } = await req.json();

        // Log the price ID for debugging
        logger.info('Creating checkout session with price ID:', { priceId });

        // Validate the price ID exists and is not undefined
        if (!priceId) {
            logger.error('Price ID is missing');
            return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
        }

        // Validate the price ID format
        if (!priceId.startsWith('price_')) {
            logger.error('Invalid price ID format:', { priceId });
            return NextResponse.json({ error: 'Invalid price ID format' }, { status: 400 });
        }

        // Get the base URL with fallback
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

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
            success_url: `${baseUrl}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/upgrade?canceled=true`,
            metadata: {
                userId: session.user.id,
            },
        });

        return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
    } catch (error) {
        logger.error('Error creating checkout session:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        // Send a more detailed error message in development
        if (process.env.NODE_ENV === 'development') {
            return NextResponse.json({
                error: error instanceof Error ? error.message : 'Internal server error',
                details: error instanceof Error ? error.stack : undefined
            }, { status: 500 });
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}