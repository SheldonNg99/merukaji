'use client';

export default function Loading({ message }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-[#202120] space-y-4">
            <div className="w-12 h-12 border-4 border-[#FFAB5B] border-t-transparent rounded-full animate-spin"></div>
            {message && <p className="text-gray-500 dark:text-gray-300">{message}</p>}
        </div>
    );
}