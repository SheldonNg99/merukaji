// Updated implementation for app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    // Get the PayPal webhook event
    const body = await req.text();

    // Parse the payload
    let event;
    try {
        event = JSON.parse(body);
    } catch (err) {
        logger.error('Failed to parse PayPal webhook payload', {
            error: err instanceof Error ? err.message : String(err)
        });
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    try {
        // Log the webhook event for debugging
        logger.info('Received PayPal webhook event', {
            eventType: event.event_type,
            resourceType: event.resource_type,
            eventId: event.id
        });

        // Handle payment capture events (for one-time purchases)
        if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
            // Extract the transaction ID from the event
            const transactionId = event.resource.id;
            let paypalOrderId = event.resource.supplementary_data?.related_ids?.order_id;

            logger.info('Processing PAYMENT.CAPTURE.COMPLETED webhook', {
                transactionId,
                paypalOrderId
            });

            if (!paypalOrderId) {
                logger.warn('No order ID found in webhook event, falling back to transaction ID', { transactionId });
                // Fall back to using transaction ID as order ID if not provided
                paypalOrderId = transactionId;
            }

            // Find the transaction in our database using the PayPal transaction ID
            const { data: transaction, error: transactionError } = await supabaseAdmin
                .from('transactions')
                .select('id, user_id, credit_package_id, status')
                .eq('paypal_transaction_id', paypalOrderId)
                .single();

            if (transactionError) {
                logger.warn('Transaction not found for PayPal webhook', {
                    paypalOrderId,
                    transactionId,
                    error: transactionError.message
                });

                // This could be a duplicate webhook, so return 200 to acknowledge receipt
                return NextResponse.json({
                    received: true,
                    message: 'Transaction not found in our records'
                });
            }

            // Check if this transaction has already been fully processed
            if (transaction.status === 'completed') {
                // Check if credits were already added for this transaction
                const { data: existingCredits } = await supabaseAdmin
                    .from('credits')
                    .select('id')
                    .eq('transaction_id', transaction.id)
                    .single();

                if (existingCredits) {
                    logger.info('Transaction already processed with credits added', {
                        transactionId: transaction.id,
                        paypalTransactionId: paypalOrderId
                    });

                    return NextResponse.json({
                        received: true,
                        message: 'Transaction already processed with credits'
                    });
                }

                logger.info('Transaction marked as completed but no credits found - processing', {
                    transactionId: transaction.id,
                    paypalOrderId
                });
                // Continue processing to add the credits
            }

            // Get credit package details
            const { data: creditPackage, error: packageError } = await supabaseAdmin
                .from('credit_packages')
                .select('credit_amount')
                .eq('id', transaction.credit_package_id)
                .single();

            if (packageError || !creditPackage) {
                logger.error('Credit package not found', {
                    packageId: transaction.credit_package_id,
                    error: packageError?.message || 'Package not found'
                });

                return NextResponse.json({
                    received: true,
                    error: 'Credit package not found'
                });
            }

            // Update transaction status to completed if not already
            if (transaction.status !== 'completed') {
                await supabaseAdmin
                    .from('transactions')
                    .update({
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', transaction.id);
            }

            // Check if credits already exist for this transaction
            const { data: existingCredits } = await supabaseAdmin
                .from('credits')
                .select('id')
                .eq('transaction_id', transaction.id)
                .single();

            if (!existingCredits) {
                // Add credits to the user's account
                const { error: creditError } = await supabaseAdmin
                    .from('credits')
                    .insert({
                        user_id: transaction.user_id,
                        amount: creditPackage.credit_amount,
                        description: `Purchase: ${creditPackage.credit_amount} credits`,
                        transaction_id: transaction.id,
                        created_at: new Date().toISOString(),
                    });

                if (creditError) {
                    logger.error('Failed to add credits', {
                        error: creditError.message,
                        userId: transaction.user_id,
                        credits: creditPackage.credit_amount
                    });
                    return NextResponse.json({
                        received: true,
                        error: 'Failed to add credits'
                    });
                }

                // Update user's credit balance
                const { data: userData, error: balanceReadError } = await supabaseAdmin
                    .from('users')
                    .select('credit_balance')
                    .eq('id', transaction.user_id)
                    .single();

                if (balanceReadError) {
                    logger.error('Failed to read user credit balance', {
                        userId: transaction.user_id,
                        error: balanceReadError.message
                    });
                    // Continue anyway, we've at least recorded the credits
                } else {
                    // Calculate new balance and update
                    const currentBalance = userData?.credit_balance || 0;
                    const newBalance = currentBalance + creditPackage.credit_amount;

                    const { error: updateError } = await supabaseAdmin
                        .from('users')
                        .update({
                            credit_balance: newBalance,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', transaction.user_id);

                    if (updateError) {
                        logger.error('Failed to update user credit balance', {
                            userId: transaction.user_id,
                            error: updateError.message
                        });
                        // Continue anyway, we've at least recorded the credits
                    }

                    logger.info('Credits added successfully via webhook', {
                        userId: transaction.user_id,
                        credits: creditPackage.credit_amount,
                        transactionId: transaction.id
                    });
                }
            } else {
                logger.info('Credits already exist for this transaction', {
                    transactionId: transaction.id,
                    userId: transaction.user_id
                });
            }

            return NextResponse.json({
                received: true,
                message: 'Payment processed successfully'
            });
        }

        // Always acknowledge receipt of the webhook
        return NextResponse.json({ received: true });
    } catch (err) {
        logger.error('Error processing PayPal webhook', {
            error: err instanceof Error ? err.message : String(err),
            eventType: event.event_type
        });

        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}