// app/api/credits/packages/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get available credit packages
        const { data: packages, error: packagesError } = await supabaseAdmin
            .from('credit_packages')
            .select('*')
            .eq('is_active', true)
            .order('price', { ascending: true });

        if (packagesError) {
            logger.error('Failed to fetch credit packages', {
                error: packagesError.message
            });
            return NextResponse.json({ error: 'Failed to fetch credit packages' }, { status: 500 });
        }

        // Format the packages
        const formattedPackages = packages.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            creditAmount: pkg.credit_amount,
            price: pkg.price,
            description: pkg.description,
            productId: pkg.product_id
        }));

        return NextResponse.json({
            success: true,
            packages: formattedPackages
        });
    } catch (error) {
        logger.error('Failed to get credit packages', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json({
            error: 'An error occurred while fetching credit packages'
        }, { status: 500 });
    }
}