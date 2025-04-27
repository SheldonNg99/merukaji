'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { SUBSCRIPTION_PLANS, PRICE_IDS } from '@/lib/stripe';
import Link from 'next/link';

export default function UpgradePage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState<string | null>(null);
    const [annualBilling, setAnnualBilling] = useState(true);
    const searchParams = useSearchParams();

    useEffect(() => {
        // Check for success/cancel from Stripe
        if (searchParams.get('success')) {
            // Handle successful payment
            // You might want to show a success message or redirect
        }
        if (searchParams.get('canceled')) {
            // Handle canceled payment
            // You might want to show a message that payment was canceled
        }
    }, [searchParams]);

    const handleUpgrade = async (planName: string) => {
        if (!session?.user) {
            // Redirect to login
            window.location.href = '/login';
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId,
                    billingInterval: annualBilling ? 'yearly' : 'monthly',
                }),
            });

            const { url } = await response.json();

            if (url) {
                window.location.href = url;
            } else {
                // Handle error
                console.error('Failed to create checkout session');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(null);
        }
    };

    // Create plans array from SUBSCRIPTION_PLANS
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

    return (
        <div className="flex min-h-screen bg-white dark:bg-gray-900 transition-colors">
            <main className={`flex-1 ${session ? '' : ''}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                            Choose the Right Plan for You
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Upgrade to unlock more features and get the most out of your video summaries
                        </p>
                    </div>

                    {/* Billing toggle */}
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

                    {/* Plans */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden border ${plan.popular
                                    ? 'border-[#FFAB5B] shadow-lg'
                                    : 'border-gray-200 dark:border-gray-700'
                                    }`}
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

                                        {plan.name === 'Pro' && annualBilling && (
                                            <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Info className="h-4 w-4 mr-1" />
                                                Pay annually to save 10%
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleUpgrade(plan.name)}
                                        disabled={loading === plan.name}
                                        className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-colors ${plan.name === 'Free'
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            : plan.popular
                                                ? 'bg-[#E99947] hover:bg-[#FF9B3B] text-white'
                                                : 'bg-gray-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white'
                                            } ${loading === plan.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {loading === plan.name ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                {plan.name === 'Free'
                                                    ? 'Current Plan'
                                                    : `Get ${plan.name} Plan`}
                                                {plan.name !== 'Free' && <ArrowRight className="ml-2 h-4 w-4" />}
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="border-t border-gray-100 dark:border-gray-700 p-6">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                                        {plan.name === 'Free' ? 'What\'s included:' : `Everything in ${plan.name === 'Pro' ? 'Free' : 'Pro'}, plus:`}
                                    </h3>
                                    <ul className="space-y-3">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex">
                                                <CheckCircle2 className="h-5 w-5 text-[#E99947] flex-shrink-0 mr-3" />
                                                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center text-gray-600 dark:text-gray-400 text-sm">
                        <p>Prices shown do not include applicable tax. Usage limits may apply.</p>
                        <p className="mt-2">
                            Need a custom plan? <Link href="/contact" className="text-[#FFAB5B] hover:text-[#FF9B3B] font-medium">Contact us</Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}