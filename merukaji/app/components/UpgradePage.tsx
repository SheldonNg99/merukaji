// app/components/UpgradePage.tsx
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/app/components/contexts/ToastContext';
import Link from 'next/link';

// Credit package type definition
interface CreditPackage {
    id: string;
    name: string;
    creditAmount: number;
    price: number;
    description: string;
    productId: string;
}

export default function UpgradePage() {
    const { status, update: updateSession } = useSession();
    const [pageLoading, setPageLoading] = useState(true);
    const [buttonLoading, setButtonLoading] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
    const [creditBalance, setCreditBalance] = useState<number>(0);

    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Fetch credit packages and user credit balance on mount
    useEffect(() => {
        async function loadData() {
            if (status !== 'loading') {
                try {
                    setPageLoading(true);

                    // Fetch credit packages
                    const packagesResponse = await fetch('/api/credits/packages');
                    if (!packagesResponse.ok) {
                        throw new Error('Failed to load credit packages');
                    }
                    const packagesData = await packagesResponse.json();

                    // Fetch user's credit balance
                    const balanceResponse = await fetch('/api/credits/balance');
                    if (!balanceResponse.ok) {
                        throw new Error('Failed to load credit balance');
                    }
                    const balanceData = await balanceResponse.json();

                    setCreditPackages(packagesData.packages || []);
                    setCreditBalance(balanceData.balance || 0);
                } catch (error) {
                    showToast('Failed to load credit packages', 'error');
                    console.error('Error loading data:', error);
                } finally {
                    setPageLoading(false);
                }
            }
        }

        loadData();
    }, [status, showToast]);

    // Handle checkout result from URL parameters
    useEffect(() => {
        if (!searchParams) return;

        const success = searchParams.get('success');
        const canceled = searchParams.get('canceled');
        const orderId = searchParams.get('orderId');

        if (!success && !canceled) return;

        async function processCheckoutResult() {
            if (success && orderId) {
                try {
                    setButtonLoading('checking-status');

                    // Verify the payment status
                    const response = await fetch('/api/payment/check-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Server error: ${response.status}`);
                    }

                    const data = await response.json();

                    if (data.success) {
                        // Force session update
                        await updateSession();

                        // Set success message
                        setSuccessMessage(`Your purchase was successful! ${data.credits} credits have been added to your account.`);

                        // Update credit balance
                        setCreditBalance(prevBalance => prevBalance + (data.credits || 0));

                        // Clean up URL params
                        router.replace('/upgrade');
                    } else {
                        setErrorMessage(data.error || 'Failed to verify payment status');
                    }
                } catch (error) {
                    console.error('Error checking payment status:', error);
                    setErrorMessage('An unexpected error occurred. Please try again.');
                } finally {
                    setButtonLoading(null);
                }
            } else if (canceled) {
                setErrorMessage('Your purchase was canceled. You can try again when you are ready.');
                router.replace('/upgrade');
            }
        }

        processCheckoutResult();
    }, [searchParams, updateSession, showToast, router]);

    // Handle payment button click
    const handlePurchase = async (packageId: string) => {
        setButtonLoading(packageId);
        try {
            const response = await fetch('/api/payment/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ packageId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout session');
            }

            // Redirect to PayPal checkout
            window.location.href = data.url;
        } catch (error) {
            console.error('Purchase error:', error);
            showToast('Failed to start checkout process', 'error');
            setButtonLoading(null);
        }
    };

    if (status === 'loading' || pageLoading) {
        return (
            <div className="flex min-h-screen bg-[#f8f9fa] dark:bg-[#202120] items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-gray-700 dark:text-gray-300">Loading credit packages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#f8f9fa] dark:bg-[#202120] transition-colors">
            <main className="flex-1">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Page title with credit balance */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                            Buy Credits
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-4">
                            Purchase credits to generate more summaries
                        </p>
                        <div className="inline-block px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-700 dark:text-gray-300">Current balance:</span>
                            <span className="ml-2 font-bold text-orange-500">{creditBalance} credits</span>
                        </div>
                    </div>

                    {/* Success/Error Messages */}
                    {successMessage && (
                        <div className="mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start shadow-sm dark:shadow-md">
                            <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-green-700 dark:text-green-300 font-medium">{successMessage}</p>
                                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                                    You can now use these credits to generate summaries.
                                </p>
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-sm dark:shadow-md">
                            <p className="text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
                        </div>
                    )}

                    {/* Credit packages */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {creditPackages.map((pkg) => (
                            <div
                                key={pkg.id}
                                className={`bg-white dark:bg-[#2E2E2E] rounded-xl overflow-hidden border shadow-sm dark:shadow-lg transition-all duration-200 
                                    ${pkg.name.includes('Standard')
                                        ? 'border-[#FFAB5B] dark:border-[#FFAB5B]/70'
                                        : 'border-gray-200 dark:border-gray-700'
                                    } hover:shadow-md dark:hover:shadow-xl`}
                            >
                                {pkg.name.includes('Standard') && (
                                    <div className="bg-[#FFAB5B] text-white text-sm font-medium py-1 text-center">
                                        Best Value
                                    </div>
                                )}
                                <div className="p-6">
                                    <div className="mb-5">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{pkg.name}</h2>
                                        <p className="text-gray-600 dark:text-gray-300">{pkg.description}</p>
                                    </div>

                                    <div className="mb-6">
                                        <div className="flex items-baseline">
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">¥{pkg.price.toLocaleString()}</span>
                                            <span className="text-gray-600 dark:text-gray-300 ml-2 text-sm">
                                                for {pkg.creditAmount} credits
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                            ¥{Math.round(pkg.price / pkg.creditAmount)} per credit
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handlePurchase(pkg.id)}
                                        disabled={buttonLoading !== null}
                                        className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center 
                                            ${pkg.name.includes('Standard')
                                                ? 'bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white'
                                                : 'bg-gray-900 dark:bg-[#383838] hover:bg-black dark:hover:bg-[#434342] text-white'
                                            } 
                                            shadow-sm transition-colors
                                            ${buttonLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {buttonLoading === pkg.id ? (
                                            <div className="flex items-center">
                                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                <span>Processing...</span>
                                            </div>
                                        ) : (
                                            <>Buy Now</>
                                        )}
                                    </button>
                                </div>

                                <div className="border-t border-gray-100 dark:border-gray-600 p-6">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                                        What you can do:
                                    </h3>
                                    <ul className="space-y-3">
                                        <li className="flex">
                                            <CheckCircle2 className="h-5 w-5 text-[#E99947] flex-shrink-0 mr-3" />
                                            <span className="text-gray-700 dark:text-gray-300">Generate {Math.floor(pkg.creditAmount / 2)} comprehensive summaries</span>
                                        </li>
                                        <li className="flex">
                                            <CheckCircle2 className="h-5 w-5 text-[#E99947] flex-shrink-0 mr-3" />
                                            <span className="text-gray-700 dark:text-gray-300">Generate {pkg.creditAmount} short summaries</span>
                                        </li>
                                        <li className="flex">
                                            <CheckCircle2 className="h-5 w-5 text-[#E99947] flex-shrink-0 mr-3" />
                                            <span className="text-gray-700 dark:text-gray-300">Save summaries to your library</span>
                                        </li>
                                        <li className="flex">
                                            <CheckCircle2 className="h-5 w-5 text-[#E99947] flex-shrink-0 mr-3" />
                                            <span className="text-gray-700 dark:text-gray-300">Access advanced AI models</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer text */}
                    <div className="mt-12 text-center text-gray-600 dark:text-gray-400 text-sm">
                        <p>Prices shown include applicable tax (10% consumption tax).</p>
                        <p className="mt-2">
                            Need a custom package?{' '}
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