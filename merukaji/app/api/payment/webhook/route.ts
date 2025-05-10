// app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { CREDIT_PACKAGES } from '@/lib/paypal-client';

// Function to determine credit amount from product reference
function getCreditsFromProductId(productId: string): number {
    if (productId.includes('basic')) {
        return CREDIT_PACKAGES.basic.credits;
    } else if (productId.includes('standard')) {
        return CREDIT_PACKAGES.standard.credits;
    } else {
        // Default fallback - should log as warning
        logger.warn('Unknown product ID in webhook', { productId });
        return 5; // Default to basic package
    }
}

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
            // Extract required information from the event
            const transactionId = event.resource.id;
            const paypalOrderId = event.resource.supplementary_data?.related_ids?.order_id;
            const payerEmail = event.resource.payer_email || event.resource.payer_info?.email_address;
            const amount = parseFloat(event.resource.amount.value);
            const currency = event.resource.amount.currency_code;

            // If no order ID or payer information, log error and return
            if (!paypalOrderId || !payerEmail) {
                logger.error('Missing information in PayPal webhook', {
                    transactionId,
                    paypalOrderId,
                    payerEmail
                });
                return NextResponse.json({ error: 'Incomplete payment data' }, { status: 400 });
            }

            // Find or fetch additional order info if needed
            // For simplicity, let's assume the productId is in the transaction's custom field
            // In a real implementation, you might need to call PayPal API to get order details
            const productId = event.resource.custom_id || 'basic'; // Default to basic if not specified

            // Find the user by email
            const { data: user, error: userError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', payerEmail)
                .single();

            if (userError) {
                logger.error('User not found for PayPal transaction', {
                    email: payerEmail,
                    error: userError.message
                });
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Determine credits to add
            const creditsToAdd = getCreditsFromProductId(productId);

            // First record the transaction
            const { data: transaction, error: transactionError } = await supabaseAdmin
                .from('transactions')
                .insert({
                    user_id: user.id,
                    amount: amount,
                    currency: currency,
                    status: 'completed',
                    paypal_transaction_id: transactionId,
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single();

            if (transactionError) {
                logger.error('Failed to record transaction', {
                    error: transactionError.message,
                    userId: user.id,
                    transactionId
                });
                return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
            }

            // Add credits to the user's account
            const { error: creditError } = await supabaseAdmin
                .from('credits')
                .insert({
                    user_id: user.id,
                    amount: creditsToAdd,
                    description: `Purchase: ${creditsToAdd} credits`,
                    transaction_id: transaction.id,
                    created_at: new Date().toISOString(),
                });

            if (creditError) {
                logger.error('Failed to add credits', {
                    error: creditError.message,
                    userId: user.id,
                    credits: creditsToAdd
                });
                return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
            }

            // Update user's credit balance
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    credit_balance: supabaseAdmin.rpc('increment', { x: creditsToAdd }),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (updateError) {
                logger.error('Failed to update user credit balance', {
                    error: updateError.message,
                    userId: user.id
                });
                return NextResponse.json({ error: 'Failed to update user balance' }, { status: 500 });
            }

            logger.info('Credits added successfully', {
                userId: user.id,
                credits: creditsToAdd,
                transactionId
            });
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        logger.error('Error processing PayPal webhook', {
            error: err instanceof Error ? err.message : String(err),
            eventType: event.event_type
        });

        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}