'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeScript } from "./components/ThemeScript";
import { ToastProvider } from "./components/contexts/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* Add the ThemeScript before any React hydration */}
            <ThemeScript />
            <SessionProvider>
                <ThemeProvider>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </ThemeProvider>
            </SessionProvider>
        </>
    );
}