// app/api/summary/check-cache/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { videoId, summaryType = 'short' } = await req.json();

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        // Check if user has already summarized this video
        const { data: userSummary, error: userError } = await supabaseAdmin
            .from('summaries')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('video_id', videoId)
            .eq('summary_type', summaryType)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (userError && userError.code !== 'PGRST116') {
            logger.error('Error checking user summary:', { error: userError });
            return NextResponse.json({ error: 'Failed to check cache' }, { status: 500 });
        }

        if (userSummary) {
            return NextResponse.json({
                success: true,
                cached: true,
                data: {
                    id: userSummary.id,
                    summary: userSummary.summary,
                    metadata: userSummary.metadata,
                    timestamp: userSummary.created_at,
                    provider: userSummary.provider
                }
            });
        }

        return NextResponse.json({
            success: true,
            cached: false
        });

    } catch (error) {
        logger.error('Cache check failed:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}