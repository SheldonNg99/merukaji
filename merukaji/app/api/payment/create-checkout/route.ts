// app/api/payment/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createOrder } from '@/lib/paypal-server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';

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

        const { packageId } = body;

        // Validate packageId
        if (!packageId) {
            logger.error('No package ID provided', { packageId });
            return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
        }

        // Get package details from database
        const { data: creditPackage, error: packageError } = await supabaseAdmin
            .from('credit_packages')
            .select('*')
            .eq('id', packageId)
            .single();

        if (packageError || !creditPackage) {
            logger.error('Invalid package ID', { packageId, error: packageError?.message });
            return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
        }

        if (!creditPackage.is_active) {
            logger.error('Package is not active', { packageId });
            return NextResponse.json({ error: 'This package is no longer available' }, { status: 400 });
        }

        // Log the package being used
        logger.info('Using credit package', {
            packageId,
            name: creditPackage.name,
            credits: creditPackage.credit_amount,
            price: creditPackage.price
        });

        try {
            const userEmail = session.user.email;

            if (!userEmail) {
                return NextResponse.json({ error: 'User email is required' }, { status: 400 });
            }

            // Create PayPal order for one-time payment
            const { orderId, approvalUrl } = await createOrder(
                creditPackage.product_id,
                creditPackage.price
            );

            // Log successful checkout session creation
            logger.info('PayPal checkout session created', {
                orderId,
                userId: session.user.id
            });

            // Store the pending transaction
            const { error: transactionError } = await supabaseAdmin
                .from('transactions')
                .insert({
                    user_id: session.user.id,
                    amount: creditPackage.price,
                    currency: 'JPY',
                    status: 'pending',
                    credit_package_id: creditPackage.id,
                    paypal_transaction_id: orderId,
                    created_at: new Date().toISOString(),
                });

            if (transactionError) {
                logger.error('Failed to record pending transaction', {
                    error: transactionError.message,
                    userId: session.user.id,
                    orderId
                });
                // Continue anyway as this is not critical
            }

            return NextResponse.json({
                success: true,
                orderId,
                url: approvalUrl
            });
        } catch (err) {
            logger.error('Failed to create PayPal checkout session', {
                error: err instanceof Error ? err.message : String(err),
                packageId
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