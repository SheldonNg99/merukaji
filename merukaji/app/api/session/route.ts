import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        logger.info('session route requested', {
            method: req.method
        });
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        // Force session update
        return NextResponse.json({ success: true, message: 'Session refreshed' });
    } catch (error) {
        logger.error('Failed to get user session', {
            error: error instanceof Error ? error.message : String(error)
        });
        return NextResponse.json({
            success: false,
            error: 'Failed to refresh session'
        }, { status: 500 });
    }
}