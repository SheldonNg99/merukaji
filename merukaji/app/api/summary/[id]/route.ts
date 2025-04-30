import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
    const id = req.nextUrl.pathname.split('/').pop();

    if (!id || !ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Invalid summary ID format' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const summary = await db.collection('summaries').findOne({
        _id: new ObjectId(id),
        userId: session.user.id
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
}
