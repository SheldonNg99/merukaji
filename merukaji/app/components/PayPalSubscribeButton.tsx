'use client';

import { useEffect, useRef, useState } from 'react';
import { loadPayPalScript } from '@/lib/paypal-client';
import { Loader2 } from 'lucide-react';
import {
    PayPalSubscribeButtonProps,
    PayPalSubscriptionData,
    PayPalButtonStyle,
    PayPalErrorType,
    PayPalNamespace
} from '@/types/paypal';

export default function PayPalSubscribeButton({
    planId,
    amount,
    currency = 'JPY',
    onSuccess,
    onError,
    onCancel,
    disabled = false
}: PayPalSubscribeButtonProps) {
    const paypalButtonRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (disabled) return;

        const initPayPal = async () => {
            try {
                setLoading(true);

                // Load the PayPal JS SDK
                const paypal = await loadPayPalScript() as unknown as PayPalNamespace;

                if (!paypal || !paypalButtonRef.current) {
                    throw new Error('Failed to load PayPal SDK');
                }

                // Clear any existing buttons
                paypalButtonRef.current.innerHTML = '';

                // Only create buttons if the Buttons function exists
                if (typeof paypal.Buttons === 'function') {
                    // Create the PayPal buttons with typed options
                    const buttonStyle: PayPalButtonStyle = {
                        shape: 'rect',
                        color: 'gold',
                        layout: 'vertical',
                        label: 'subscribe'
                    };

                    paypal.Buttons({
                        style: buttonStyle,
                        createSubscription: async (): Promise<string> => {
                            try {
                                // Call our API to create a subscription
                                const response = await fetch('/api/payment/create-checkout', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ planId })
                                });

                                if (!response.ok) {
                                    const errorData = await response.json();
                                    throw new Error(errorData.error || 'Failed to create subscription');
                                }

                                const data = await response.json();

                                // Return the subscription ID
                                return data.subscriptionId;
                            } catch (err) {
                                const error = err as Error;
                                console.error('Error creating subscription:', error);
                                onError(error);
                                throw error;
                            }
                        },
                        onApprove: (data: PayPalSubscriptionData): Promise<void> => {
                            // Subscription approved
                            if (data.subscriptionID) {
                                onSuccess({
                                    subscriptionId: data.subscriptionID
                                });

                                // Redirect to success page
                                window.location.href = `/upgrade?success=true&subscription_id=${data.subscriptionID}`;
                            }

                            // Return a promise to satisfy PayPal's expectations
                            return Promise.resolve();
                        },
                        onCancel: () => {
                            onCancel();
                        },
                        onError: (err: PayPalErrorType) => {
                            console.error('PayPal error:', err);
                            setError('Payment failed. Please try again.');
                            onError(err);
                        }
                    }).render(paypalButtonRef.current);
                } else {
                    throw new Error('PayPal Buttons function not available');
                }

                setError(null);
            } catch (err) {
                const error = err as Error;
                console.error('Failed to initialize PayPal:', error);
                setError('Failed to load payment system. Please try again later.');
                onError(error);
            } finally {
                setLoading(false);
            }
        };

        initPayPal();
    }, [planId, amount, currency, onSuccess, onError, onCancel, disabled]);

    if (disabled) {
        return (
            <button
                disabled
                className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center bg-gray-200 dark:bg-[#383838] text-gray-800 dark:text-gray-200 cursor-not-allowed"
            >
                Current Plan
            </button>
        );
    }

    if (loading) {
        return (
            <div className="w-full py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="ml-2">Loading payment options...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full py-3 px-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-center">
                {error}
                <button
                    onClick={() => window.location.reload()}
                    className="ml-2 underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div>
            <div ref={paypalButtonRef} className="paypal-button-container"></div>
        </div>
    );
}