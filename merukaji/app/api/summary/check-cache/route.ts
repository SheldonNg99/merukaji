// app/api/summary/check-cache/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { videoId, summaryType = 'short' } = await req.json();

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        // First check if the user has already summarized this video
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
            logger.error('Error checking user summary:', {
                error: userError.message,
                videoId,
                userId: session.user.id
            });
            return NextResponse.json({ error: 'Failed to check cache' }, { status: 500 });
        }

        // If user has a summary, return it
        if (userSummary) {
            logger.info('Found existing user summary', {
                summaryId: userSummary.id,
                videoId,
                userId: session.user.id
            });

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

        // If no user summary exists, check for any recent summaries from other users
        const { data: existingSummary, error: existingError } = await supabaseAdmin
            .from('summaries')
            .select('*')
            .eq('video_id', videoId)
            .eq('summary_type', summaryType)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existingError && existingError.code !== 'PGRST116') {
            logger.error('Error checking existing summaries:', {
                error: existingError.message,
                videoId
            });
            // Continue without failing - we'll just create a new summary
        }

        // If we found an existing summary, copy it for the user
        if (existingSummary) {
            try {
                const { data: newSummary, error: insertError } = await supabaseAdmin
                    .from('summaries')
                    .insert({
                        user_id: session.user.id,
                        video_id: videoId,
                        summary_type: summaryType,
                        summary: existingSummary.summary,
                        metadata: existingSummary.metadata,
                        provider: existingSummary.provider,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                logger.info('Created copy of existing summary', {
                    newSummaryId: newSummary.id,
                    originalSummaryId: existingSummary.id,
                    videoId,
                    userId: session.user.id
                });

                return NextResponse.json({
                    success: true,
                    cached: true,
                    data: {
                        id: newSummary.id,
                        summary: newSummary.summary,
                        metadata: newSummary.metadata,
                        timestamp: newSummary.created_at,
                        provider: newSummary.provider
                    }
                });
            } catch (error) {
                logger.error('Failed to copy existing summary:', {
                    error: error instanceof Error ? error.message : String(error),
                    videoId,
                    userId: session.user.id
                });
                // Continue without failing - we'll just create a new summary
            }
        }

        // No cache found
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