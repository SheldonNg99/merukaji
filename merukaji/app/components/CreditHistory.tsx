// app/components/CreditHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, RefreshCw, Calendar, Loader2, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/contexts/ToastContext';
import { CreditTransaction, PurchaseTransaction } from '@/types/paypal';


export default function CreditHistory() {
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [credits, setCredits] = useState<CreditTransaction[]>([]);
    const [transactions, setTransactions] = useState<PurchaseTransaction[]>([]);
    const [nextReset, setNextReset] = useState<Date | null>(null);
    const router = useRouter();
    const { showToast } = useToast();

    useEffect(() => {
        const fetchCreditHistory = async () => {
            try {
                setLoading(true);

                // Fetch credit details from the new endpoint
                const response = await fetch('/api/payment/portal');

                if (!response.ok) {
                    throw new Error('Failed to fetch credit history');
                }

                const data = await response.json();

                setBalance(data.balance || 0);
                setCredits(data.credits || []);
                setTransactions(data.transactions || []);

                // Calculate next reset based on last credit reset if available
                if (data.nextReset) {
                    setNextReset(new Date(data.nextReset));
                }
            } catch (error) {
                showToast('Failed to load credit history', 'error');
                console.error('Error fetching credit history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCreditHistory();
    }, [showToast]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleBuyCredits = () => {
        router.push('/upgrade');
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Credit Balance</h2>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Credit Balance Card */}
            <div className="bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Credit Balance</h2>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-block px-3 py-1.5 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-medium rounded-lg">
                                    {balance} Credits Available
                                </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-3">
                                Use credits to generate summaries of YouTube videos.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <li className="flex items-center">
                                    <Coins className="h-4 w-4 text-orange-500 mr-2" />
                                    <span>1 credit = 1 short summary</span>
                                </li>
                                <li className="flex items-center">
                                    <Coins className="h-4 w-4 text-orange-500 mr-2" />
                                    <span>2 credits = 1 comprehensive summary</span>
                                </li>
                                {nextReset && (
                                    <li className="flex items-center">
                                        <RefreshCw className="h-4 w-4 text-green-500 mr-2" />
                                        <span>Next free credit reset: {formatDate(nextReset.toISOString())}</span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="flex-shrink-0">
                            <button
                                onClick={handleBuyCredits}
                                className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white rounded-lg transition-all shadow-sm"
                            >
                                Buy More Credits
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="border-t border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Recent Transactions</h3>

                        {credits.length === 0 && transactions.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-4">
                                No transactions yet
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {/* Credit usage transactions */}
                                {credits.map((credit, index) => (
                                    <div
                                        key={`credit-${index}`}
                                        className="flex items-start justify-between p-3 bg-gray-50 dark:bg-[#383838] rounded-lg"
                                    >
                                        <div className="flex items-start">
                                            <div className={`p-2 rounded-md ${credit.amount > 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'} mr-3`}>
                                                {credit.amount > 0 ? (
                                                    <ShoppingBag className="h-5 w-5 text-green-500 dark:text-green-400" />
                                                ) : (
                                                    <Coins className="h-5 w-5 text-red-500 dark:text-red-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    {credit.description}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDate(credit.date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`font-medium ${credit.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {credit.amount > 0 ? '+' : ''}{credit.amount}
                                        </div>
                                    </div>
                                ))}

                                {/* Purchase transactions */}
                                {transactions.map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-start justify-between p-3 bg-gray-50 dark:bg-[#383838] rounded-lg"
                                    >
                                        <div className="flex items-start">
                                            <div className={`p-2 rounded-md bg-blue-100 dark:bg-blue-900/20 mr-3`}>
                                                <ShoppingBag className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    Purchase: {transaction.package}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDate(transaction.date)} • {transaction.status}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium text-gray-800 dark:text-gray-200">
                                                {transaction.currency} {transaction.amount}
                                            </div>
                                            <div className="text-xs text-green-600 dark:text-green-400">
                                                +{transaction.credits} credits
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tips card */}
            <div className="bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Using Your Credits</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Credits are deducted when you generate summaries. Short summaries cost 1 credit, while comprehensive summaries cost 2 credits.
                            New users receive 3 free credits to start, and free credits are refreshed every 30 days.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}