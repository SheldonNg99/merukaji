'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Info, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS, PRICE_IDS, isStripeConfigured } from '@/lib/stripe-client';
import { useToast } from '@/app/components/contexts/ToastContext';
import Link from 'next/link';

export default function UpgradePage() {
    const { data: session, status, update: updateSession } = useSession();
    const [pageLoading, setPageLoading] = useState(true);
    const [buttonLoading, setButtonLoading] = useState<string | null>(null);
    const [annualBilling, setAnnualBilling] = useState(true);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<{
        tier: string;
        status: string | null;
        interval: string | null;
        currentPeriodEnd: string | null;
    }>({
        tier: 'free',
        status: null,
        interval: null,
        currentPeriodEnd: null
    });

    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Debug logging (just once)
    useEffect(() => {
        console.log('Current session:', session);
    }, [session]);

    // Fetch subscription details on mount - but only once when status is ready
    useEffect(() => {
        async function loadSubscriptionDetails() {
            if (status !== 'loading') {
                try {
                    setPageLoading(true);
                    const response = await fetch('/api/payment/check-status');

                    // Handle non-JSON responses
                    const contentType = response.headers.get("content-type");
                    if (!contentType || !contentType.includes("application/json")) {
                        throw new Error('Server returned non-JSON response');
                    }

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to load subscription details');
                    }

                    console.log('Subscription data from API:', data);

                    // Update local subscription state
                    setSubscription({
                        tier: data.tier || 'free',
                        status: data.status,
                        interval: data.interval,
                        currentPeriodEnd: data.currentPeriodEnd
                    });

                    // Set the billing cycle based on subscription data
                    if (data.interval) {
                        setAnnualBilling(data.interval === 'year');
                    }
                } catch (error) {
                    console.error('Error fetching subscription details:', error);
                    showToast('Failed to load subscription details', 'error');
                } finally {
                    setPageLoading(false);
                }
            }
        }

        loadSubscriptionDetails();
    }, [status, showToast]);

    // Handle checkout result from URL parameters - only run once when params change
    useEffect(() => {
        if (!searchParams) return;

        const success = searchParams.get('success');
        const canceled = searchParams.get('canceled');
        const sessionId = searchParams.get('session_id');

        if (!success && !canceled) return;

        async function processCheckoutResult() {
            if (success && sessionId) {
                try {
                    setButtonLoading('checking-status');

                    const response = await fetch('/api/payment/check-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `Server error: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('Checkout result:', data);

                    if (data.success) {
                        // Force session update
                        await updateSession();

                        // Set success message
                        const tierName = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
                        setSuccessMessage(`Your subscription was successfully activated! You now have the ${tierName} plan.`);

                        // Update subscription data
                        const statusResponse = await fetch('/api/payment/check-status');
                        if (statusResponse.ok) {
                            const statusData = await statusResponse.json();
                            setSubscription({
                                tier: statusData.tier || 'free',
                                status: statusData.status,
                                interval: statusData.interval,
                                currentPeriodEnd: statusData.currentPeriodEnd
                            });
                        }

                        // Clean up URL params
                        try {
                            const url = new URL(window.location.href);
                            url.searchParams.delete('success');
                            url.searchParams.delete('session_id');
                            window.history.replaceState({}, '', url);
                        } catch (e) {
                            console.error('Error updating URL params:', e);
                        }
                    } else {
                        setErrorMessage(data.error || 'Failed to verify subscription status');
                    }
                } catch (error) {
                    console.error('Error checking subscription status:', error);
                    setErrorMessage('An unexpected error occurred. Please try again.');
                } finally {
                    setButtonLoading(null);
                }
            } else if (canceled) {
                setErrorMessage('Your subscription upgrade was canceled. You can try again when you are ready.');

                // Clean up URL params
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('canceled');
                    window.history.replaceState({}, '', url);
                } catch (e) {
                    console.error('Error updating URL params:', e);
                }
            }
        }

        processCheckoutResult();
    }, [searchParams, updateSession, showToast]);

    // Handle plan upgrade
    const handleUpgrade = async (planName: string) => {
        if (!session?.user) {
            router.push('/login');
            return;
        }

        // Check if Stripe is properly configured
        if (!isStripeConfigured()) {
            setErrorMessage('Payment system is not properly configured. Please contact support.');
            return;
        }

        setButtonLoading(planName);

        try {
            let priceId: string;

            if (planName === 'Pro') {
                priceId = annualBilling ? PRICE_IDS.pro.yearly : PRICE_IDS.pro.monthly;
            } else if (planName === 'Max') {
                priceId = annualBilling ? PRICE_IDS.max.yearly : PRICE_IDS.max.monthly;
            } else if (planName === 'Free') {
                // Handle downgrade to free plan
                showToast('Downgrading to Free plan is not yet implemented', 'warning');
                setButtonLoading(null);
                return;
            } else {
                setButtonLoading(null);
                return;
            }

            console.log('Creating checkout with price ID:', priceId);

            const response = await fetch('/api/payment/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    billingInterval: annualBilling ? 'yearly' : 'monthly',
                }),
            });

            // Check for errors before parsing JSON
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.url) {
                // Redirect to Stripe checkout
                window.location.href = data.url;
            } else {
                console.error('Failed to create checkout session:', data);
                setErrorMessage(data.error || 'Failed to create checkout session');
            }
        } catch (error) {
            console.error('Error creating checkout:', error);
            setErrorMessage('An unexpected error occurred. Please try again.');
        } finally {
            setButtonLoading(null);
        }
    };

    // Define plans
    const plans = [
        {
            name: 'Free',
            description: 'Basic functionality with limited features',
            price: 0,
            features: SUBSCRIPTION_PLANS.free.features,
            popular: false,
        },
        {
            name: 'Pro',
            description: 'For everyday productivity',
            price: annualBilling ? SUBSCRIPTION_PLANS.pro.yearlyPrice : SUBSCRIPTION_PLANS.pro.monthlyPrice,
            features: SUBSCRIPTION_PLANS.pro.features,
            popular: true,
        },
        {
            name: 'Max',
            description: '5-20x more usage than Pro',
            price: annualBilling ? SUBSCRIPTION_PLANS.max.yearlyPrice : SUBSCRIPTION_PLANS.max.monthlyPrice,
            features: SUBSCRIPTION_PLANS.max.features,
            popular: false,
        },
    ];

    // Check if this is the current plan based on subscription.tier
    const isCurrentPlan = (planName: string): boolean => {
        return planName.toLowerCase() === subscription.tier.toLowerCase();
    };

    if (status === 'loading' || pageLoading) {
        return (
            <div className="flex min-h-screen bg-[#f8f9fa] dark:bg-[#202120] items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-gray-700 dark:text-gray-300">Loading your subscription details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#f8f9fa] dark:bg-[#202120] transition-colors">
            <main className="flex-1">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Configuration warning */}
                    {!isStripeConfigured() && (
                        <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start shadow-sm dark:shadow-md">
                            <AlertTriangle className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-yellow-700 dark:text-yellow-300 font-medium">Payment system is not fully configured</p>
                                <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                                    The payment system is currently in development mode. Please contact support for assistance.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Page title */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                            Choose the Right Plan for You
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            Upgrade to unlock more features and get the most out of your video summaries
                        </p>
                    </div>

                    {/* Success/Error Messages */}
                    {successMessage && (
                        <div className="mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start shadow-sm dark:shadow-md">
                            <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-green-700 dark:text-green-300 font-medium">{successMessage}</p>
                                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                                    Your changes will be reflected in your account immediately.
                                </p>
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-sm dark:shadow-md">
                            <p className="text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
                        </div>
                    )}

                    {/* Billing toggle */}
                    <div className="flex justify-center mb-12">
                        {/* Existing billing toggle code */}
                        <div className="bg-gray-100 dark:bg-[#2E2E2E] p-1 rounded-lg inline-flex items-center shadow-sm dark:shadow-md">
                            <button
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${annualBilling
                                    ? 'bg-white dark:bg-[#202120] text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#383838]'
                                    }`}
                                onClick={() => setAnnualBilling(true)}
                            >
                                Annual (Save 10%)
                            </button>
                            <button
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!annualBilling
                                    ? 'bg-white dark:bg-[#202120] text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#383838]'
                                    }`}
                                onClick={() => setAnnualBilling(false)}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    {/* Plan cards */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan) => {
                            const currentPlan = isCurrentPlan(plan.name);
                            return (
                                <div
                                    key={plan.name}
                                    className={`bg-white dark:bg-[#2E2E2E] rounded-xl overflow-hidden border shadow-sm dark:shadow-lg transition-all duration-200 ${plan.popular
                                        ? 'border-[#FFAB5B] dark:border-[#FFAB5B]/70'
                                        : 'border-gray-200 dark:border-gray-700'
                                        } ${currentPlan ? 'ring-2 ring-[#FFAB5B]' : 'hover:shadow-md dark:hover:shadow-xl'}`}
                                >
                                    {plan.popular && (
                                        <div className="bg-[#FFAB5B] text-white text-sm font-medium py-1 text-center">
                                            Most Popular
                                        </div>
                                    )}
                                    <div className="p-6">
                                        <div className="mb-5">
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h2>
                                            <p className="text-gray-600 dark:text-gray-300">{plan.description}</p>
                                        </div>

                                        <div className="mb-6">
                                            {plan.price === 0 ? (
                                                <div className="text-3xl font-bold text-gray-900 dark:text-white">Free</div>
                                            ) : (
                                                <div className="flex items-baseline">
                                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">USD {plan.price}</span>
                                                    <span className="text-gray-600 dark:text-gray-300 ml-2 text-sm">
                                                        / month {annualBilling ? 'billed annually' : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {(plan.name === 'Pro' || plan.name === 'Max') && annualBilling && (
                                                <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Info className="h-4 w-4 mr-1 text-[#FFAB5B] dark:text-[#FFAB5B]" />
                                                    Pay annually to save 10%
                                                </div>
                                            )}
                                        </div>

                                        {currentPlan ? (
                                            <button
                                                disabled
                                                className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center bg-gray-200 dark:bg-[#383838] text-gray-800 dark:text-gray-200 cursor-not-allowed"
                                            >
                                                Current Plan
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleUpgrade(plan.name)}
                                                disabled={buttonLoading !== null}
                                                className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-colors ${plan.popular
                                                    ? 'bg-[#E99947] hover:bg-[#FF9B3B] text-white shadow-sm'
                                                    : 'bg-gray-900 dark:bg-[#383838] hover:bg-black dark:hover:bg-[#434342] text-white shadow-sm'
                                                    } ${buttonLoading !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {buttonLoading === plan.name ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        {plan.name === 'Free' ? 'Switch to Free' : `Get ${plan.name} Plan`}
                                                        {plan.name !== 'Free' && <ArrowRight className="ml-2 h-4 w-4" />}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    <div className="border-t border-gray-100 dark:border-gray-600 p-6">
                                        <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                                            {plan.name === 'Free' ? "What's included:" : `Everything in ${plan.name === 'Pro' ? 'Free' : 'Pro'}, plus:`}
                                        </h3>
                                        <ul className="space-y-3">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex">
                                                    <CheckCircle2 className="h-5 w-5 text-[#E99947] flex-shrink-0 mr-3" />
                                                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer text */}
                    <div className="mt-12 text-center text-gray-600 dark:text-gray-400 text-sm">
                        <p>Prices shown do not include applicable tax. Usage limits may apply.</p>
                        <p className="mt-2">
                            Need a custom plan?{' '}
                            <Link href="/contact" className="text-[#FFAB5B] hover:text-[#FF9B3B] font-medium">
                                Contact us
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}