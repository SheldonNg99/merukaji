import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {

        logger.info('portal requested', {
            method: req.method
        });

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne({ email: session.user.email });

        if (!user?.stripeCustomerId) {
            return NextResponse.json({ error: 'No customer found' }, { status: 404 });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}