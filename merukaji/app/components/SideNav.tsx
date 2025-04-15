'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, Settings, CreditCard, Layout, History, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

import { SideNavProps } from '@/types/sidenav-types';

export default function SideNav({ isDesktopSidebarOpen, onDesktopSidebarChange }: SideNavProps) {
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const { data: session } = useSession();

    const history = [
        'history no 6',
        'history no 5',
        'history no 4',
        'history no 3',
        'history no 2',
        'history no 1',
    ];

    const closeProfileDropdown = () => {
        setIsProfileOpen(false);
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 text-gray-700 hover:text-gray-900 transition-colors"
            >
                <ChevronRight className={`h-6 w-6 transform transition-transform duration-300 ${isMobileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Side Navigation */}
            <div className={`
                fixed top-0 left-0 h-full bg-white z-50 
                transform transition-all duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
                ${!isDesktopSidebarOpen ? 'lg:w-16 lg:translate-x-0' : 'lg:w-64 lg:translate-x-0'}
                flex flex-col
                border-r border-gray-100
            `}>
                {/* Header with Toggle Buttons */}
                <div className="h-16 flex items-center border-b border-gray-100 bg-gray-50/50">
                    <div className={`flex items-center w-full ${!isDesktopSidebarOpen ? 'lg:justify-center' : 'px-4'}`}>
                        {/* Mobile Toggle */}
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            className="lg:hidden text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>

                        {/* Desktop Toggle */}
                        <button
                            onClick={() => onDesktopSidebarChange(!isDesktopSidebarOpen)}
                            className="hidden lg:flex text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            <ChevronLeft className={`h-6 w-6 transform transition-transform duration-300 ${!isDesktopSidebarOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <h1 className={`text-xl font-medium text-gray-900 ml-4 ${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                            Merukaji
                        </h1>
                    </div>
                </div>

                {/* History Section */}
                <div className="flex-1 overflow-y-auto">
                    <div className={`pt-6 ${!isDesktopSidebarOpen ? 'lg:px-2' : 'px-4'}`}>
                        <h2 className={`flex text-xs font-medium text-black text-bold uppercase tracking-wider mb-4 
                            ${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                            <History className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="ml-3">
                                History
                            </span>
                        </h2>
                        <ul className={`${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                            {history.map((item, index) => (
                                <li
                                    key={index}
                                    className="py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer 
                                        transition-all text-sm group flex items-center"
                                >
                                    {item}
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
                                ${!isDesktopSidebarOpen ? 'lg:justify-center lg:px-2' : 'px-4'}`}
                        >
                            <div className={`flex items-center ${!isDesktopSidebarOpen ? 'lg:justify-center' : 'space-x-3'}`}>
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs text-gray-600">
                                        {session?.user?.name?.[0] || 'U'}
                                    </span>
                                </div>
                                <span className={`text-sm font-medium ${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                                    {session?.user?.email || 'username@email.com'}
                                </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transform transition-transform duration-300 ml-auto
                                ${isProfileOpen ? 'rotate-180' : ''} ${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`} />
                        </button>

                        {isProfileOpen && (
                            <div className={`absolute bottom-full bg-white border border-gray-100 rounded-lg 
                                shadow-lg overflow-hidden mx-2
                                ${!isDesktopSidebarOpen ? 'lg:left-full lg:w-52 lg:bottom-2 lg:rounded-l-none lg:rounded-r-lg' : 'left-0 w-[calc(100%-16px)]'}`}>
                                <ul className="divide-y divide-gray-50">
                                    <li
                                        onClick={closeProfileDropdown}
                                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700"
                                    >
                                        <CreditCard className="h-4 w-4 text-gray-400" />
                                        <span>Plan Details</span>
                                    </li>
                                    <Link href="/settings">
                                        <li
                                            onClick={() => {
                                                closeProfileDropdown();
                                            }}
                                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700">
                                            <Settings className="h-4 w-4 text-gray-400" />
                                            <span>Settings</span>
                                        </li>
                                    </Link>
                                    <li className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700">
                                        <Layout className="h-4 w-4 text-gray-400" />
                                        <span>View All Plans</span>
                                    </li>
                                    {session ? (
                                        <li
                                            onClick={() => {
                                                closeProfileDropdown();
                                                signOut({ callbackUrl: '/' });
                                            }}
                                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-sm text-red-600 hover:text-red-700"
                                        >
                                            <LogOut className="h-4 w-4 text-red-400" />
                                            <span>Log Out</span>
                                        </li>
                                    ) : (
                                        <li
                                            onClick={() => {
                                                closeProfileDropdown();
                                                router.push('/login'); // Use Next.js router for navigation
                                            }}
                                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700"
                                        >
                                            <LogOut className="h-4 w-4 text-gray-400" />
                                            <span>Sign In</span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}