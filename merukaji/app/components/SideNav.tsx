// Simplified SideNav.tsx with cleaner history display
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, Settings, CreditCard, Layout, History, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { SideNavProps } from '@/types/sidenav-types';

// Simple history item type
interface HistoryItem {
    id: string;
    title: string;
}

export default function SideNav({ isDesktopSidebarOpen, onDesktopSidebarChange }: SideNavProps) {
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [, setMounted] = useState(false);

    const { data: session } = useSession();

    // Mark component as mounted
    useEffect(() => {
        setMounted(true);

        // Fetch history data when the component mounts
        const fetchHistory = async () => {
            try {
                const response = await fetch('/api/history');
                if (response.ok) {
                    const data = await response.json();
                    setHistoryItems(data.summaries || []);
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
            }
        };

        if (session?.user) {
            fetchHistory();
        }
    }, [session]);

    const closeProfileDropdown = () => {
        setIsProfileOpen(false);
    };

    // Add scroll with fade effect
    const sidebarScrollStyle = {
        maskImage: 'linear-gradient(to bottom, transparent, black 10px, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10px, black 90%, transparent)'
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
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
            {/* Side Navigation */}
            <div className={`
                fixed top-0 left-0 h-full bg-white dark:bg-gray-800 z-50 
                transform transition-all duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
                ${!isDesktopSidebarOpen ? 'lg:w-16 lg:translate-x-0' : 'lg:w-64 lg:translate-x-0'}
                flex flex-col
                border-r border-gray-100 dark:border-gray-700
            `}>
                {/* Header with Toggle Buttons */}
                <div className="h-16 flex items-center border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className={`flex items-center w-full ${!isDesktopSidebarOpen ? 'lg:justify-center' : 'px-4'}`}>
                        {/* Mobile Toggle */}
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            className="lg:hidden text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>

                        {/* Desktop Toggle */}
                        <button
                            onClick={() => onDesktopSidebarChange(!isDesktopSidebarOpen)}
                            className="hidden lg:flex text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ChevronLeft className={`h-6 w-6 transform transition-transform duration-300 ${!isDesktopSidebarOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Make the title a link to the home page */}
                        <Link href="/home" className={`text-xl font-medium text-gray-900 dark:text-white ml-4 hover:text-orange-500 dark:hover:text-orange-400 transition-colors ${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                            Merukaji
                        </Link>
                    </div>
                </div>

                {/* History Section with minimalist styling */}
                <div className="flex-1 overflow-y-auto" style={sidebarScrollStyle}>
                    <div className={`pt-4 ${!isDesktopSidebarOpen ? 'lg:px-2' : 'px-2'}`}>
                        <h2 className={`flex text-sm font-medium text-black dark:text-white mb-2 px-2
                            ${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                            Recents
                        </h2>

                        {/* History List */}
                        <div className={`${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                            {historyItems.map((item) => (
                                <Link
                                    href={`/summary/${item.id}`}
                                    key={item.id}
                                    className="flex items-center px-3 py-2 rounded-md text-gray-300 hover:bg-gray-50 hover:text-white transition-colors group cursor-pointer"
                                >
                                    <div className="w-full overflow-hidden">
                                        <p className="text-sm truncate">
                                            {item.title}
                                        </p>
                                    </div>
                                </Link>
                            ))}

                            {historyItems.length === 0 && (
                                <div className="text-center py-6 px-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-500">No history yet</p>
                                </div>
                            )}
                        </div>

                        {/* Collapsed sidebar view */}
                        {!isDesktopSidebarOpen && (
                            <div className="hidden lg:flex flex-col items-center mt-4 space-y-3">
                                <button className="p-2 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white">
                                    <History className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Section */}
                <div className="mt-auto border-t border-gray-100 dark:border-gray-700">
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className={`w-full py-4 flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white 
                                hover:bg-gray-50/80 dark:hover:bg-gray-700/80 transition-all
                                ${!isDesktopSidebarOpen ? 'lg:justify-center lg:px-2' : 'px-4'}`}
                        >
                            <div className={`flex items-center ${!isDesktopSidebarOpen ? 'lg:justify-center' : 'space-x-3'}`}>
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs text-gray-600 dark:text-gray-200">
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
                            <div className={`absolute bottom-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg 
                                shadow-lg overflow-hidden mx-2
                                ${!isDesktopSidebarOpen ? 'lg:left-full lg:w-52 lg:bottom-2 lg:rounded-l-none lg:rounded-r-lg' : 'left-0 w-[calc(100%-16px)]'}`}>
                                <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                                    <li
                                        onClick={closeProfileDropdown}
                                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <CreditCard className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span>Plan Details</span>
                                    </li>
                                    <Link href="/settings">
                                        <li
                                            onClick={() => {
                                                closeProfileDropdown();
                                            }}
                                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                            <Settings className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                            <span>Settings</span>
                                        </li>
                                    </Link>
                                    <Link href="/upgrade">
                                        <li className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                            <Layout className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                            <span>View All Plans</span>
                                        </li>
                                    </Link>
                                    {session ? (
                                        <li
                                            onClick={() => {
                                                closeProfileDropdown();
                                                signOut({ callbackUrl: '/' });
                                            }}
                                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                        >
                                            <LogOut className="h-4 w-4 text-red-400 dark:text-red-500" />
                                            <span>Log Out</span>
                                        </li>
                                    ) : (
                                        <li
                                            onClick={() => {
                                                closeProfileDropdown();
                                                router.push('/login'); // Use Next.js router for navigation
                                            }}
                                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                                        >
                                            <LogOut className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                            <span>Sign In</span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </>
    );
}