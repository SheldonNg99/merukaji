'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Settings, CreditCard, Layout, History } from 'lucide-react';

export default function SideNav() {
    const [isOpen, setIsOpen] = useState(false);
    const [isDesktopOpen, setIsDesktopOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const history = [
        'history no 6',
        'history no 5',
        'history no 4',
        'history no 3',
        'history no 2',
        'history no 1',
    ];

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 text-gray-700 hover:text-gray-900 transition-colors"
            >
                <ChevronRight className={`h-6 w-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Side Navigation */}
            <div className={`
                fixed top-0 left-0 h-full bg-white z-50 
                transform transition-all duration-200 ease-in-out
                ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
                ${!isDesktopOpen ? 'lg:w-16 lg:translate-x-0' : 'lg:w-64 lg:translate-x-0'}
                flex flex-col
                border-r border-gray-100
            `}>
                {/* Header with Toggle Buttons */}
                <div className="h-16 flex items-center border-b border-gray-100 bg-gray-50/50">
                    <div className={`flex items-center w-full ${!isDesktopOpen ? 'lg:justify-center' : 'px-4'}`}>
                        {/* Mobile Toggle */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="lg:hidden text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            <ChevronLeft className={`h-6 w-6 transform transition-transform duration-300 ${!isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Desktop Toggle */}
                        <button
                            onClick={() => setIsDesktopOpen(!isDesktopOpen)}
                            className="hidden lg:flex text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            <ChevronLeft className={`h-6 w-6 transform transition-transform duration-300 ${!isDesktopOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <h1 className={`text-xl font-medium text-gray-900 ml-4 ${!isDesktopOpen ? 'lg:hidden' : ''}`}>
                            Merukaji
                        </h1>
                    </div>
                </div>

                {/* History Section */}
                <div className="flex-1 overflow-y-auto">
                    <div className={`pt-6 ${!isDesktopOpen ? 'lg:px-2' : 'px-4'}`}>
                        <h2 className={`flex text-xs font-medium text-black text-bold uppercase tracking-wider mb-4 
                            ${!isDesktopOpen ? 'lg:hidden' : ''}`}>
                            <History className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="ml-3">
                                History
                            </span>
                        </h2>
                        <ul className={`${!isDesktopOpen ? 'lg:hidden' : ''}`}>
                            {history.map((item, index) => (
                                <li
                                    key={index}
                                    className={`py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer 
                                        transition-all text-sm group flex items-center`}
                                >
                                    <span className={`${!isDesktopOpen ? 'lg:hidden' : ''}`}>
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Profile Section */}
                <div className="mt-auto border-t border-gray-100">
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className={`w-full py-4 flex items-center text-gray-700 hover:text-gray-900 
                                hover:bg-gray-50/80 transition-all
                                ${!isDesktopOpen ? 'lg:justify-center lg:px-2' : 'px-4'}`}
                        >
                            <div className={`flex items-center ${!isDesktopOpen ? 'lg:justify-center' : 'space-x-3'}`}>
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs text-gray-600">U</span>
                                </div>
                                <span className={`text-sm font-medium ${!isDesktopOpen ? 'lg:hidden' : ''}`}>
                                    username@email.com
                                </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transform transition-transform duration-300 ml-auto
                                ${isProfileOpen ? 'rotate-180' : ''} ${!isDesktopOpen ? 'lg:hidden' : ''}`} />
                        </button>

                        {isProfileOpen && (
                            <div className={`absolute bottom-full bg-white border border-gray-100 rounded-lg 
                                shadow-lg overflow-hidden mx-2
                                ${!isDesktopOpen ? 'lg:left-full lg:w-52 lg:bottom-2 lg:rounded-l-none lg:rounded-r-lg' : 'left-0 w-[calc(100%-16px)]'}`}>
                                <ul className="divide-y divide-gray-50">
                                    <li className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700">
                                        <CreditCard className="h-4 w-4 text-gray-400" />
                                        <span>Plan Details</span>
                                    </li>
                                    <li className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700">
                                        <Settings className="h-4 w-4 text-gray-400" />
                                        <span>Settings</span>
                                    </li>
                                    <li className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700">
                                        <Layout className="h-4 w-4 text-gray-400" />
                                        <span>View All Plans</span>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}