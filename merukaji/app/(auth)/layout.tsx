'use client';

import ClientLayout from "../client-layout";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Loading from "../components/ui/Loading";

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
        return <Loading message="Loading..." />;
    }

    return <ClientLayout>{children}</ClientLayout>;
}