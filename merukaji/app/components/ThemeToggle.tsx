'use client';

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row gap-4">
                <div
                    className={`flex flex-col items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${theme === 'light'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                    onClick={() => setTheme('light')}
                >
                    <div className="w-20 h-12 rounded bg-white border border-gray-200 flex items-center justify-center">
                        <Sun className="h-6 w-6 text-orange-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Light</span>
                </div>

                <div
                    className={`flex flex-col items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${theme === 'dark'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                    onClick={() => setTheme('dark')}
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