'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CalendarClock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/contexts/ToastContext';
import { UserSubscriptionStatus } from '@/types/stripe';

export default function SubscriptionDetails() {
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<UserSubscriptionStatus | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const router = useRouter();
    const { showToast } = useToast();

    useEffect(() => {
        const fetchSubscriptionDetails = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/payment/check-status');
                if (!response.ok) {
                    throw new Error('Failed to fetch subscription details');
                }

                const data = await response.json();
                console.log('Subscription data:', data); // For debugging

                if (data.error) {
                    showToast(data.error, 'warning');
                }

                setSubscription(data);
            } catch (error) {
                showToast('Failed to load subscription details', 'error');
                console.error('Error fetching subscription details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscriptionDetails();
    }, [showToast]);

    const handleManageSubscription = async () => {
        try {
            setPortalLoading(true);

            const response = await fetch('/api/payment/portal');

            console.log('Portal response status:', response.status, response.statusText);

            const data = await response.json();

            console.log('Portal response data:', data);

            if (!response.ok) {
                throw new Error(data.error || `Failed to generate portal link (${response.status})`);
            }

            if (!data.url) {
                throw new Error('No portal URL returned from server');
            }

            // Navigate to the PayPal portal
            window.location.href = data.url;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to open subscription management portal';
            showToast(errorMessage, 'error');
            console.error('Error opening portal:', error);
        } finally {
            setPortalLoading(false);
        }
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleUpgrade = () => {
        router.push('/upgrade');
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Current Plan</h2>
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Format subscription tier for display
    const formattedTier = subscription?.tier
        ? subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)
        : 'Free';

    // Determine features based on tier
    const features = {
        free: [
            '3 free summaries per day',
            'Basic summary length',
            'Standard quality model'
        ],
        pro: [
            'Up to 20 summaries per day',
            'Extended summary length',
            'Faster response time',
            'Save summaries to your library'
        ],
        max: [
            'Unlimited summaries',
            'Comprehensive summary length',
            'Priority processing',
            'Advanced AI model selection',
            'Save and organize summaries'
        ]
    };

    const tierFeatures = subscription?.tier &&
        ['free', 'pro', 'max'].includes(subscription.tier)
        ? features[subscription.tier as 'free' | 'pro' | 'max']
        : features.free;

    return (
        <div className="space-y-6">
            {/* Comprehensive Plan Card with All Information */}
            <div className="bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Subscription Details</h2>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-[#383838] text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                                    {formattedTier} Plan
                                </span>
                                {subscription?.status === 'active' && (
                                    <span className="text-green-600 dark:text-green-400 text-sm flex items-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                                        Active
                                    </span>
                                )}
                                {subscription?.status === 'canceled' && (
                                    <span className="text-orange-600 dark:text-orange-400 text-sm flex items-center">
                                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-1.5"></span>
                                        Canceled
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-3">
                                {subscription?.tier === 'free' ? 'Basic functionality with limited features.' : 'Premium features with enhanced capabilities.'}
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                {tierFeatures.map((feature, idx) => (
                                    <li key={idx} className="flex items-center">
                                        <svg className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7.75 12.75L10 15L16.25 8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex-shrink-0">
                            {subscription?.tier === 'free' ? (
                                <button
                                    onClick={handleUpgrade}
                                    className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white rounded-lg transition-all shadow-sm"
                                >
                                    Upgrade to Premium
                                </button>
                            ) : (
                                <button
                                    onClick={handleManageSubscription}
                                    disabled={portalLoading}
                                    className="w-full md:w-auto px-5 py-2.5 bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg transition-all shadow-sm"
                                >
                                    {portalLoading ? 'Loading...' : 'Manage in PayPal'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Payment details section (conditionally shown) */}
                    {subscription?.tier !== 'free' && (
                        <div className="p-4 bg-gray-50 dark:bg-[#383838] rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
                            <div className="flex flex-col md:flex-row md:justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Payment Information</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        For payment methods and billing details, use the Manage Subscription button.
                                    </p>
                                </div>
                                {subscription?.amount && subscription?.interval && (
                                    <div className="text-right">
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">${subscription.amount}/{subscription.interval === 'month' ? 'mo' : 'yr'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Subscription details footer */}
                {subscription?.tier !== 'free' && subscription?.currentPeriodEnd && (
                    <div className="bg-gray-50 dark:bg-[#262626] px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 bg-gray-100 dark:bg-[#383838] p-2 rounded-lg">
                                <CalendarClock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Renewal Information</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    {subscription.cancelAtPeriodEnd ?
                                        `Your subscription will cancel on ${formatDate(subscription.currentPeriodEnd)}.` :
                                        `Your subscription renews on ${formatDate(subscription.currentPeriodEnd)}.`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {subscription?.tier === 'free' && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 px-6 py-4 border-t border-orange-100 dark:border-orange-800/30">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 bg-orange-100 dark:bg-orange-800/40 p-2 rounded-lg">
                                <CreditCard className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Premium Plan Benefits</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Upgrade to Premium for unlimited summaries, longer detailed summaries, and higher quality AI models.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Help section */}
            <div className="bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Need help with your subscription?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            If you have any questions about your subscription or billing, please contact us at <a href="mailto:support@merukaji.com" className="text-orange-500 hover:text-orange-600">support@merukaji.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}