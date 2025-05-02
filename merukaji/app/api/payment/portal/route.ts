// app/api/payment/portal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';

// Define portal options interface
interface PortalSessionOptions {
    customer: string;
    return_url: string;
}

export async function GET(req: NextRequest) {
    try {
        logger.info('Stripe customer portal requested', {
            method: req.method
        });

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            logger.warn('Unauthorized portal request', {
                session: !!session
            });
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        logger.info('Portal request authenticated user', {
            userId: session.user.id,
            email: session.user.email
        });

        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne({ email: session.user.email });

        if (!user) {
            logger.warn('User not found in database', {
                email: session.user.email
            });
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.stripeCustomerId) {
            return NextResponse.json({ error: 'No customer found in Stripe' }, { status: 404 });
        }

        // Get base URL with fallback
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        logger.info('Creating Stripe portal session', {
            customerId: user.stripeCustomerId,
            hasSubscription: !!user.stripeSubscriptionId,
            returnUrl: `${baseUrl}/settings`
        });

        // Create configuration options for portal session
        const portalOptions: PortalSessionOptions = {
            customer: user.stripeCustomerId,
            return_url: `${baseUrl}/settings`
        };

        // Try to create the portal session
        try {
            // Log Stripe customer ID for debugging
            logger.info('Attempting to create portal with customer ID', {
                customerId: user.stripeCustomerId
            });

            // Verify customer exists in Stripe before creating portal
            try {
                // Retrieve the customer from Stripe to verify it exists
                const customer = await stripe.customers.retrieve(user.stripeCustomerId);

                if (customer.deleted) {
                    logger.error('Customer has been deleted in Stripe', {
                        stripeCustomerId: user.stripeCustomerId
                    });
                    return NextResponse.json({
                        error: 'Customer no longer exists in Stripe',
                    }, { status: 404 });
                }

                logger.info('Customer verified in Stripe', {
                    customerId: user.stripeCustomerId,
                    customerEmail: customer.email
                });
            } catch (customerError) {
                logger.error('Failed to retrieve customer from Stripe', {
                    stripeCustomerId: user.stripeCustomerId,
                    error: customerError instanceof Error ? customerError.message : String(customerError)
                });

                return NextResponse.json({
                    error: 'Failed to verify customer in Stripe',
                    details: customerError instanceof Error ? customerError.message : 'Unknown customer error'
                }, { status: 500 });
            }

            const portalSession = await stripe.billingPortal.sessions.create(portalOptions);

            logger.info('Portal session created successfully', {
                userId: session.user.id,
                customerId: user.stripeCustomerId,
                portalUrl: !!portalSession.url
            });

            return NextResponse.json({ url: portalSession.url });
        } catch (stripeError) {
            logger.error('Stripe error creating portal session', {
                error: stripeError instanceof Error ? stripeError.message : String(stripeError),
                customerId: user.stripeCustomerId
            });

            return NextResponse.json({
                error: 'Failed to create Stripe portal session',
                details: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
            }, { status: 500 });
        }
    } catch (error) {
        logger.error('Error creating customer portal session', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            error: 'Failed to create customer portal session',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}