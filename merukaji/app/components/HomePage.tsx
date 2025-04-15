'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-orange-50/30 flex flex-col items-center justify-center px-4">
            {/* Welcome Message */}
            <div className="text-center mb-12 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                    Welcome Back!
                </h1>
                <p className="text-gray-500 text-lg">
                    What would you like to summarize today?
                </p>
            </div>

            {/* Search Section */}
            <div className={`w-full max-w-2xl transition-all duration-300 ease-in-out transform
        ${isFocused ? 'scale-105' : 'scale-100'}`}>
                <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-lg shadow-orange-100/50">
                    {/* Search Input */}
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Enter YouTube URL..."
                            className="w-full px-6 py-4 rounded-xl bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </div>

                    {/* AI Model Dropdown */}
                    <div className="self-center">
                        <select
                            className="h-12 px-4 rounded-xl bg-gray-50 border-none appearance-none pr-8 focus:outline-none text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                            <option value="">AI Model</option>
                            <option value="openai">OpenAI</option>
                            <option value="google">Google AI</option>
                        </select>
                    </div>

                    {/* Search Button */}
                    <button
                        className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl transition-all duration-300 ease-in-out hover:shadow-md flex items-center justify-center"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>

                {/* Quick Tips */}
                <div className="mt-6 text-center text-sm text-gray-400">
                    Try pasting a YouTube URL to get started
                </div>
            </div>
        </div>
    );
}