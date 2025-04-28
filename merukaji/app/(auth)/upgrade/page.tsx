'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS, PRICE_IDS } from '@/lib/stripe-client';
import Loading from '@/app/components/ui/Loading';
import Link from 'next/link';

export default function UpgradePage() {
    const { data: session, status, update: updateSession } = useSession();
    const [pageReady, setPageReady] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);
    const [annualBilling, setAnnualBilling] = useState(true);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [currentBillingCycle, setCurrentBillingCycle] = useState<'monthly' | 'yearly' | null>(null);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const fetchSubscriptionDetails = async () => {
            if (status === 'authenticated') {
                try {
                    const response = await fetch('/api/payment/check-status');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.subscription && data.subscription.interval) {
                            setCurrentBillingCycle(data.subscription.interval === 'year' ? 'yearly' : 'monthly');
                        }
                    }
                } catch (error) {
                    console.error('Error fetching subscription details:', error);
                } finally {
                    setPageReady(true);
                }
            }
        };

        fetchSubscriptionDetails();
    }, [status]);

    useEffect(() => {
        const handleCheckoutResult = async () => {
            const success = searchParams.get('success');
            const canceled = searchParams.get('canceled');
            const sessionId = searchParams.get('session_id');

            if (success && sessionId) {
                try {
                    setLoading('checking-status');

                    const response = await fetch('/api/payment/check-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId }),
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        await updateSession();
                        router.refresh();

                        if (data.subscription && data.subscription.interval) {
                            setCurrentBillingCycle(data.subscription.interval === 'year' ? 'yearly' : 'monthly');
                        }

                        setSuccessMessage(`Your subscription was successfully activated! You are now on the ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)} plan.`);

                        const url = new URL(window.location.href);
                        url.searchParams.delete('success');
                        url.searchParams.delete('session_id');
                        window.history.replaceState({}, '', url);
                    } else {
                        setErrorMessage(data.error || 'Failed to verify subscription status. Please contact support.');
                    }
                } catch (error) {
                    console.error('Error checking subscription status:', error);
                    setErrorMessage('An unexpected error occurred. Please contact support.');
                } finally {
                    setLoading(null);
                }
            } else if (canceled) {
                setErrorMessage('Your subscription upgrade was canceled. You can try again when you are ready.');
                const url = new URL(window.location.href);
                url.searchParams.delete('canceled');
                window.history.replaceState({}, '', url);
            }
        };

        handleCheckoutResult();
    }, [searchParams, updateSession, router]);

    const handleUpgrade = async (planName: string) => {
        if (!session?.user) {
            router.push('/login');
            return;
        }

        setLoading(planName);

        try {
            let priceId: string;

            if (planName === 'Pro') {
                priceId = annualBilling ? PRICE_IDS.pro.yearly : PRICE_IDS.pro.monthly;
            } else if (planName === 'Max') {
                priceId = annualBilling ? PRICE_IDS.max.yearly : PRICE_IDS.max.monthly;
            } else {
                return;
            }

            const response = await fetch('/api/payment/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    billingInterval: annualBilling ? 'yearly' : 'monthly',
                }),
            });

            const data = await response.json();

            if (response.ok && data.url) {
                window.location.href = data.url;
            } else {
                console.error('Failed to create checkout session:', data);
                setErrorMessage(data.error || 'Failed to create checkout session');
            }
        } catch (error) {
            console.error('Error:', error);
            setErrorMessage('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    const userTier = session?.user?.tier || 'free';

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

    if (status === 'loading' || !pageReady) {
        return <Loading message="Loading your subscription..." />;
    }

    return (
        <div className="flex min-h-screen bg-[#fffefe] dark:bg-gray-900 transition-colors">
            <main className="flex-1">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                            Choose the Right Plan for You
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Upgrade to unlock more features and get the most out of your video summaries
                        </p>
                    </div>

                    {/* Success/Error Messages */}
                    {successMessage && (
                        <div className="mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start">
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
                        <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <p className="text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
                        </div>
                    )}

                    {/* Plans */}
                    <div className="flex justify-center mb-12">
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex items-center">
                            <button
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${annualBilling
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                onClick={() => setAnnualBilling(true)}
                            >
                                Annual (Save 10%)
                            </button>
                            <button
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!annualBilling
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                onClick={() => setAnnualBilling(false)}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan) => {
                            const isCurrentPlan =
                                (plan.name.toLowerCase() === userTier) &&
                                (plan.name === 'Free' ||
                                    (annualBilling && currentBillingCycle === 'yearly') ||
                                    (!annualBilling && currentBillingCycle === 'monthly'));

                            return (
                                <div
                                    key={plan.name}
                                    className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden border ${plan.popular
                                        ? 'border-[#FFAB5B] shadow-lg'
                                        : 'border-gray-200 dark:border-gray-700'
                                        } ${isCurrentPlan ? 'ring-2 ring-[#FFAB5B]' : ''}`}
                                >
                                    {plan.popular && (
                                        <div className="bg-[#FFAB5B] text-white text-sm font-medium py-1 text-center">
                                            Most Popular
                                        </div>
                                    )}
                                    <div className="p-6">
                                        <div className="mb-5">
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h2>
                                            <p className="text-gray-600 dark:text-gray-400">{plan.description}</p>
                                        </div>

                                        <div className="mb-6">
                                            {plan.price === 0 ? (
                                                <div className="text-3xl font-bold text-gray-900 dark:text-white">Free</div>
                                            ) : (
                                                <div className="flex items-baseline">
                                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">USD {plan.price}</span>
                                                    <span className="text-gray-600 dark:text-gray-400 ml-2 text-sm">
                                                        / month {annualBilling ? 'billed annually' : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {(plan.name === 'Pro' || plan.name === 'Max') && annualBilling && (
                                                <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Info className="h-4 w-4 mr-1" />
                                                    Pay annually to save 10%
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleUpgrade(plan.name)}
                                            disabled={loading === plan.name || isCurrentPlan}
                                            className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-colors ${isCurrentPlan
                                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 cursor-not-allowed'
                                                : plan.popular
                                                    ? 'bg-[#E99947] hover:bg-[#FF9B3B] text-white'
                                                    : 'bg-gray-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white'
                                                } ${loading === plan.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {loading === plan.name ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    {isCurrentPlan ? 'Current Plan' : plan.name === 'Free' ? 'Switch to Free' : `Get ${plan.name} Plan`}
                                                    {!isCurrentPlan && plan.name !== 'Free' && <ArrowRight className="ml-2 h-4 w-4" />}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="border-t border-gray-100 dark:border-gray-700 p-6">
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
