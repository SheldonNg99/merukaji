import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    const id = req.nextUrl.pathname.split('/').pop();
    const session = await getServerSession(authOptions);

    if (!id) {
        return NextResponse.json({ error: 'Invalid summary ID' }, { status: 400 });
    }

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
        .from('summaries')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

    if (error) {
        return NextResponse.json({ error: "Summary not found" }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        id: data.id,
        summary: data.summary,
        metadata: data.metadata,
        timestamp: data.created_at,
        provider: data.provider,
        summaryType: data.summary_type,
    });
}
