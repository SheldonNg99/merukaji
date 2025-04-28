'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SettingsPage from '@/app/components/SettingsPage';
import Loading from '@/app/components/ui/Loading';

export default function Settings() {
    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login');
        },
    });

    if (status === 'loading') {
        return <Loading message="Loading setting..." />;
    }

    return <SettingsPage />;
}