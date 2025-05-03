import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Log the start of the checkout process
        logger.info('Creating checkout session', { userId: session.user.id });

        // Parse request body with error handling
        let body;
        try {
            body = await req.json();
        } catch (error) {
            logger.error('Failed to parse request body', {
                error: error instanceof Error ? error.message : String(error)
            });
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { priceId } = body;

        // Validate priceId
        if (!priceId?.startsWith('price_')) {
            logger.error('Invalid price ID provided', { priceId });
            return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
        }

        // Log the price ID being used
        logger.info('Using price ID', { priceId });

        // Get existing customer info
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('stripe_customer_id')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            logger.error('Error fetching user data', { error: userError.message });
            return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
        }

        let stripeCustomerId = user?.stripe_customer_id;

        // Create a new customer if needed
        if (!stripeCustomerId) {
            try {
                const customer = await stripe.customers.create({
                    email: session.user.email!,
                    metadata: { userId: session.user.id }
                });
                stripeCustomerId = customer.id;

                // Log customer creation
                logger.info('Created new Stripe customer', {
                    customerId: customer.id,
                    userId: session.user.id
                });

                // Update user with new customer ID
                const { error: updateError } = await supabaseAdmin
                    .from('users')
                    .update({ stripe_customer_id: stripeCustomerId })
                    .eq('id', session.user.id);

                if (updateError) {
                    logger.error('Failed to update user with Stripe customer ID', {
                        error: updateError.message
                    });
                    // Continue anyway, as this is not critical
                }
            } catch (stripeError) {
                logger.error('Failed to create Stripe customer', {
                    error: stripeError instanceof Error ? stripeError.message : String(stripeError)
                });
                return NextResponse.json({ error: 'Failed to create customer record' }, { status: 500 });
            }
        } else {
            logger.info('Using existing Stripe customer', { customerId: stripeCustomerId });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Create the checkout session
        try {
            const checkoutSession = await stripe.checkout.sessions.create({
                customer: stripeCustomerId,
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: `${baseUrl}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/upgrade?canceled=true`,
                metadata: { userId: session.user.id }
            });

            // Log successful checkout session creation
            logger.info('Checkout session created', {
                sessionId: checkoutSession.id,
                userId: session.user.id
            });

            return NextResponse.json({
                success: true,
                sessionId: checkoutSession.id,
                url: checkoutSession.url
            });
        } catch (stripeError) {
            logger.error('Failed to create checkout session', {
                error: stripeError instanceof Error ? stripeError.message : String(stripeError),
                priceId,
                customerId: stripeCustomerId
            });
            return NextResponse.json({
                error: 'Failed to create checkout session'
            }, { status: 500 });
        }
    } catch (error) {
        logger.error('create-checkout error', {
            error: error instanceof Error ? error.message : String(error)
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}