'use client';

import { useState, useEffect } from 'react';
import { CreditCard, User, Check, Moon, Sun } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useToast } from '@/app/components/contexts/ToastContext';
import { UserSettings } from '@/lib/settings';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [userData, setUserData] = useState<UserSettings | null>(null);
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');

    const { showToast } = useToast();

    // Load user data when component mounts
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/settings/user');

                if (!response.ok) {
                    throw new Error('Failed to fetch user settings');
                }

                const data = await response.json();

                if (data.success && data.user) {
                    setUserData(data.user);
                    setName(data.user.name || '');
                    setBio(data.user.bio || '');
                }
            } catch (error) {
                showToast('Failed to load user settings', 'error');
                console.error('Error fetching user settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [showToast]);

    // Save user settings
    const handleSaveChanges = async () => {
        try {
            setIsSaving(true);

            const response = await fetch('/api/user/settings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    bio
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update settings');
            }

            const data = await response.json();

            if (data.success) {
                showToast('Settings updated successfully', 'success');
            }
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : 'Failed to update settings',
                'error'
            );
            console.error('Error updating settings:', error);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="w-full min-h-screen bg-[#fffefe] dark:bg-gray-800 ">
            <div className="max-w-5xl mx-auto py-16">
                <h1 className="text-2xl font-medium mb-6 text-gray-900 dark:text-white">Settings</h1>
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Settings tabs */}
                    <div className="w-full lg:w-64">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full px-4 py-3.5 text-left transition-colors flex items-center gap-3 border-l-2 ${activeTab === 'profile'
                                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-l-orange-500 font-medium'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-transparent'
                                    }`}
                            >
                                <User className="h-4 w-4" />
                                <span>Profile</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('billing')}
                                className={`w-full px-4 py-3.5 text-left transition-colors flex items-center gap-3 border-l-2 ${activeTab === 'billing'
                                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-l-orange-500 font-medium'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-transparent'
                                    }`}
                            >
                                <CreditCard className="h-4 w-4" />
                                <span>Billing</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('appearance')}
                                className={`w-full px-4 py-3.5 text-left transition-colors flex items-center gap-3 border-l-2 ${activeTab === 'appearance'
                                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-l-orange-500 font-medium'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-transparent'
                                    }`}
                            >
                                {activeTab === 'appearance' ? (
                                    <Moon className="h-4 w-4" />
                                ) : (
                                    <Sun className="h-4 w-4" />
                                )}
                                <span>Appearance</span>
                            </button>
                        </div>
                    </div>

                    {/* Main content area */}
                    <div className="flex-1">
                        {activeTab === 'profile' && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Your Profile</h2>

                                {isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Name
                                                </label>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                                    placeholder="Enter your name"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 focus:border-transparent transition-all text-gray-500 dark:text-gray-400"
                                                    value={userData?.email || ''}
                                                    disabled
                                                />
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Your email cannot be changed</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Bio
                                            </label>
                                            <textarea
                                                id="bio"
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                                rows={3}
                                                placeholder="Tell us about yourself"
                                            />
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleSaveChanges}
                                                disabled={isSaving}
                                                className={`px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                {isSaving ? 'Saving...' : 'Save changes'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Appearance Settings</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Theme</h3>

                                        <ThemeToggle />

                                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                            Choose between light and dark mode for your Merukaji experience. Your preference will be saved for your next visit.
                                        </p>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveChanges}
                                            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm"
                                        >
                                            Save preferences
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-6">
                                {/* Current Plan Card */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="p-6">
                                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Current Plan</h2>

                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                                                        {userData?.tier ? `${userData.tier.charAt(0).toUpperCase() + userData.tier.slice(1)} Plan` : 'Free Plan'}
                                                    </span>
                                                    <span className="text-gray-500 dark:text-gray-400 text-sm">0 / 3 summaries used today</span>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-300 mb-3">
                                                    Basic functionality with limited features.
                                                </p>
                                                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <li className="flex items-center">
                                                        <Check className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                                                        <span>3 free summaries per day</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <Check className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                                                        <span>Basic summary length</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <Check className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                                                        <span>Standard quality model</span>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="flex-shrink-0">
                                                <button className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white rounded-lg transition-all shadow-sm">
                                                    Upgrade to Premium
                                                </button>
                                            </div>
                                        </div>
                                    </div>

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
                                </div>

                                {/* Payment Information Card */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Information</h2>

                                    <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                                        <div className="text-center">
                                            <p className="text-gray-600 dark:text-gray-300 mb-1">No payment method on file</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Payment methods will be added when you upgrade to a paid plan
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Subscription Management Card */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Subscription Management</h2>

                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <p className="text-gray-600 dark:text-gray-300 mb-4">Your subscription renews automatically at the end of each billing period.</p>

                                        <button className="text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed flex items-center gap-1" disabled>
                                            <span>Cancel subscription</span>
                                            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Free Plan</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}