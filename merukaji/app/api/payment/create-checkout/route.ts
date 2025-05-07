// app/api/payment/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createSubscription } from '@/lib/paypal-server';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Log the start of the checkout process
        logger.info('Creating PayPal checkout session', { userId: session.user.id });

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

        const { planId } = body;

        // Validate planId
        if (!planId?.startsWith('P-')) {
            logger.error('Invalid PayPal plan ID provided', { planId });
            return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
        }

        // Log the plan ID being used
        logger.info('Using PayPal plan ID', { planId });

        try {
            // With PayPal, we'll use the user's email as the customer ID
            const userEmail = session.user.email;

            if (!userEmail) {
                return NextResponse.json({ error: 'User email is required' }, { status: 400 });
            }

            // Create PayPal subscription
            const { subscriptionId, approvalUrl } = await createSubscription(planId, userEmail);

            // Log successful checkout session creation
            logger.info('PayPal checkout session created', {
                subscriptionId,
                userId: session.user.id
            });

            return NextResponse.json({
                success: true,
                subscriptionId,
                url: approvalUrl
            });
        } catch (err) {
            logger.error('Failed to create PayPal checkout session', {
                error: err instanceof Error ? err.message : String(err),
                planId
            });
            return NextResponse.json({
                error: 'Failed to create checkout session'
            }, { status: 500 });
        }
    } catch (err) {
        logger.error('create-checkout error', {
            error: err instanceof Error ? err.message : String(err)
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}