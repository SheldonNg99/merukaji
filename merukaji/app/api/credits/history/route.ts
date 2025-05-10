// app/api/credits/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get pagination parameters from query string
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

        // Calculate offset
        const offset = (page - 1) * pageSize;

        // Get credit history
        const { data: credits, error: creditsError, count } = await supabaseAdmin
            .from('credits')
            .select('id, amount, description, created_at, transaction_id', { count: 'exact' })
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (creditsError) {
            logger.error('Failed to fetch credit history', {
                userId: session.user.id,
                error: creditsError.message
            });
            return NextResponse.json({ error: 'Failed to fetch credit history' }, { status: 500 });
        }

        // Format the credit entries
        const formattedCredits = credits.map(credit => ({
            id: credit.id,
            amount: credit.amount,
            description: credit.description,
            date: credit.created_at,
            transactionId: credit.transaction_id
        }));

        // Get total count of entries
        const totalPages = Math.ceil((count || 0) / pageSize);

        return NextResponse.json({
            success: true,
            credits: formattedCredits,
            pagination: {
                page,
                pageSize,
                totalItems: count,
                totalPages
            }
        });
    } catch (error) {
        logger.error('Failed to get credit history', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'An error occurred while fetching your credit history'
        }, { status: 500 });
    }
}