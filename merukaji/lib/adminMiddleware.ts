import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logger } from "@/lib/logger";

// Whitelist of allowed admin IPs
const ALLOWED_ADMIN_IPS = process.env.ALLOWED_ADMIN_IPS
    ? process.env.ALLOWED_ADMIN_IPS.split(',')
    : ["127.0.0.1", "58.98.114.224"];

export async function adminAuth(req: NextRequest) {
    // Get client IP address - updated implementation
    // Next.js no longer provides req.ip directly
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor
        ? forwardedFor.split(',')[0].trim()
        : req.headers.get("x-real-ip") || "0.0.0.0";

    // Log the access attempt
    logger.info('Admin access attempt', {
        ip: clientIp,
        path: req.nextUrl.pathname,
        method: req.method
    });

    // Check if IP is in the allowed list
    const isAllowedIP = ALLOWED_ADMIN_IPS.includes(clientIp);

    if (!isAllowedIP) {
        logger.warn(`Admin access attempted from unauthorized IP: ${clientIp}`);
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check admin session
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
        return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    return NextResponse.next();
}