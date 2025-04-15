'use client';

import { useState } from 'react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [username, setUsername] = useState('');

    const handleSaveChanges = () => {
        // This will be connected to the backend later
        console.log('Saving changes:', { username });
        // Add toast notification or feedback
    };

    return (
        <div className="w-full">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Settings tabs instead of sidebar */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <div className="flex flex-col space-y-2">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`px-5 py-3 text-left rounded-lg transition-colors ${activeTab === 'profile'
                                    ? 'bg-gray-200 text-gray-900 font-medium'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('billing')}
                                className={`px-5 py-3 text-left rounded-lg transition-colors ${activeTab === 'billing'
                                    ? 'bg-gray-200 text-gray-900 font-medium'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                Billing
                            </button>
                        </div>
                    </div>

                    {/* Main content area */}
                    <div className="flex-1">
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-200 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSaveChanges}
                                        className="px-5 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded-lg transition-colors"
                                    >
                                        save changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-medium text-gray-900">Subscription Details</h2>
                                <p className="text-gray-600">
                                    You are currently on the <span className="font-medium">Free</span> plan.
                                </p>
                                <div className="flex justify-end">
                                    <button
                                        className="px-5 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded-lg transition-colors"
                                    >
                                        Upgrade to Premium
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}