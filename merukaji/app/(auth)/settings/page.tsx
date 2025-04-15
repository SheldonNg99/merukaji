'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SettingsPage from '@/app/components/SettingsPage';

export default function Settings() {
    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login');
        },
    });

    if (status === "loading") {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return <SettingsPage />;
}