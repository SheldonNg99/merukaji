// lib/paypal-server.ts
import fetch from 'node-fetch';
import { logger } from './logger';
import { PayPalCaptureDetails } from '@/types/paypal';

// PayPal API configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// Equivalent mapping for our credit packages
export const PRODUCT_IDS = {
    basic: process.env.NEXT_PUBLIC_PAYPAL_BASIC_PRODUCT_ID || '',
    standard: process.env.NEXT_PUBLIC_PAYPAL_STANDARD_PRODUCT_ID || '',
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

// Create order for one-time purchase
export async function createOrder(productId: string, amount: number): Promise<{ orderId: string, approvalUrl: string }> {
    try {
        const accessToken = await getAccessToken();

        const payload = {
            intent: "CAPTURE",
            purchase_units: [
                {
                    reference_id: productId,
                    amount: {
                        currency_code: "JPY",
                        value: amount.toString()
                    },
                    description: `Credit purchase: ${productId}`
                }
            ],
            application_context: {
                return_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?success=true`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?canceled=true`,
                brand_name: 'Merukaji',
                locale: 'ja-JP',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW'
            }
        };

        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create PayPal order: ${response.status} ${errorText}`);
        }

        const data = await response.json() as {
            id: string,
            links: Array<{ href: string, rel: string, method: string }>
        };

        // Find the approval URL to redirect the user
        const approvalLink = data.links.find(link => link.rel === 'approve')?.href;

        if (!approvalLink) {
            throw new Error('No approval link found in PayPal response');
        }

        return {
            orderId: data.id,
            approvalUrl: approvalLink
        };
    } catch (err) {
        logger.error('Error creating PayPal order', {
            error: err instanceof Error ? err.message : String(err),
            productId,
            amount
        });
        throw err;
    }
}

// Capture payment after user approval
// Capture payment after user approval
export async function capturePayment(orderId: string): Promise<{
    success: boolean,
    transactionId: string,
    details?: PayPalCaptureDetails  // Define a proper type instead of any
}> {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to capture PayPal payment: ${response.status} ${errorText}`);
        }

        const data = await response.json() as PayPalCaptureDetails;

        // Extract the transaction ID from the capture response
        const transactionId = data.purchase_units[0]?.payments?.captures[0]?.id || '';

        return {
            success: true,
            transactionId,
            details: data
        };
    } catch (err) {
        logger.error('Error capturing PayPal payment', {
            error: err instanceof Error ? err.message : String(err),
            orderId
        });
        throw err;
    }
}

// Get order details
export async function getOrderDetails(orderId: string) {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch PayPal order details: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (err) {
        logger.error('Error fetching PayPal order details', {
            error: err instanceof Error ? err.message : String(err),
            orderId
        });
        throw err;
    }
}

// Get customer portal URL (PayPal doesn't have a direct equivalent, 
// but we can send them to PayPal's management page)
export async function getCustomerPortalUrl() {
    try {
        // PayPal doesn't provide a direct customer portal like Stripe
        // Instead, we'll send users to PayPal's account page
        return `https://www.paypal.com/myaccount/`;
    } catch (err) {
        logger.error('Error generating PayPal portal URL', {
            error: err instanceof Error ? err.message : String(err)
        });
        throw err;
    }
}