import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logger } from '@/lib/logger';

const handler = NextAuth(authOptions);

// Correct typing for App Router API routes
export async function GET(req: NextRequest) {
    logger.info('Auth GET request', { url: req.url });
    return handler(req);
}

export async function POST(req: NextRequest) {
    logger.info('Auth POST request', { url: req.url });
    try {
        return await handler(req);
    } catch (error: unknown) {
        // Type guard for the error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('Auth error', {
            error: errorMessage,
            stack: errorStack
        });

        // Provide clearer error message to client
        return NextResponse.json(
            { error: 'Authentication failed. Please try again.' },
            { status: 401 }
        );
    }
}