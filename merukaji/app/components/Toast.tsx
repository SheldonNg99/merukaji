// app/components/Toast.tsx
'use client';

import { XCircle, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ToastProps } from '@/types/toast';

export function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Allow animation to complete
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const Icon = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertCircle,
        info: Info
    }[type];

    const bgColor = {
        success: 'bg-green-50 dark:bg-green-900/20 border-green-500',
        error: 'bg-red-50 dark:bg-red-900/20 border-red-500',
        warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-500',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
    }[type];

    const iconColor = {
        success: 'text-green-500',
        error: 'text-red-500',
        warning: 'text-orange-500',
        info: 'text-blue-500'
    }[type];

    return (
        <div
            className={`fixed bottom-4 right-4 flex items-center p-4 mb-4 rounded-lg border ${bgColor} 
                 transform transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
            role="alert"
        >
            <Icon className={`w-5 h-5 ${iconColor} mr-3 flex-shrink-0`} />
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
            >
                <span className="sr-only">Close</span>
                <XCircle className="w-5 h-5" />
            </button>
        </div>
    );
}