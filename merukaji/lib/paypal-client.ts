import { loadScript } from "@paypal/paypal-js";

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

export const PRICE_IDS = {
    pro: {
        monthly: process.env.NEXT_PUBLIC_PAYPAL_PRO_MONTHLY_PLAN_ID || '',
        yearly: process.env.NEXT_PUBLIC_PAYPAL_PRO_YEARLY_PLAN_ID || '',
    },
    max: {
        monthly: process.env.NEXT_PUBLIC_PAYPAL_MAX_MONTHLY_PLAN_ID || '',
        yearly: process.env.NEXT_PUBLIC_PAYPAL_MAX_YEARLY_PLAN_ID || '',
    },
};

// Load the PayPal SDK dynamically
export async function loadPayPalScript() {
    return loadScript({
        // Use camelCase for the options
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
        currency: "JPY",
        intent: "subscription",
        components: "buttons"
    });
}

// Check if PayPal is properly configured
export const isPayPalConfigured = () => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    return Boolean(
        clientId &&
        PRICE_IDS.pro.monthly &&
        PRICE_IDS.pro.yearly &&
        PRICE_IDS.max.monthly &&
        PRICE_IDS.max.yearly
    );
};

// Helper for formatting prices
export const formatPrice = (price: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0
    }).format(price);
};