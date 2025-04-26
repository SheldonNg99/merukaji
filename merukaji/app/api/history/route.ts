// app/api/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        logger.info('History received', {
            method: req.method
        });

        // Get summaries for this user, sorted by creation date (newest first)
        const summaries = await db.collection('summaries')
            .find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .limit(20) // Limit to latest 20 summaries
            .toArray();

        // Transform to simpler format matching our UI design
        const transformedSummaries = summaries.map(summary => ({
            id: summary._id.toString(),
            title: summary.metadata?.title || 'Untitled Video',
        }));

        return NextResponse.json({
            success: true,
            count: transformedSummaries.length,
            summaries: transformedSummaries
        });

    } catch (error) {
        console.error('Error fetching history:', error);
        return NextResponse.json({
            error: 'Failed to fetch history'
        }, { status: 500 });
    }
}