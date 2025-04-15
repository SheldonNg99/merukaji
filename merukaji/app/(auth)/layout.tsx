'use client';

import ClientLayout from "../client-layout";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login');
        },
    });

    if (status === "loading") {
        return <div>Loading...</div>;
    }

    return <ClientLayout>{children}</ClientLayout>;
}