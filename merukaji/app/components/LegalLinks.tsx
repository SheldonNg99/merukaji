'use client';

import { useRouter } from 'next/navigation';

export default function LegalLinks() {
    const router = useRouter();

    const handleDisclosureClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push('/legal/commercial-disclosure');
    };

    return (
        <div className="fixed bottom-1 right-2 z-10 text-xs text-gray-400 opacity-70 hover:opacity-100 transition-opacity">
            <a
                href="#"
                onClick={handleDisclosureClick}
                className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                特定商取引法に基づく表記
            </a>
        </div>
    );
}