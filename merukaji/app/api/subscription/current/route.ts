import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {

        logger.info('current subscription requested', {
            method: req.method
        });

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db();

        // Get user's subscription details
        const user = await db.collection('users').findOne({ email: session.user.email });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get subscription details
        const subscription = user.stripeSubscriptionId ?
            await db.collection('subscriptions').findOne({ id: user.stripeSubscriptionId }) : null;

        return NextResponse.json({
            tier: user.tier || 'free',
            billingCycle: subscription?.billingCycle || null,
            subscriptionId: user.stripeSubscriptionId || null,
            status: user.subscriptionStatus || null
        });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        return NextResponse.json({ error: 'Failed to fetch subscription details' }, { status: 500 });
    }
}