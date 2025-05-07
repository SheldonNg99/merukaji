// lib/paypal-server.ts
import fetch from 'node-fetch';
import { logger } from './logger';

// PayPal API configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// Equivalent mapping for our subscription plans
export const PRICE_IDS = {
    pro: {
        monthly: process.env.NEXT_PUBLIC_PAYPAL_PRO_MONTHLY_PLAN_ID || '',
        yearly: process.env.NEXT_PUBLIC_PAYPAL_PRO_YEARLY_PLAN_ID || '',
    },
    max: {
        monthly: process.env.NEXT_PUBLIC_PAYPAL_MAX_MONTHLY_PLAN_ID || '',
        yearly: process.env.NEXT_PUBLIC_PAYPAL_MAX_YEARLY_PLAN_ID || '',
    },
};

// Get PayPal access token
async function getAccessToken(): Promise<string> {
    try {
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

        const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${auth}`
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get PayPal access token: ${response.status} ${errorText}`);
        }

        const data = await response.json() as { access_token: string };
        return data.access_token;
    } catch (err) {
        logger.error('PayPal authentication error', {
            error: err instanceof Error ? err.message : String(err)
        });
        throw err;
    }
}

// Create subscription
export async function createSubscription(planId: string, customerId: string): Promise<{ subscriptionId: string, approvalUrl: string }> {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                plan_id: planId,
                subscriber: {
                    name: {
                        given_name: customerId
                    },
                    email_address: customerId // We'll use the user's email as customerId
                },
                application_context: {
                    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?success=true`,
                    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?canceled=true`,
                    brand_name: 'Merukaji',
                    locale: 'ja-JP',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'SUBSCRIBE_NOW',
                    payment_method: {
                        payer_selected: 'PAYPAL',
                        payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create PayPal subscription: ${response.status} ${errorText}`);
        }

        const data = await response.json() as {
            id: string,
            links: Array<{ href: string, rel: string }>
        };

        // Find the approval URL to redirect the user
        const approvalLink = data.links.find(link => link.rel === 'approve')?.href;

        if (!approvalLink) {
            throw new Error('No approval link found in PayPal response');
        }

        return {
            subscriptionId: data.id,
            approvalUrl: approvalLink
        };
    } catch (err) {
        logger.error('Error creating PayPal subscription', {
            error: err instanceof Error ? err.message : String(err),
            planId
        });
        throw err;
    }
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch PayPal subscription: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (err) {
        logger.error('Error fetching PayPal subscription', {
            error: err instanceof Error ? err.message : String(err),
            subscriptionId
        });
        throw err;
    }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string, reason: string = 'Canceled by user') {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                reason
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to cancel PayPal subscription: ${response.status} ${errorText}`);
        }

        return true;
    } catch (err) {
        logger.error('Error canceling PayPal subscription', {
            error: err instanceof Error ? err.message : String(err),
            subscriptionId
        });
        throw err;
    }
}

// Verify a subscription is valid - used for webhook validation
export async function verifySubscriptionPayment(subscriptionId: string) {
    try {
        const subscription = await getSubscription(subscriptionId);
        return subscription.status === 'ACTIVE';
    } catch (err) {
        // Log the error but return false instead of re-throwing
        logger.error('Error verifying subscription payment', {
            error: err instanceof Error ? err.message : String(err),
            subscriptionId
        });
        return false;
    }
}

// Get customer portal URL (PayPal doesn't have a direct equivalent, 
// but we can send them to PayPal's subscription management page)
export async function getCustomerPortalUrl() {
    // Adding underscore prefix to unused parameter to satisfy linting
    try {
        // PayPal doesn't provide a direct customer portal like Stripe
        // Instead, we'll send users to PayPal's subscription management page
        return `https://www.paypal.com/myaccount/autopay/`;
    } catch (err) {
        logger.error('Error generating PayPal portal URL', {
            error: err instanceof Error ? err.message : String(err)
        });
        throw err;
    }
}