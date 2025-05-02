import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
    try {
        const client = await clientPromise;
        await client.db().command({ ping: 1 });
        return NextResponse.json({ success: true, message: "Database pinged successfully" });
    } catch (error) {
        console.error("Database ping failed:", error);
        return NextResponse.json({ success: false, error: "Failed to ping database" }, { status: 500 });
    }
}