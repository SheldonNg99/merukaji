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

    logger.info('user route requested', {
        method: req.method
    });

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('name, email, bio, tier')
        .eq('id', session.user.id)
        .single();

    if (error || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, bio } = await req.json();
    const update: Record<string, string> = {};
    if (name) update.name = name;
    if (bio) update.bio = bio;

    const { error } = await supabaseAdmin
        .from('users')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

    if (error) {
        logger.error('Failed to update user', { error: error.message });
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Settings updated' });
}
