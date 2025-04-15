'use client';

import { useState } from "react";
import SideNav from "./components/SideNav";
import { usePathname } from 'next/navigation';

export default function ClientLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const pathname = usePathname();

    // Don't show sidebar on login page
    if (pathname === '/login') {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen">
            <SideNav
                isDesktopSidebarOpen={isDesktopSidebarOpen}
                onDesktopSidebarChange={setIsDesktopSidebarOpen}
            />
            <main className={`flex-1 transition-all duration-300 ease-in-out
                ${isDesktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
                {children}
            </main>
        </div>
    );
}