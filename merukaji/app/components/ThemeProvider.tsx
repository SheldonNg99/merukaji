// app/components/ThemeProvider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";
import { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps & { children: ReactNode }) {
    return (
        <NextThemesProvider {...props}>
            {children}
        </NextThemesProvider>
    );
}