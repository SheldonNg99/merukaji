import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Get current user from session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db();

        // Validate the ID format
        if (!ObjectId.isValid(params.id)) {
            return NextResponse.json({ error: 'Invalid summary ID format' }, { status: 400 });
        }

        const summary = await db.collection('summaries').findOne({
            _id: new ObjectId(params.id),
            userId: session.user.id // Ensure the user owns this summary
        });

        if (!summary) {
            return NextResponse.json({ error: 'Summary not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            id: summary._id.toString(),
            summary: summary.summary,
            metadata: summary.metadata,
            timestamp: summary.createdAt.toISOString(),
            provider: summary.provider,
            summaryType: summary.summaryType
        });

    } catch (error) {
        logger.error('Error fetching summary by ID:', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'Failed to fetch summary'
        }, { status: 500 });
    }
}