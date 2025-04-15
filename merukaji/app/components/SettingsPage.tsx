'use client';

import { useState } from 'react';
import { CreditCard, User, Check } from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [username, setUsername] = useState('');

    const handleSaveChanges = () => {
        // This will be connected to the backend later
        console.log('Saving changes:', { username });
    };

    return (
        <div className="w-full min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto py-16">
                <h1 className="text-xl font-medium mb-6 text-gray-900">Settings</h1>
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Settings tabs */}
                    <div className="w-full lg:w-64">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full px-4 py-3.5 text-left transition-colors flex items-center gap-3 border-l-2 ${activeTab === 'profile'
                                    ? 'bg-orange-50 text-orange-700 border-l-orange-500 font-medium'
                                    : 'text-gray-700 hover:bg-gray-50 border-l-transparent'
                                    }`}
                            >
                                <User className="h-4 w-4" />
                                <span>Profile</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('billing')}
                                className={`w-full px-4 py-3.5 text-left transition-colors flex items-center gap-3 border-l-2 ${activeTab === 'billing'
                                    ? 'bg-orange-50 text-orange-700 border-l-orange-500 font-medium'
                                    : 'text-gray-700 hover:bg-gray-50 border-l-transparent'
                                    }`}
                            >
                                <CreditCard className="h-4 w-4" />
                                <span>Billing</span>
                            </button>

                        </div>
                    </div>

                    {/* Main content area */}
                    <div className="flex-1">
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-6">Your Profile</h2>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                                Username
                                            </label>
                                            <input
                                                type="text"
                                                id="username"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                                                placeholder="Enter your username"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                                                value="user@example.com"
                                                disabled
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Your email cannot be changed</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                                            Bio
                                        </label>
                                        <textarea
                                            id="bio"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                                            rows={3}
                                            placeholder="Tell us about yourself"
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveChanges}
                                            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm"
                                        >
                                            Save changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-6">
                                {/* Current Plan Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="p-6">
                                        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Plan</h2>

                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Free Plan</span>
                                                    <span className="text-gray-500 text-sm">0 / 3 summaries used today</span>
                                                </div>
                                                <p className="text-gray-600 mb-3">
                                                    Basic functionality with limited features.
                                                </p>
                                                <ul className="space-y-2 text-sm text-gray-600">
                                                    <li className="flex items-center">
                                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                                        <span>3 free summaries per day</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                                        <span>Basic summary length</span>
                                                    </li>
                                                    <li className="flex items-center">
                                                        <Check className="h-4 w-4 text-green-500 mr-2" />
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

                                    <div className="bg-orange-50 px-6 py-4 border-t border-orange-100">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 bg-orange-100 p-2 rounded-lg">
                                                <CreditCard className="h-5 w-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">Premium Plan Benefits</h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Upgrade to Premium for unlimited summaries, longer detailed summaries, and higher quality AI models.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Information Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h2>

                                    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                        <div className="text-center">
                                            <p className="text-gray-600 mb-1">No payment method on file</p>
                                            <p className="text-sm text-gray-500">
                                                Payment methods will be added when you upgrade to a paid plan
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Subscription Management Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Subscription Management</h2>

                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-600 mb-4">Your subscription renews automatically at the end of each billing period.</p>

                                        <button className="text-sm text-gray-400 cursor-not-allowed flex items-center gap-1" disabled>
                                            <span>Cancel subscription</span>
                                            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Free Plan</span>
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