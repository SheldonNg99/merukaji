// app/api/payment/check-status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrderDetails } from '@/lib/paypal-server';
import { logger } from '@/lib/logger';
import { PayPalOrderDetails } from '@/types/paypal';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logger.error('Payment verification attempted without authentication');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const userId = session.user.id;
        // Parse request body
        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            logger.error('Failed to parse request body', {
                error: error instanceof Error ? error.message : String(error)
            });
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { orderId } = requestBody;

        try {
            const orderDetails = await getOrderDetails(orderId) as PayPalOrderDetails;

            // Check if the order is already completed/captured
            if (orderDetails.status === 'COMPLETED') {
                // Process the completed order
                return processCompletedOrder(orderDetails, userId);
            } else if (orderDetails.status === 'APPROVED') {

                // Try to capture the payment
                const { capturePayment } = await import('@/lib/paypal-server');

                try {
                    const captureResult = await capturePayment(orderId);

                    if (captureResult.success) {
                        return processCompletedOrder(
                            captureResult.details as PayPalOrderDetails || orderDetails,
                            userId
                        );
                    } else {
                        throw new Error('Capture failed');
                    }
                } catch (captureError) {
                    // If it's an already captured error, handle it gracefully
                    const errorMessage = captureError instanceof Error ? captureError.message : String(captureError);

                    if (errorMessage.includes('ORDER_ALREADY_CAPTURED')) {
                        logger.info('Order was already captured, processing as completed', { orderId });

                        // Get fresh order details and process
                        const freshOrderDetails = await getOrderDetails(orderId) as PayPalOrderDetails;
                        return processCompletedOrder(freshOrderDetails, userId);
                    }

                    // For other capture errors, throw
                    throw captureError;
                }
            } else {
                return NextResponse.json({
                    error: `Order is in ${orderDetails.status} state and cannot be processed`
                }, { status: 400 });
            }
        } catch (error) {

            // Check for specific PayPal errors
            const errorMessage = error instanceof Error ? error.message : String(error);

            return NextResponse.json({
                error: 'Failed to process payment',
                details: errorMessage
            }, { status: 500 });
        }
    } catch (error) {
        logger.error('Unexpected error in payment verification', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}

async function processCompletedOrder(orderDetails: PayPalOrderDetails, userId: string) {
    try {
        // Extract the PayPal order ID and reference ID
        const orderId = orderDetails.id;
        const referenceId = orderDetails.purchase_units?.[0]?.reference_id;

        if (!referenceId) {
            return NextResponse.json({
                error: 'Cannot determine which product was purchased'
            }, { status: 400 });
        }

        // Find the credit package by product ID
        const { data: creditPackage, error: packageError } = await supabaseAdmin
            .from('credit_packages')
            .select('id, product_id, credit_amount')
            .eq('product_id', referenceId)
            .single();

        if (packageError || !creditPackage) {
            return NextResponse.json({
                error: 'Unknown product purchased'
            }, { status: 400 });
        }

        // Check if transaction already exists
        const { data: existingTransaction } = await supabaseAdmin
            .from('transactions')
            .select('id, status')
            .eq('paypal_transaction_id', orderId)
            .single();

        let transactionId;

        if (existingTransaction) {

            transactionId = existingTransaction.id;

            // Update transaction status if needed
            if (existingTransaction.status !== 'completed') {
                await supabaseAdmin
                    .from('transactions')
                    .update({
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', transactionId);
            }
        } else {
            // Create new transaction record
            const { data: newTransaction, error: createError } = await supabaseAdmin
                .from('transactions')
                .insert({
                    user_id: userId,
                    amount: orderDetails.purchase_units?.[0]?.amount?.value,
                    currency: orderDetails.purchase_units?.[0]?.amount?.currency_code || 'JPY',
                    status: 'completed',
                    paypal_transaction_id: orderId,
                    credit_package_id: creditPackage.id,
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single();

            if (createError || !newTransaction) {
                logger.error('Failed to create transaction record', {
                    error: createError?.message || 'No transaction created',
                    orderId
                });
                return NextResponse.json({
                    error: 'Failed to create transaction record'
                }, { status: 500 });
            }

            transactionId = newTransaction.id;
        }

        // Check if credits were already added
        const { data: existingCredits } = await supabaseAdmin
            .from('credits')
            .select('id')
            .eq('transaction_id', transactionId)
            .single();

        if (existingCredits) {
            // Get user's current credit balance
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('credit_balance')
                .eq('id', userId)
                .single();

            return NextResponse.json({
                success: true,
                alreadyProcessed: true,
                credits: creditPackage.credit_amount,
                newBalance: userData?.credit_balance || 0
            });
        }

        const { error: creditError } = await supabaseAdmin
            .from('credits')
            .insert({
                user_id: userId,
                amount: creditPackage.credit_amount,
                description: `Purchase: ${creditPackage.credit_amount} credits`,
                transaction_id: transactionId,
                created_at: new Date().toISOString(),
            });

        if (creditError) {
            return NextResponse.json({
                error: 'Failed to add credits'
            }, { status: 500 });
        }

        // Update user's credit balance
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('credit_balance')
            .eq('id', userId)
            .single();

        const currentBalance = userData?.credit_balance || 0;
        const newBalance = currentBalance + creditPackage.credit_amount;

        const { error: updateBalanceError } = await supabaseAdmin
            .from('users')
            .update({
                credit_balance: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateBalanceError) {
        }

        return NextResponse.json({
            success: true,
            credits: creditPackage.credit_amount,
            newBalance: newBalance
        });
    } catch (error) {
        logger.error('Error processing completed order', {
            error: error instanceof Error ? error.message : String(error),
            userId
        });

        return NextResponse.json({
            error: 'Failed to process completed order'
        }, { status: 500 });
    }
}