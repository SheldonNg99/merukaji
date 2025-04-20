'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeScript } from "./components/ThemeScript";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* Add the ThemeScript before any React hydration */}
            <ThemeScript />
            <SessionProvider>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </SessionProvider>
        </>
    );
}