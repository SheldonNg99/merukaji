'use client';

import { useState } from 'react';
import { CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function UpgradePage() {
    const { data: session, status } = useSession();
    const [annualBilling, setAnnualBilling] = useState(true);

    // Sample plans data - this would come from your backend in a real implementation
    const plans = [
        {
            name: 'Free',
            description: 'Basic video summarization',
            price: 0,
            priceId: 'price_free',
            features: [
                'Limited to 3 summaries per day',
                'Basic summary length',
                'Standard response time',
                'Public videos only'
            ],
        },
        {
            name: 'Pro',
            description: 'For everyday productivity',
            price: annualBilling ? 17 : 19,
            priceId: annualBilling ? 'price_pro_annual' : 'price_pro_monthly',
            features: [
                'Up to 20 summaries per day',
                'Extended summary length',
                'Faster response time',
                'Save summaries to your library',
                'Public and unlisted videos'
            ],
            popular: true,
        },
        {
            name: 'Max',
            description: '5-20x more usage than Pro',
            price: annualBilling ? 100 : 120,
            priceId: annualBilling ? 'price_max_annual' : 'price_max_monthly',
            features: [
                'Unlimited summaries',
                'Comprehensive summary length',
                'Priority processing',
                'Save and organize summaries',
                'Full video library management',
                'Private video support with account linking',
                'Advanced AI model selection'
            ],
        },
    ];

    const handleUpgrade = (planName: string, priceId: string) => {
        // This would connect to your Stripe checkout in a real implementation
        console.log(`Upgrading to ${planName} with price ID ${priceId}`);
        // Redirect to checkout or payment processing
    };

    return (
        <div className="flex min-h-screen">
            <main className={`flex-1 ${session ? 'lg:ml-16' : ''}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                            Choose the Right Plan for You
                        </h1>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                            Upgrade to unlock more features and get the most out of your video summaries
                        </p>
                    </div>

                    {/* Billing toggle */}
                    <div className="flex justify-center mb-12">
                        <div className="bg-gray-100 p-1 rounded-lg inline-flex items-center">
                            <button
                                className={`px-4 py-2 rounded-md text-sm font-medium ${annualBilling
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                onClick={() => setAnnualBilling(true)}
                            >
                                Annual (Save 10%)
                            </button>
                            <button
                                className={`px-4 py-2 rounded-md text-sm font-medium ${!annualBilling
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-700 hover:bg-gray-50'
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
                                className={`bg-white rounded-xl overflow-hidden border ${plan.popular ? 'border-[#FFAB5B] shadow-lg' : 'border-gray-200'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="bg-[#FFAB5B] text-white text-sm font-medium py-1 text-center">
                                        Most Popular
                                    </div>
                                )}
                                <div className="p-6">
                                    <div className="mb-5">
                                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h2>
                                        <p className="text-gray-600">{plan.description}</p>
                                    </div>

                                    <div className="mb-6">
                                        {plan.price === 0 ? (
                                            <div className="text-3xl font-bold text-gray-900">Free</div>
                                        ) : (
                                            <div className="flex items-baseline">
                                                <span className="text-3xl font-bold text-gray-900">USD {plan.price}</span>
                                                <span className="text-gray-600 ml-2 text-sm">
                                                    / month {annualBilling ? 'billed annually' : ''}
                                                </span>
                                            </div>
                                        )}

                                        {plan.name === 'Pro' && annualBilling && (
                                            <div className="flex items-center mt-2 text-sm text-gray-600">
                                                <Info className="h-4 w-4 mr-1" />
                                                Pay annually to save 10%
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleUpgrade(plan.name, plan.priceId)}
                                        className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center ${plan.name === 'Free'
                                            ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                            : plan.popular
                                                ? 'bg-[#E99947] hover:bg-[#FF9B3B] text-white'
                                                : 'bg-gray-900 hover:bg-black text-white'
                                            }`}
                                    >
                                        {plan.name === 'Free'
                                            ? 'Current Plan'
                                            : `Get ${plan.name} Plan`}
                                        {plan.name !== 'Free' && <ArrowRight className="ml-2 h-4 w-4" />}
                                    </button>
                                </div>

                                <div className="border-t border-gray-100 p-6">
                                    <h3 className="font-medium text-gray-900 mb-4">
                                        {plan.name === 'Free' ? 'What\'s included:' : `Everything in ${plan.name === 'Pro' ? 'Free' : 'Pro'}, plus:`}
                                    </h3>
                                    <ul className="space-y-3">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex">
                                                <CheckCircle2 className="h-5 w-5 text-[#E99947] flex-shrink-0 mr-3" />
                                                <span className="text-gray-700">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center text-gray-600 text-sm">
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