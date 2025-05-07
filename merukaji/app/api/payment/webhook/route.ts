// app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PRICE_IDS } from '@/lib/paypal-client';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Function to get tier from plan ID
function getTierFromPlanId(planId: string): string {
    const map = {
        [PRICE_IDS.pro.monthly]: 'pro',
        [PRICE_IDS.pro.yearly]: 'pro',
        [PRICE_IDS.max.monthly]: 'max',
        [PRICE_IDS.max.yearly]: 'max',
    };
    return map[planId] || 'free';
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

        // Handle subscription events
        if (event.event_type === 'BILLING.SUBSCRIPTION.CREATED') {
            // A subscription was created
            const subscriptionId = event.resource.id;
            const planId = event.resource.plan_id;
            const customerId = event.resource.subscriber.email_address;
            const tier = getTierFromPlanId(planId);

            // Find the user by email
            const { data: user, error: userError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', customerId)
                .single();

            if (userError) {
                logger.error('User not found for PayPal subscription', {
                    email: customerId,
                    error: userError.message
                });
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Update user
            await supabaseAdmin
                .from('users')
                .update({
                    tier,
                    paypal_subscription_id: subscriptionId,
                    subscription_status: event.resource.status,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            logger.info('User subscription created', {
                userId: user.id,
                subscriptionId,
                tier
            });

        } else if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            // A subscription was activated
            const subscriptionId = event.resource.id;
            const planId = event.resource.plan_id;
            const tier = getTierFromPlanId(planId);

            // Find user by subscription ID
            const { data: user, error: userError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('paypal_subscription_id', subscriptionId)
                .single();

            if (userError) {
                logger.error('User not found for subscription activation', {
                    subscriptionId,
                    error: userError.message
                });
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Update user's subscription status
            await supabaseAdmin
                .from('users')
                .update({
                    tier,
                    subscription_status: 'ACTIVE',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            logger.info('User subscription activated', {
                userId: user.id,
                subscriptionId
            });

        } else if (event.event_type === 'BILLING.SUBSCRIPTION.UPDATED') {
            // A subscription was updated
            const subscriptionId = event.resource.id;
            const status = event.resource.status;

            // Status could be ACTIVE, SUSPENDED, CANCELLED, etc.
            const tier = status === 'ACTIVE'
                ? getTierFromPlanId(event.resource.plan_id)
                : 'free';

            await supabaseAdmin
                .from('users')
                .update({
                    tier,
                    subscription_status: status,
                    updated_at: new Date().toISOString(),
                })
                .eq('paypal_subscription_id', subscriptionId);

            logger.info('User subscription updated', {
                subscriptionId,
                status,
                tier
            });

        } else if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED') {
            // A subscription was cancelled
            const subscriptionId = event.resource.id;

            await supabaseAdmin
                .from('users')
                .update({
                    tier: 'free',
                    subscription_status: 'CANCELLED',
                    updated_at: new Date().toISOString(),
                })
                .eq('paypal_subscription_id', subscriptionId);

            logger.info('User subscription cancelled', {
                subscriptionId
            });
        } else if (event.event_type === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
            // A subscription payment failed
            const subscriptionId = event.resource.id;

            await supabaseAdmin
                .from('users')
                .update({
                    subscription_status: 'PAYMENT_FAILED',
                    updated_at: new Date().toISOString(),
                })
                .eq('paypal_subscription_id', subscriptionId);

            logger.info('User subscription payment failed', {
                subscriptionId
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