import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AlignLeft, AlignRight, ChevronDown, Settings, CreditCard, Layout, LogOut } from 'lucide-react';
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
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [, setMounted] = useState(false);

    // Ref for the profile dropdown container
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    const { data: session } = useSession();

    // Fetch history function
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

    useEffect(() => {
        setMounted(true);

        if (session?.user) {
            fetchHistory();
        }
    }, [session]);

    useEffect(() => {
        if (session?.user) {
            fetchHistory();
        }
    }, [pathname, session?.user]);

    // Add click away listener to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                profileDropdownRef.current &&
                !profileDropdownRef.current.contains(event.target as Node) &&
                isProfileOpen
            ) {
                setIsProfileOpen(false);
            }
        };

        // Add event listener
        document.addEventListener('mousedown', handleClickOutside);

        // Clean up event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileOpen]);

    const closeProfileDropdown = () => {
        setIsProfileOpen(false);
    };

    // Handler for navigation items that should close the dropdown
    const handleNavigation = (path: string) => {
        closeProfileDropdown();
        router.push(path);
    };

    // Add scroll with fade effect
    const sidebarScrollStyle = {
        maskImage: 'linear-gradient(to bottom, transparent, black 10px, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10px, black 90%, transparent)'
    };

    return (
        <>
            {/* Mobile Toggle Button - Adjusted positioning and padding */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2"
                aria-label="Open menu"
            >
                <AlignRight className="h-6 w-6 transform transition-transform duration-300" />
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
                fixed top-0 left-0 h-full bg-[#f8faff] dark:bg-[#202120] z-50 
                transform transition-all duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
                ${!isDesktopSidebarOpen ? 'lg:w-16 lg:translate-x-0' : 'lg:w-64 lg:translate-x-0'}
                flex flex-col
                border-r border-gray-200 dark:border-gray-700
            `}>
                {/* Header with Toggle Buttons - Consistent padding with mobile toggle */}
                <div className="h-16 flex items-center border-b border-gray-200 dark:border-gray-700 bg-[#f8faff] dark:bg-[#202120]">
                    <div className={`flex items-center w-full ${!isDesktopSidebarOpen ? 'lg:justify-center' : 'px-4'}`}>
                        {/* Mobile Toggle - Aligned with the mobile button */}
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            className="lg:hidden p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                            aria-label="Close menu"
                        >
                            <AlignLeft className="h-6 w-6" />
                        </button>

                        {/* Desktop Toggle */}
                        <button
                            onClick={() => onDesktopSidebarChange(!isDesktopSidebarOpen)}
                            className="hidden lg:flex p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                            aria-label={isDesktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                        >
                            <AlignRight className={`h-6 w-6 transform transition-transform duration-300 ${isDesktopSidebarOpen ? <AlignLeft className="h-6 w-6 transform transition-transform duration-300" /> : ''}`} />
                        </button>

                        {/* Make the title a link to the home page */}
                        <Link href="/home" className={`text-xl font-medium text-gray-900 dark:text-white ml-2 hover:text-orange-500 dark:hover:text-orange-400 transition-colors ${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                            Merukaji
                        </Link>
                    </div>
                </div>

                {/* History Section with minimalist styling */}
                <div className="flex-1 overflow-y-auto" style={sidebarScrollStyle}>
                    <div className={`pt-4 ${!isDesktopSidebarOpen ? 'lg:px-2' : 'px-4'}`}>
                        <h2 className={`flex text-sm font-medium text-gray-800 dark:text-white mb-2 px-2
                            ${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                            Recents
                        </h2>

                        {/* History List */}
                        <div className={`${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>
                            {historyItems.map((item) => {
                                const isActive = pathname === `/summary/${item.id}`;
                                return (
                                    <Link
                                        href={`/summary/${item.id}`}
                                        key={item.id}
                                        className={`flex items-center px-3 py-2 rounded-md transition-colors group cursor-pointer ${isActive
                                            ? 'bg-white text-gray-900 dark:bg-[#383838] dark:text-white'
                                            : 'text-gray-700 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-[#2E2E2E] dark:hover:text-white'
                                            }`}
                                    >
                                        <div className="w-full overflow-hidden">
                                            <p className={`text-sm truncate ${isActive ? 'font-medium' : ''}`}>
                                                {item.title}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}

                            {historyItems.length === 0 && (
                                <div className="text-center py-6 px-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No history yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Section */}
                <div className={`mt-auto border-t border-gray-200 dark:border-gray-700 ${isMobileOpen ? 'px-3' : ''}`}>
                    <div className="relative" ref={profileDropdownRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className={`w-full py-4 flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white 
                                hover:bg-white dark:hover:bg-[#2E2E2E] transition-all
                                ${!isDesktopSidebarOpen ? 'lg:justify-center lg:px-2' : 'px-4'}`}
                        >
                            <div className={`flex items-center ${!isDesktopSidebarOpen || !isMobileOpen ? 'lg:justify-center' : 'space-x-3'}`}>
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#434342] flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs text-gray-600 dark:text-gray-200">
                                        {session?.user?.name?.[0] || 'U'}
                                    </span>
                                </div>
                                <span className={`text-sm font-medium ${!isDesktopSidebarOpen ? 'lg:hidden' : 'ml-2'}`}>
                                    {session?.user?.email || 'username@email.com'}
                                </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transform transition-transform duration-300 ml-auto
                                ${isProfileOpen ? 'rotate-180' : ''} ${!isDesktopSidebarOpen ? 'lg:hidden' : ''}`} />
                        </button>

                        {isProfileOpen && (
                            <div className={`absolute bottom-full bg-white dark:bg-[#2E2E2E] border border-gray-200 dark:border-gray-700 rounded-lg 
                                shadow-lg overflow-hidden mx-2
                                ${!isDesktopSidebarOpen ? 'lg:left-full lg:w-52 lg:bottom-2 lg:rounded-l-none lg:rounded-r-lg' : 'left-0 w-[calc(100%-16px)]'}`}>
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    <li
                                        onClick={() => {
                                            closeProfileDropdown();
                                        }}
                                        className="px-4 py-3 hover:bg-[#f8faff] dark:hover:bg-[#383838] cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <CreditCard className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <div>
                                            <span>Plan Details</span>
                                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                                                {session?.user?.tier
                                                    ? session.user.tier.charAt(0).toUpperCase() + session.user.tier.slice(1)
                                                    : 'Free'}
                                            </span>
                                        </div>
                                    </li>
                                    <li
                                        onClick={() => handleNavigation('/settings')}
                                        className="px-4 py-3 hover:bg-[#f8faff] dark:hover:bg-[#383838] cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <Settings className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span>Settings</span>
                                    </li>
                                    <li
                                        onClick={() => handleNavigation('/upgrade')}
                                        className="px-4 py-3 hover:bg-[#f8faff] dark:hover:bg-[#383838] cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <Layout className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span>View All Plans</span>
                                    </li>
                                    {session ? (
                                        <li
                                            onClick={() => {
                                                closeProfileDropdown();
                                                signOut({ callbackUrl: '/' });
                                            }}
                                            className="px-4 py-3 hover:bg-[#f8faff] dark:hover:bg-[#383838] cursor-pointer transition-colors flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                        >
                                            <LogOut className="h-4 w-4 text-red-400 dark:text-red-500" />
                                            <span>Log Out</span>
                                        </li>
                                    ) : (
                                        <li
                                            onClick={() => {
                                                closeProfileDropdown();
                                                router.push('/login');
                                            }}
                                            className="px-4 py-3 hover:bg-[#f8faff] dark:hover:bg-[#383838] cursor-pointer transition-colors flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
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
            </div>
        </>
    );
}