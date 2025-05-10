// app/api/payment/webhook/route.ts
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

            // Find the transaction in our database using the PayPal transaction ID
            const { data: transaction, error: transactionError } = await supabaseAdmin
                .from('transactions')
                .select('id, user_id, credit_package_id, status')
                .eq('paypal_transaction_id', transactionId)
                .single();

            if (transactionError || !transaction) {
                logger.error('Transaction not found for PayPal webhook', {
                    paypalTransactionId: transactionId,
                    error: transactionError?.message || 'Transaction not found'
                });

                // This could be a duplicate webhook, so return 200 to acknowledge receipt
                return NextResponse.json({
                    received: true,
                    message: 'Transaction not found in our records'
                });
            }

            // Check if this transaction has already been processed
            if (transaction.status === 'completed') {
                logger.info('Transaction already processed', {
                    transactionId: transaction.id,
                    paypalTransactionId: transactionId
                });

                return NextResponse.json({
                    received: true,
                    message: 'Transaction already processed'
                });
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

                return NextResponse.json({ error: 'Credit package not found' }, { status: 404 });
            }

            // Update transaction status to completed
            await supabaseAdmin
                .from('transactions')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', transaction.id);

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
                return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
            }

            // Update user's credit balance
            const { error: updateError } = await supabaseAdmin.rpc('update_credit_balance', {
                user_id: transaction.user_id,
                amount: creditPackage.credit_amount
            });

            if (updateError) {
                logger.error('Failed to update user credit balance', {
                    error: updateError.message,
                    userId: transaction.user_id
                });
                return NextResponse.json({ error: 'Failed to update user balance' }, { status: 500 });
            }

            logger.info('Credits added successfully', {
                userId: transaction.user_id,
                credits: creditPackage.credit_amount,
                transactionId: transaction.id
            });

            return NextResponse.json({
                received: true,
                message: 'Credits added successfully'
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