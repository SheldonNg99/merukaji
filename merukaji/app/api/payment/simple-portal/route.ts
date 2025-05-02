// app/api/payment/simple-portal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe-server';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {

        logger.info('Stripe simple portal requested', {
            method: req.method
        });

        // Get current user from session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get base URL with fallback
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        // Get user data from database
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne({ email: session.user.email });

        // Check if user exists and has Stripe customer ID
        if (!user || !user.stripeCustomerId) {
            return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
        }

        // Create basic portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${baseUrl}/settings`
        });

        // Return portal URL
        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error('Portal error:', error);
        return NextResponse.json({
            error: 'Failed to create portal session',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}