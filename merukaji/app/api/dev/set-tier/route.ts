import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// IMPORTANT: Only enable in development environment
export async function POST(req: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development mode' }, { status: 403 });
    }

    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const { tier } = await req.json();

        if (!['free', 'pro', 'max'].includes(tier)) {
            return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();

        // Update user in database
        let query;
        if (ObjectId.isValid(session.user.id)) {
            query = { _id: new ObjectId(session.user.id) };
        } else {
            query = { id: session.user.id };
        }

        await db.collection('users').updateOne(query, { $set: { tier } });

        return NextResponse.json({
            success: true,
            message: `User tier updated to ${tier}`,
            userId: session.user.id
        });
    } catch (error) {
        console.error('Error updating user tier:', error);
        return NextResponse.json({
            error: 'Failed to update user tier'
        }, { status: 500 });
    }
}