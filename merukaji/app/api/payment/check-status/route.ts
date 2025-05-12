// Updated implementation for app/api/payment/check-status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { capturePayment, getOrderDetails } from '@/lib/paypal-server';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logger.error('Payment verification attempted without authentication');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const userId = session.user.id;
        logger.info('Payment verification started', { userId });

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

        const { orderId, PayerID } = requestBody;
        logger.info('Payment verification request params', { orderId, PayerID, userId });

        if (!orderId) {
            logger.error('No order ID provided for payment verification', { requestBody });
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // First check if this order was already processed
        const { data: existingTransaction } = await supabaseAdmin
            .from('transactions')
            .select('id, status, credit_package_id')
            .eq('paypal_transaction_id', orderId)
            .eq('status', 'completed')
            .single();

        if (existingTransaction) {
            logger.info('Transaction already processed', {
                orderId,
                transactionId: existingTransaction.id,
                status: existingTransaction.status
            });

            // Check if credits were already added for this transaction
            const { data: existingCredits } = await supabaseAdmin
                .from('credits')
                .select('amount')
                .eq('transaction_id', existingTransaction.id)
                .single();

            if (existingCredits) {
                logger.info('Credits already added for this transaction', {
                    transactionId: existingTransaction.id,
                    creditAmount: existingCredits.amount
                });

                return NextResponse.json({
                    success: true,
                    alreadyProcessed: true,
                    credits: existingCredits.amount
                });
            }

            // Transaction marked as completed but credits not found - continue processing
            // This handles edge cases where the transaction was marked complete but credits weren't added
            logger.warn('Transaction marked as completed but no credits found - processing anyway', {
                transactionId: existingTransaction.id,
                orderId
            });
        }

        // Find the pending transaction or create a new one
        let transactionId;
        let packageId;

        // Try to find pending transaction
        const { data: pendingTransaction, error: transactionError } = await supabaseAdmin
            .from('transactions')
            .select('id, status, credit_package_id, paypal_transaction_id')
            .eq('paypal_transaction_id', orderId)
            .eq('user_id', userId)
            .single();

        if (transactionError || !pendingTransaction) {
            // Transaction not found, we need to figure out what credit package was purchased
            // First, let's get the order details from PayPal
            logger.info('No pending transaction found, getting order details from PayPal', { orderId });

            try {
                // Get order details from PayPal
                const orderDetails = await getOrderDetails(orderId);

                // The reference_id in the purchase unit should contain our product ID
                const referenceId = orderDetails.purchase_units?.[0]?.reference_id;

                if (!referenceId) {
                    logger.error('No reference ID found in PayPal order', { orderId, orderDetails });
                    return NextResponse.json({ error: 'Cannot determine which product was purchased' }, { status: 400 });
                }

                logger.info('Got reference ID from PayPal order', { referenceId, orderId });

                // Find the credit package by product ID
                const { data: creditPackage, error: packageError } = await supabaseAdmin
                    .from('credit_packages')
                    .select('id, product_id, credit_amount')
                    .eq('product_id', referenceId)
                    .single();

                if (packageError || !creditPackage) {
                    logger.error('Could not find credit package for reference ID', {
                        referenceId,
                        error: packageError?.message || 'Package not found'
                    });
                    return NextResponse.json({ error: 'Unknown product purchased' }, { status: 400 });
                }

                // Create a new transaction record
                const { data: newTransaction, error: createError } = await supabaseAdmin
                    .from('transactions')
                    .insert({
                        user_id: userId,
                        amount: orderDetails.purchase_units?.[0]?.amount?.value,
                        currency: orderDetails.purchase_units?.[0]?.amount?.currency_code || 'JPY',
                        status: 'pending',
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
                    return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 });
                }

                transactionId = newTransaction.id;
                packageId = creditPackage.id;

                logger.info('Created new transaction record', {
                    transactionId,
                    packageId,
                    orderId
                });
            } catch (error) {
                logger.error('Error getting order details or creating transaction', {
                    error: error instanceof Error ? error.message : String(error),
                    orderId
                });
                return NextResponse.json({ error: 'Failed to process transaction details' }, { status: 500 });
            }
        } else {
            // Use the existing transaction
            transactionId = pendingTransaction.id;
            packageId = pendingTransaction.credit_package_id;
            logger.info('Found existing transaction record', {
                transactionId,
                packageId,
                status: pendingTransaction.status,
                orderId
            });
        }

        try {
            // Get the order details to check status first
            const orderDetails = await getOrderDetails(orderId);
            const orderStatus = orderDetails.status;

            logger.info('Order details fetched', {
                orderId,
                status: orderStatus
            });

            // Only attempt to capture if the order status is APPROVED
            let paymentResult;
            if (orderStatus === 'COMPLETED') {
                // Order already captured, treat as success
                logger.info('Order already captured by PayPal', { orderId });
                paymentResult = { success: true, transactionId: orderId };
            } else if (orderStatus === 'APPROVED') {
                // Call PayPal to capture the payment
                logger.info('Capturing PayPal payment', { orderId });
                paymentResult = await capturePayment(orderId);
            } else {
                logger.error('Order in unexpected state', { orderId, status: orderStatus });
                return NextResponse.json({
                    error: `Payment verification failed: order in ${orderStatus} state`
                }, { status: 400 });
            }

            if (!paymentResult.success) {
                logger.error('PayPal payment capture failed', {
                    orderId,
                    error: 'PayPal API returned unsuccessful status'
                });
                return NextResponse.json({
                    error: 'Payment verification failed at PayPal'
                }, { status: 400 });
            }

            logger.info('Payment successfully processed', {
                orderId,
                transactionId: paymentResult.transactionId
            });

            // Get the credit package details
            const { data: creditPackage, error: packageError } = await supabaseAdmin
                .from('credit_packages')
                .select('credit_amount, price')
                .eq('id', packageId)
                .single();

            if (packageError || !creditPackage) {
                logger.error('Failed to retrieve credit package', {
                    packageId,
                    error: packageError?.message || 'Package not found'
                });
                return NextResponse.json({ error: 'Credit package not found' }, { status: 404 });
            }

            // Update transaction status
            const { error: updateError } = await supabaseAdmin
                .from('transactions')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', transactionId);

            if (updateError) {
                logger.error('Failed to update transaction status', {
                    transactionId,
                    error: updateError.message
                });
                // Continue despite error
            }

            // Check if credits were already added for this transaction to avoid duplicates
            const { data: creditsAlreadyAdded } = await supabaseAdmin
                .from('credits')
                .select('id')
                .eq('transaction_id', transactionId)
                .single();

            if (creditsAlreadyAdded) {
                logger.info('Credits already added for this transaction', {
                    transactionId,
                    creditsAlreadyAdded: true
                });

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

            // Add credits to user's account
            logger.info('Adding credits to user account', {
                userId,
                creditAmount: creditPackage.credit_amount,
                transactionId
            });

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
                logger.error('Failed to add credits', {
                    userId,
                    credits: creditPackage.credit_amount,
                    error: creditError.message
                });
                return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
            }

            // Update user's credit balance
            logger.info('Updating user credit balance', { userId });
            const { data: userData, error: balanceReadError } = await supabaseAdmin
                .from('users')
                .select('credit_balance')
                .eq('id', userId)
                .single();

            if (balanceReadError) {
                logger.error('Failed to read user credit balance', {
                    userId,
                    error: balanceReadError.message
                });
                return NextResponse.json({ error: 'Failed to read user balance' }, { status: 500 });
            }

            // Calculate new balance and update
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
                logger.error('Failed to update user credit balance', {
                    userId,
                    error: updateBalanceError.message
                });
                return NextResponse.json({ error: 'Failed to update user balance' }, { status: 500 });
            }

            // Final balances for logging
            const { data: finalUser } = await supabaseAdmin
                .from('users')
                .select('credit_balance')
                .eq('id', userId)
                .single();

            logger.info('Credits added successfully', {
                userId,
                credits: creditPackage.credit_amount,
                oldBalance: currentBalance,
                newBalance: newBalance,
                actualBalance: finalUser?.credit_balance,
                transactionId
            });

            return NextResponse.json({
                success: true,
                credits: creditPackage.credit_amount,
                newBalance: newBalance
            });
        } catch (error) {
            // Check if it's the already captured error
            const errorString = String(error);
            if (errorString.includes('ORDER_ALREADY_CAPTURED')) {
                logger.warn('Order already captured, treating as success', { orderId });

                // Get the credit package details
                const { data: creditPackage } = await supabaseAdmin
                    .from('credit_packages')
                    .select('credit_amount')
                    .eq('id', packageId)
                    .single();

                // Update transaction as completed
                await supabaseAdmin
                    .from('transactions')
                    .update({
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', transactionId);

                // Check for existing credits
                const { data: existingCredits } = await supabaseAdmin
                    .from('credits')
                    .select('id')
                    .eq('transaction_id', transactionId)
                    .single();

                // Only add credits if they don't exist yet
                if (!existingCredits && creditPackage) {
                    // Add credits to user's account
                    await supabaseAdmin
                        .from('credits')
                        .insert({
                            user_id: userId,
                            amount: creditPackage.credit_amount,
                            description: `Purchase: ${creditPackage.credit_amount} credits`,
                            transaction_id: transactionId,
                            created_at: new Date().toISOString(),
                        });

                    // Update user's balance
                    const { data: userData } = await supabaseAdmin
                        .from('users')
                        .select('credit_balance')
                        .eq('id', userId)
                        .single();

                    const currentBalance = userData?.credit_balance || 0;
                    const newBalance = currentBalance + creditPackage.credit_amount;

                    await supabaseAdmin
                        .from('users')
                        .update({
                            credit_balance: newBalance,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', userId);

                    logger.info('Credits added for already captured order', {
                        credits: creditPackage.credit_amount,
                        transactionId,
                        orderId
                    });

                    return NextResponse.json({
                        success: true,
                        credits: creditPackage.credit_amount,
                        newBalance: newBalance
                    });
                } else if (existingCredits && creditPackage) {
                    // Credits already exist, return success
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
            }

            logger.error('Payment verification failed', {
                orderId,
                error: error instanceof Error ? error.message : String(error)
            });
            return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
        }
    } catch (error) {
        logger.error('Unexpected error in payment verification', {
            error: error instanceof Error ? error.message : String(error)
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}