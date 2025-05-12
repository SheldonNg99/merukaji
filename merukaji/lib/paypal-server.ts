// lib/paypal-server.ts
import fetch from 'node-fetch';
import { logger } from './logger';
import { PayPalCaptureDetails } from '@/types/paypal';

// PayPal API configuration with validation
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Check environment and set correct API base
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PAYPAL_API_BASE = IS_PRODUCTION
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

        const responseText = await response.text();

        if (!response.ok) {

            if (response.status === 401) {
                throw new Error('PayPal authentication failed. Please check CLIENT_ID and CLIENT_SECRET.');
            }

            throw new Error(`Failed to get PayPal access token: ${response.status} ${responseText}`);
        }

        let data;
        try {
            data = JSON.parse(responseText) as { access_token: string };
        } catch (parseError) {
            logger.error('Failed to parse PayPal response', {
                response: responseText,
                error: parseError instanceof Error ? parseError.message : String(parseError)
            });
            throw new Error('Invalid response from PayPal authentication endpoint');
        }

        if (!data.access_token) {
            throw new Error('PayPal authentication response missing access token');
        }

        return data.access_token;
    } catch (err) {
        logger.error('PayPal authentication error', {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
        });
        throw err;
    }
}

// Create order for one-time purchase
export async function createOrder(productId: string, amount: number): Promise<{ orderId: string, approvalUrl: string }> {
    try {
        // Validate inputs
        if (!productId || amount <= 0) {
            throw new Error('Invalid order parameters: productId and positive amount required');
        }

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

        // logger.debug('PayPal create order payload', { payload });

        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();

        if (!response.ok) {
            // logger.error('Failed to create PayPal order', {
            //     status: response.status,
            //     statusText: response.statusText,
            //     response: responseText,
            //     productId,
            //     amount
            // });

            if (response.status === 401) {
                throw new Error('PayPal authentication failed during order creation');
            }

            throw new Error(`Failed to create PayPal order: ${response.status} ${responseText}`);
        }

        let data;
        try {
            data = JSON.parse(responseText) as {
                id: string,
                links: Array<{ href: string, rel: string, method: string }>
            };
        } catch (parseError) {
            logger.error('Failed to parse PayPal order response', {
                response: responseText,
                error: parseError instanceof Error ? parseError.message : String(parseError)
            });
            throw new Error('Invalid response from PayPal order endpoint');
        }

        // Validate response structure
        if (!data.id || !Array.isArray(data.links)) {
            throw new Error('PayPal order response missing required fields');
        }

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
        throw err;
    }
}

// Capture payment after user approval
export async function capturePayment(orderId: string): Promise<{
    success: boolean,
    transactionId: string,
    details?: PayPalCaptureDetails
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

        // Check specifically for the 422 error which indicates ORDER_ALREADY_CAPTURED
        if (response.status === 422) {
            const errorData = await response.json();
            const errorDetails = errorData.details?.[0];

            if (errorDetails?.issue === 'ORDER_ALREADY_CAPTURED') {

                // Instead of failing, get the order details
                const orderDetails = await getOrderDetails(orderId);

                // If the order is completed, treat as success
                if (orderDetails.status === 'COMPLETED') {

                    // Get the transaction ID from the capture
                    const captureId = orderDetails.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

                    return {
                        success: true,
                        transactionId: captureId,
                        details: orderDetails as PayPalCaptureDetails
                    };
                }
            }

            throw new Error(`Failed to capture PayPal payment: ${JSON.stringify(errorData)}`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to capture PayPal payment: ${response.status} ${errorText}`);
        }

        const data = await response.json() as PayPalCaptureDetails;

        // Extract the transaction ID from the capture response
        const transactionId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id || '';

        if (!transactionId) {
            logger.warn('No transaction ID found in PayPal capture response', { orderId });
        }

        return {
            success: true,
            transactionId,
            details: data
        };
    } catch (err) {
        // If it's an ORDER_ALREADY_CAPTURED error, try to handle it gracefully
        if (err instanceof Error && err.message.includes('ORDER_ALREADY_CAPTURED')) {

            try {
                // Get the order details to see if it's completed
                const orderDetails = await getOrderDetails(orderId);

                if (orderDetails.status === 'COMPLETED') {

                    // Extract capture ID if available
                    const captureId = orderDetails.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

                    return {
                        success: true,
                        transactionId: captureId,
                        details: orderDetails as PayPalCaptureDetails
                    };
                }
            } catch (detailsError) {
                logger.error('Error fetching order details after capture error', {
                    orderId,
                    error: detailsError instanceof Error ? detailsError.message : String(detailsError)
                });
                // Fall through to standard error handling
            }
        }

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

        const data = await response.json();
        return data;
    } catch (err) {
        throw err;
    }
}