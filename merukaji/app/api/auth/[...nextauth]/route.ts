import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logger } from '@/lib/logger';

export const GET = async (req: Request) => {
    const url = new URL(req.url);
    logger.info('Auth GET request', { url: url.toString() });

    try {
        return await NextAuth(authOptions)(req);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('Auth GET error', { error: errorMessage, stack: errorStack });

        return new Response(JSON.stringify({ error: 'Authentication failed. Please try again.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const POST = async (req: Request) => {
    const url = new URL(req.url);
    logger.info('Auth POST request', { url: url.toString() });

    try {
        return await NextAuth(authOptions)(req);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('Auth POST error', { error: errorMessage, stack: errorStack });

        return new Response(JSON.stringify({ error: 'Authentication failed. Please try again.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};