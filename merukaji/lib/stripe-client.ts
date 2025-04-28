import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const PRICE_IDS = {
    pro: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '',
    },
    max: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY_PRICE_ID || '',
        yearly: process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY_PRICE_ID || '',
    },
};

export const SUBSCRIPTION_PLANS = {
    free: {
        name: 'Free',
        price: 0,
        features: [
            '3 summaries per day',
            'Basic summary length',
            'Standard response time',
            'Public videos only'
        ],
    },
    pro: {
        name: 'Pro',
        monthlyPrice: 19,
        yearlyPrice: 17,
        features: [
            'Up to 20 summaries per day',
            'Extended summary length',
            'Faster response time',
            'Save summaries to your library',
            'Public and unlisted videos'
        ],
    },
    max: {
        name: 'Max',
        monthlyPrice: 49,
        yearlyPrice: 44,
        features: [
            'Unlimited summaries',
            'Comprehensive summary length',
            'Priority processing',
            'Save and organize summaries',
            'Full video library management',
            'Private video support with account linking',
            'Advanced AI model selection'
        ],
    },
};

if (typeof window !== 'undefined' && (!PRICE_IDS.pro.monthly || !PRICE_IDS.pro.yearly || !PRICE_IDS.max.monthly || !PRICE_IDS.max.yearly)) {
    console.warn('Missing Stripe price IDs in environment variables');
}