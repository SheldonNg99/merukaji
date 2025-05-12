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
            logger.error('Unauthorized checkout attempt');
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
        logger.info('Fetching credit package details', { packageId });
        const { data: creditPackage, error: packageError } = await supabaseAdmin
            .from('credit_packages')
            .select('*')
            .eq('id', packageId)
            .single();

        if (packageError) {
            logger.error('Failed to fetch credit package', {
                packageId,
                error: packageError.message,
                code: packageError.code
            });
            return NextResponse.json({ error: 'Invalid package ID' }, { status: 404 });
        }

        if (!creditPackage) {
            logger.error('Credit package not found', { packageId });
            return NextResponse.json({ error: 'Package not found' }, { status: 404 });
        }

        if (!creditPackage.is_active) {
            logger.error('Package is not active', { packageId });
            return NextResponse.json({ error: 'This package is no longer available' }, { status: 400 });
        }

        // Check if product_id exists and is valid
        if (!creditPackage.product_id) {
            logger.error('Package missing product_id', {
                packageId,
                packageData: creditPackage
            });
            return NextResponse.json({ error: 'Package configuration error' }, { status: 500 });
        }

        // Log the package being used
        logger.info('Using credit package', {
            packageId,
            name: creditPackage.name,
            credits: creditPackage.credit_amount,
            price: creditPackage.price,
            productId: creditPackage.product_id
        });

        try {
            const userEmail = session.user.email;

            if (!userEmail) {
                return NextResponse.json({ error: 'User email is required' }, { status: 400 });
            }

            // Create PayPal order for one-time payment
            logger.info('Creating PayPal order', {
                productId: creditPackage.product_id,
                price: creditPackage.price
            });

            let orderResult;
            try {
                orderResult = await createOrder(
                    creditPackage.product_id,
                    creditPackage.price
                );
            } catch (paypalError) {
                logger.error('PayPal createOrder failed', {
                    error: paypalError instanceof Error ? paypalError.message : String(paypalError),
                    productId: creditPackage.product_id,
                    price: creditPackage.price
                });

                // Check if it's a configuration error
                const errorMessage = paypalError instanceof Error ? paypalError.message : String(paypalError);
                if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
                    return NextResponse.json({
                        error: 'Payment system configuration error. Please contact support.'
                    }, { status: 503 });
                }

                return NextResponse.json({
                    error: 'Failed to initialize payment process. Please try again.'
                }, { status: 500 });
            }

            const { orderId, approvalUrl } = orderResult;

            // Validate PayPal response
            if (!orderId || !approvalUrl) {
                logger.error('Invalid PayPal response', {
                    orderId,
                    approvalUrl,
                    response: orderResult
                });
                return NextResponse.json({
                    error: 'Invalid payment system response'
                }, { status: 500 });
            }

            // Log successful checkout session creation
            logger.info('PayPal checkout session created', {
                orderId,
                userId: session.user.id,
                approvalUrl
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
                // Continue anyway as this is not critical for the checkout process
            }

            return NextResponse.json({
                success: true,
                orderId,
                url: approvalUrl
            });

        } catch (err) {
            logger.error('Failed to create PayPal checkout session', {
                error: err instanceof Error ? err.message : String(err),
                packageId,
                stack: err instanceof Error ? err.stack : undefined
            });

            // Return a more specific error message based on the error type
            const errorMessage = err instanceof Error ? err.message : String(err);

            if (errorMessage.includes('PayPal API key') || errorMessage.includes('authentication')) {
                return NextResponse.json({
                    error: 'Payment system not properly configured. Please contact support.'
                }, { status: 503 });
            }

            return NextResponse.json({
                error: 'Failed to create checkout session. Please try again.'
            }, { status: 500 });
        }
    } catch (err) {
        logger.error('create-checkout error', {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
        });

        return NextResponse.json({
            error: 'Internal server error. Please try again.'
        }, { status: 500 });
    }
}