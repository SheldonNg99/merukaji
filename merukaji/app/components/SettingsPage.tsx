// app/components/SettingsPage.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, User, Moon, Sun } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useToast } from '@/app/components/contexts/ToastContext';
import { UserSettings } from '@/lib/settings';
import CreditHistory from './CreditHistory';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [userData, setUserData] = useState<UserSettings | null>(null);
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetchAttempted, setFetchAttempted] = useState(false);
    const [originalName, setOriginalName] = useState('');
    const [originalBio, setOriginalBio] = useState('');

    const { showToast } = useToast();

    const fetchUserData = useCallback(async () => {
        if (fetchAttempted) return;

        try {
            setIsLoading(true);
            setFetchError(null);

            const response = await fetch('/api/settings/user');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch user settings');
            }

            const data = await response.json();

            if (data.success && data.user) {
                setUserData(data.user);

                const userName = data.user.name || '';
                const userBio = data.user.bio || '';

                setName(userName);
                setBio(userBio);
                setOriginalName(userName);
                setOriginalBio(userBio);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load user settings';
            setFetchError(message);
            showToast(message, 'error');
            console.error('Error fetching user settings:', error);
        } finally {
            setIsLoading(false);
            setFetchAttempted(true);
        }
    }, [showToast, fetchAttempted]);


    const hasChanges = useCallback(() => {
        return name !== originalName || bio !== originalBio;
    }, [name, bio, originalName, originalBio]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleSaveChanges = async () => {
        try {
            setIsSaving(true);

            const response = await fetch('/api/settings/user', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    bio
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update settings');
            }

            if (data.success) {
                // Update original values to match current values after successful save
                setOriginalName(name);
                setOriginalBio(bio);

                showToast('Settings updated successfully', 'success');
                setUserData(prev => prev ? { ...prev, name, bio } : null);
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

    // Handle retry if there was an error
    const handleRetry = () => {
        setFetchAttempted(false); // Reset so we can try again
        fetchUserData();
    };

    return (
        <div className="w-full min-h-screen bg-[#fffefe] dark:bg-[#202120]">
            {/* Main content with proper padding for mobile */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
                {/* Improved header with better spacing */}
                <div className="pt-4 pb-6">
                    <h1 className="text-2xl font-medium text-gray-900 dark:text-white">Settings</h1>
                </div>
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Mobile-friendly tabs */}
                    <div className="w-full lg:w-64">
                        <div className="flex overflow-x-auto lg:flex-col bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`flex-shrink-0 px-4 py-3.5 text-left transition-colors flex items-center gap-3 border-b-2 lg:border-b-0 lg:border-l-2 
                                    ${activeTab === 'profile'
                                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-b-orange-500 lg:border-l-orange-500 lg:border-b-transparent font-medium'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#383838] border-b-transparent lg:border-l-transparent'
                                    }`}
                            >
                                <User className="h-4 w-4" />
                                <span>Profile</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('billing')}
                                className={`flex-shrink-0 px-4 py-3.5 text-left transition-colors flex items-center gap-3 border-b-2 lg:border-b-0 lg:border-l-2
                                    ${activeTab === 'billing'
                                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-b-orange-500 lg:border-l-orange-500 lg:border-b-transparent font-medium'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#383838] border-b-transparent lg:border-l-transparent'
                                    }`}
                            >
                                <CreditCard className="h-4 w-4" />
                                <span>Credits</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('appearance')}
                                className={`flex-shrink-0 px-4 py-3.5 text-left transition-colors flex items-center gap-3 border-b-2 lg:border-b-0 lg:border-l-2
                                    ${activeTab === 'appearance'
                                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-b-orange-500 lg:border-l-orange-500 lg:border-b-transparent font-medium'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#383838] border-b-transparent lg:border-l-transparent'
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
                    <div className="flex-1 mt-6 lg:mt-0">
                        {activeTab === 'profile' && (
                            <div className="bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Your Profile</h2>

                                {isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : fetchError ? (
                                    <div className="flex flex-col items-center py-12 text-center">
                                        <p className="text-red-500 mb-4">{fetchError}</p>
                                        <button
                                            onClick={handleRetry}
                                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm"
                                        >
                                            Retry
                                        </button>
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
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#383838] border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
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
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#383838] border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 focus:border-transparent transition-all text-gray-500 dark:text-gray-400"
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
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#383838] border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                                rows={3}
                                                placeholder="Tell us about yourself"
                                            />
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleSaveChanges}
                                                disabled={isSaving || !hasChanges()}
                                                className={`px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm ${(isSaving || !hasChanges()) ? 'opacity-70 cursor-not-allowed' : ''
                                                    }`}
                                            >
                                                {isSaving ? 'Saving...' : 'Save changes'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="bg-white dark:bg-[#2E2E2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Appearance Settings</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Theme</h3>

                                        <ThemeToggle />

                                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                            Choose between light and dark mode for your Merukaji experience. Your preference will be saved automatically for your next visit.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <CreditHistory />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}