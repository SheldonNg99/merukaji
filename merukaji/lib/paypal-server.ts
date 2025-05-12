// Updated implementation for lib/paypal-server.ts
import fetch from 'node-fetch';
import { logger } from './logger';
import { PayPalCaptureDetails } from '@/types/paypal';

// PayPal API configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://sandbox.paypal.com';

// Equivalent mapping for our credit packages
export const PRODUCT_IDS = {
    basic: process.env.NEXT_PUBLIC_PAYPAL_BASIC_PRODUCT_ID || '',
    standard: process.env.NEXT_PUBLIC_PAYPAL_STANDARD_PRODUCT_ID || '',
};

// Get PayPal access token
async function getAccessToken(): Promise<string> {
    try {
        logger.info('Obtaining PayPal access token');

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
            logger.error('Failed to get PayPal access token', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`Failed to get PayPal access token: ${response.status} ${errorText}`);
        }

        const data = await response.json() as { access_token: string };
        logger.info('PayPal access token obtained successfully');
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
        logger.info('Creating PayPal order', { productId, amount });
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

        logger.debug('PayPal create order payload', { payload });

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
            logger.error('Failed to create PayPal order', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`Failed to create PayPal order: ${response.status} ${errorText}`);
        }

        const data = await response.json() as {
            id: string,
            links: Array<{ href: string, rel: string, method: string }>
        };

        // Find the approval URL to redirect the user
        const approvalLink = data.links.find(link => link.rel === 'approve')?.href;

        if (!approvalLink) {
            logger.error('No approval link found in PayPal response', { orderId: data.id, links: data.links });
            throw new Error('No approval link found in PayPal response');
        }

        logger.info('PayPal order created successfully', {
            orderId: data.id,
            approvalUrl: approvalLink
        });

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
export async function capturePayment(orderId: string): Promise<{
    success: boolean,
    transactionId: string,
    details?: PayPalCaptureDetails
}> {
    try {
        logger.info('Capturing PayPal payment', { orderId });
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
                logger.info('Order already captured, fetching details instead', { orderId });

                // Instead of failing, get the order details
                const orderDetails = await getOrderDetails(orderId);

                // If the order is completed, treat as success
                if (orderDetails.status === 'COMPLETED') {
                    logger.info('Order is in COMPLETED state, treating capture as successful', { orderId });

                    // Get the transaction ID from the capture
                    const captureId = orderDetails.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

                    return {
                        success: true,
                        transactionId: captureId,
                        details: orderDetails as PayPalCaptureDetails
                    };
                }
            }

            // If not ORDER_ALREADY_CAPTURED or not COMPLETED, throw error
            logger.error('Failed to capture PayPal payment', {
                status: response.status,
                error: JSON.stringify(errorData),
                orderId
            });
            throw new Error(`Failed to capture PayPal payment: ${JSON.stringify(errorData)}`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('Failed to capture PayPal payment', {
                status: response.status,
                statusText: response.statusText,
                error: errorText,
                orderId
            });
            throw new Error(`Failed to capture PayPal payment: ${response.status} ${errorText}`);
        }

        const data = await response.json() as PayPalCaptureDetails;

        // Log full response for debugging
        logger.debug('PayPal capture response', {
            orderId,
            status: data.status,
            payer: data.payer?.payer_id
        });

        // Extract the transaction ID from the capture response
        const transactionId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id || '';

        if (!transactionId) {
            logger.warn('No transaction ID found in PayPal capture response', { orderId });
        }

        logger.info('PayPal payment captured successfully', {
            orderId,
            transactionId,
            status: data.status
        });

        return {
            success: true,
            transactionId,
            details: data
        };
    } catch (err) {
        // If it's an ORDER_ALREADY_CAPTURED error, try to handle it gracefully
        if (err instanceof Error && err.message.includes('ORDER_ALREADY_CAPTURED')) {
            logger.warn('Order already captured error, fetching order details', { orderId });

            try {
                // Get the order details to see if it's completed
                const orderDetails = await getOrderDetails(orderId);

                if (orderDetails.status === 'COMPLETED') {
                    logger.info('Order is COMPLETED despite capture error', { orderId });

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
        logger.info('Fetching PayPal order details', { orderId });
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
            logger.error('Failed to fetch PayPal order details', {
                status: response.status,
                statusText: response.statusText,
                error: errorText,
                orderId
            });
            throw new Error(`Failed to fetch PayPal order details: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        logger.info('PayPal order details retrieved successfully', { orderId });

        return data;
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