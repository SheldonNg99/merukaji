import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        logger.info('DB ping initiated');
        const client = await clientPromise;

        // Simple ping command to check connection
        await client.db().command({ ping: 1 });

        logger.info('DB ping successful - connection is alive');

        return NextResponse.json({
            success: true,
            message: "Database pinged successfully",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('DB ping failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            success: false,
            error: "Failed to ping database"
        }, { status: 500 });
    }
}