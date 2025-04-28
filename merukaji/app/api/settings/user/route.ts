import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { UserUpdateData } from '@/lib/settings';

// GET: Fetch user settings
export async function GET(req: NextRequest) {
    try {

        logger.info('user detail data requested', {
            method: req.method
        });

        // Get current user from session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db();

        // Create a query that handles both ObjectId and string IDs
        let query;
        if (ObjectId.isValid(session.user.id)) {
            query = { _id: new ObjectId(session.user.id) };
        } else {
            query = { id: session.user.id };
        }

        // Find user data
        const userData = await db.collection('users').findOne(query);

        if (!userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Return only the fields that should be editable in settings
        // Omit sensitive data like password
        return NextResponse.json({
            success: true,
            user: {
                name: userData.name || '',
                email: userData.email,
                bio: userData.bio || '',
                tier: userData.tier || 'free'
            }
        });
    } catch (error) {
        logger.error('Error fetching user settings:', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'Failed to fetch user settings'
        }, { status: 500 });
    }
}

// PATCH: Update user settings
export async function PATCH(req: NextRequest) {
    try {
        // Get current user from session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get request data
        const data = await req.json();
        const { name, bio } = data;

        // Validate input
        if (name !== undefined && typeof name !== 'string') {
            return NextResponse.json({ error: 'Name must be a string' }, { status: 400 });
        }

        if (bio !== undefined && typeof bio !== 'string') {
            return NextResponse.json({ error: 'Bio must be a string' }, { status: 400 });
        }

        // Create update object with only the fields that should be updatable
        const updateData: UserUpdateData = {
            updatedAt: new Date()
        };

        if (name !== undefined) updateData.name = name;
        if (bio !== undefined) updateData.bio = bio;

        const client = await clientPromise;
        const db = client.db();

        // Create a query that handles both ObjectId and string IDs
        let query;
        if (ObjectId.isValid(session.user.id)) {
            query = { _id: new ObjectId(session.user.id) };
        } else {
            query = { id: session.user.id };
        }

        // Update user in database
        const result = await db.collection('users').updateOne(
            query,
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        logger.info('User settings updated successfully', {
            userId: session.user.id,
            updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt')
        });

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        logger.error('Error updating user settings:', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'Failed to update user settings'
        }, { status: 500 });
    }
}