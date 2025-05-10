// app/api/payment/portal/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { CreditRecord, TransactionRecord } from '@/types/paypal';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        logger.info('Credit history requested', {
            userId: session.user.id
        });

        // Get user's credit balance
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('credit_balance')
            .eq('id', session.user.id)
            .single();

        if (userError || !user) {
            logger.error('Failed to fetch user credit balance', {
                userId: session.user.id,
                error: userError?.message
            });
            return NextResponse.json({ error: 'Failed to fetch credit balance' }, { status: 500 });
        }

        // Get user's credit history
        const { data: credits, error: creditsError } = await supabaseAdmin
            .from('credits')
            .select('amount, description, created_at')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (creditsError) {
            logger.error('Failed to fetch credit history', {
                userId: session.user.id,
                error: creditsError?.message
            });
            return NextResponse.json({ error: 'Failed to fetch credit history' }, { status: 500 });
        }

        // Get user's transaction history
        const { data: transactions, error: transactionsError } = await supabaseAdmin
            .from('transactions')
            .select(`
                id, 
                amount, 
                currency, 
                status, 
                created_at,
                credit_packages(name, credit_amount)
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (transactionsError) {
            logger.error('Failed to fetch transaction history', {
                userId: session.user.id,
                error: transactionsError?.message
            });
            return NextResponse.json({ error: 'Failed to fetch transaction history' }, { status: 500 });
        }

        // Format the credit transactions for easier display
        const formattedCredits = (credits as CreditRecord[]).map(credit => ({
            amount: credit.amount,
            description: credit.description,
            date: credit.created_at
        }));

        // Use a type assertion with a more specific type
        const typedTransactions = transactions as unknown as TransactionRecord[];

        // Format the purchase transactions for easier display
        const formattedTransactions = typedTransactions.map(transaction => ({
            id: transaction.id,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            date: transaction.created_at,
            package: transaction.credit_packages && transaction.credit_packages.length > 0
                ? transaction.credit_packages[0].name
                : 'Unknown package',
            credits: transaction.credit_packages && transaction.credit_packages.length > 0
                ? transaction.credit_packages[0].credit_amount
                : 0
        }));

        return NextResponse.json({
            balance: user.credit_balance,
            credits: formattedCredits,
            transactions: formattedTransactions
        });
    } catch (error) {
        logger.error('Unexpected error in credit history route', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'An unexpected error occurred. Please try again later.'
        }, { status: 500 });
    }
}