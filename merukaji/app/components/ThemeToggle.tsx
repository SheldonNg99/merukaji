// app/components/ThemeToggle.tsx
'use client';

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    // Handle hydration
    useEffect(() => {
        setMounted(true);

        // Make sure theme is applied correctly after hydration
        const currentTheme = theme || 'light';
        if (currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Resolve any conflicts in localStorage
        syncLocalStorage(currentTheme);
    }, [theme]);

    // Function to sync localStorage values
    const syncLocalStorage = (currentTheme: string) => {
        try {
            localStorage.setItem('merukaji-theme', currentTheme);
            localStorage.setItem('theme', currentTheme);
        } catch (e) {
            console.error('Failed to sync localStorage:', e);
        }
    };

    // Enhanced theme change function
    const handleThemeChange = (newTheme: string) => {
        console.log(`Setting theme to: ${newTheme}`);

        // Apply the theme class directly for immediate effect
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Sync localStorage and update state
        syncLocalStorage(newTheme);
        setTheme(newTheme);
    };

    if (!mounted) {
        return null;
    }

    const isActive = theme === 'dark';

    return (
        <div>
            <div className="flex flex-col md:flex-row gap-4">
                <div
                    className={`flex flex-col items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${!isActive
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                    onClick={() => handleThemeChange('light')}
                >
                    <div className="w-20 h-12 rounded bg-white border border-gray-200 flex items-center justify-center">
                        <Sun className="h-6 w-6 text-orange-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Light</span>
                </div>

                <div
                    className={`flex flex-col items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${isActive
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                    onClick={() => handleThemeChange('dark')}
                >
                    <div className="w-20 h-12 rounded bg-gray-900 border border-gray-800 flex items-center justify-center">
                        <Moon className="h-6 w-6 text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Dark</span>
                </div>
            </div>
        </div>
    );
}