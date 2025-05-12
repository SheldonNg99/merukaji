// app/api/settings/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    logger.info('User settings requested', {
        method: req.method,
        userId: session.user.id
    });

    try {
        const { data: userWithBasicInfo, error: basicError } = await supabaseAdmin
            .from('users')
            .select('name, email, credit_balance, free_tier_used')
            .eq('id', session.user.id)
            .single();

        if (basicError) {
            logger.error('Failed to fetch user basic info', { error: basicError.message });
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = {
            name: userWithBasicInfo.name || '',
            email: userWithBasicInfo.email || '',
            credit_balance: userWithBasicInfo.credit_balance || 0,
            free_tier_used: userWithBasicInfo.free_tier_used || false,
            bio: ''
        };

        try {
            const { data: bioData } = await supabaseAdmin
                .from('users')
                .select('bio')
                .eq('id', session.user.id)
                .single();

            if (bioData && bioData.bio) {
                user.bio = bioData.bio;
            }
        } catch (bioError) {
            logger.warn('Bio column might not exist yet', {
                error: bioError instanceof Error ? bioError.message : String(bioError)
            });
        }

        return NextResponse.json({ success: true, user });
    } catch (err) {
        logger.error('Error in settings/user route', {
            error: err instanceof Error ? err.message : String(err)
        });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const { name, bio } = await req.json();
        const update: Record<string, string | null> = {};

        if (name !== undefined) update.name = name;
        if (bio !== undefined) update.bio = bio;

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ success: true, message: 'No changes to update' });
        }

        const { error } = await supabaseAdmin
            .from('users')
            .update(update)
            .eq('id', session.user.id);

        if (error) {
            if (error.message && (
                error.message.includes('does not exist') ||
                error.message.includes('schema cache')
            )) {
                logger.warn('Non-critical update error', { error: error.message });
                return NextResponse.json({ success: true, message: 'Settings partially updated', warning: error.message });
            }

            logger.error('Failed to update user', { error: error.message });
            return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Settings updated' });
    } catch (err) {
        logger.error('Error in settings update', {
            error: err instanceof Error ? err.message : String(err)
        });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}