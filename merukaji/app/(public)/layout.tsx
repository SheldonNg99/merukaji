// src/app/(public)/layout.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (session) {
        redirect("/home");
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {children}
        </div>
    );
}