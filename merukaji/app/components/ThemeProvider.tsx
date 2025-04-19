'use client';

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode, useEffect } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Add an effect to sync themes after hydration
    useEffect(() => {
        // Apply transitions only after initial load
        const timeout = setTimeout(() => {
            document.documentElement.classList.add('js-theme-transitions-ready');
        }, 0);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            storageKey="merukaji-theme"
            disableTransitionOnChange={false}
            value={{
                light: "light",
                dark: "dark"
            }}
        >
            {children}
        </NextThemesProvider>
    );
}