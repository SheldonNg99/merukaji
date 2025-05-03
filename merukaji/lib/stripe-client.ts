import { loadStripe } from '@stripe/stripe-js';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export const stripePromise = typeof window !== 'undefined' && publishableKey ?
    loadStripe(publishableKey) :
    null;

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

// Add a helper function to check if Stripe is properly configured
export const isStripeConfigured = () => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY;

    return Boolean(
        publishableKey &&
        PRICE_IDS.pro.monthly &&
        PRICE_IDS.pro.yearly &&
        PRICE_IDS.max.monthly &&
        PRICE_IDS.max.yearly
    );
};

if (typeof window !== 'undefined' &&
    !(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY)) {
    console.warn('Stripe publishable key is missing in environment variables');
}

if (typeof window !== 'undefined' &&
    (!PRICE_IDS.pro.monthly ||
        !PRICE_IDS.pro.yearly ||
        !PRICE_IDS.max.monthly ||
        !PRICE_IDS.max.yearly)) {
    console.warn('Missing Stripe price IDs in environment variables');
}