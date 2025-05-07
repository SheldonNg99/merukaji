// app/api/payment/portal/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getCustomerPortalUrl } from '@/lib/paypal-server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        logger.info('Payment portal requested', {
            userId: session.user.id
        });

        // Get user's PayPal subscription info
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('paypal_subscription_id, subscription_status')
            .eq('id', session.user.id)
            .single();

        if (error || !user) {
            logger.error('Failed to fetch user subscription data', {
                userId: session.user.id,
                error: error?.message
            });
            return NextResponse.json({ error: 'Failed to fetch subscription details' }, { status: 500 });
        }

        if (!user.paypal_subscription_id) {
            logger.info('No PayPal subscription found for user', {
                userId: session.user.id
            });
            return NextResponse.json({
                error: 'No active subscription found. Please subscribe first.'
            }, { status: 404 });
        }

        try {
            // With PayPal, we'll get a general portal URL 
            // (PayPal doesn't support direct deep linking to specific subscriptions)
            const portalUrl = await getCustomerPortalUrl();

            logger.info('PayPal portal URL generated successfully', {
                userId: session.user.id,
                subscription_status: user.subscription_status,
            });

            return NextResponse.json({
                url: portalUrl,
                status: user.subscription_status || 'unknown'
            });
        } catch (error) {
            logger.error('Failed to generate PayPal portal URL', {
                userId: session.user.id,
                error: error instanceof Error ? error.message : String(error)
            });

            return NextResponse.json({
                error: 'Failed to create subscription management link. Please try again later.'
            }, { status: 500 });
        }
    } catch (error) {
        logger.error('Unexpected error in payment portal route', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'An unexpected error occurred. Please try again later.'
        }, { status: 500 });
    }
}