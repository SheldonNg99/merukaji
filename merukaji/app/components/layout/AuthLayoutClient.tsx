'use client';

import { useState } from "react";
import SideNav from "@/app/components/SideNav";

export function AuthLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

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