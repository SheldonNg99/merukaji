import { loadScript } from "@paypal/paypal-js";

export const CREDIT_PACKAGES = {
    free: {
        name: 'Free',
        price: 0,
        credits: 3,
        features: [
            '3 free credits for new users',
            'Basic summary length',
            'Standard response time',
            'Public videos only'
        ],
    },
    basic: {
        name: 'Basic',
        price: 750,
        credits: 5,
        features: [
            '5 credits',
            'Extended summary length',
            'Faster response time',
            'Public and unlisted videos'
        ],
    },
    standard: {
        name: 'Standard',
        price: 2250,
        credits: 15,
        features: [
            '15 credits (15% discount)',
            'Extended summary length',
            'Faster response time',
            'Save summaries to your library',
            'Public and unlisted videos'
        ],
    },
};

export const PRODUCT_IDS = {
    basic: process.env.NEXT_PUBLIC_PAYPAL_BASIC_PRODUCT_ID || '',
    standard: process.env.NEXT_PUBLIC_PAYPAL_STANDARD_PRODUCT_ID || '',
};

// Load the PayPal SDK dynamically
export async function loadPayPalScript() {
    return loadScript({
        // Use camelCase for the options
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
        currency: "JPY",
        intent: "capture",  // Changed from "subscription" to "capture" for one-time payments
        components: "buttons"
    });
}

// Check if PayPal is properly configured
export const isPayPalConfigured = () => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    return Boolean(
        clientId &&
        PRODUCT_IDS.basic &&
        PRODUCT_IDS.standard
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