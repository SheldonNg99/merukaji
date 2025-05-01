'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeScript } from "./ThemeScript";
import { ToastProvider } from "./contexts/ToastContext";

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