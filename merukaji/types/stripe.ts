export type PlanName = 'free' | 'pro' | 'max';
export type BillingPeriod = 'monthly' | 'annual';

export interface PriceIds {
    monthly?: string;
    annual?: string;
}

export interface StripePriceIds {
    pro: PriceIds;
    max: PriceIds;
}

export interface StripePlan {
    name: PlanName;
    description: string;
    price: number | { monthly: number; annual: number };
    priceId: string | { monthly: string; annual: string };
    features: string[];
    popular?: boolean;
}

export interface SubscriptionDetails {
    subscriptionId: string;
    customerId: string;
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid';
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: {
        id: string;
        nickname: string | null;
        amount: number;
        currency: string;
        interval: 'month' | 'year';
    };
    nextBillingDate: string;
    amount: number;
    isAnnual: boolean;
    paymentMethod?: {
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
    };
}

export interface TransactionRecord {
    userId: string;
    subscriptionId?: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed';
    stripePaymentIntentId?: string;
    stripeCustomerId: string;
    stripeSubscriptionId?: string;
    createdAt: Date;
}

export interface UserSubscriptionUpdate {
    tier: PlanName;
    subscriptionId?: string;
    stripeCustomerId: string;
    subscriptionStatus: SubscriptionDetails['status'];
    subscriptionUpdatedAt: Date;
}

// Constants
export const STRIPE_PRICE_IDS: StripePriceIds = {
    pro: {
        monthly: 'price_pro_monthly_id', // Replace with your actual Stripe price ID
        annual: 'price_pro_annual_id'    // Replace with your actual Stripe price ID
    },
    max: {
        monthly: 'price_max_monthly_id', // Replace with your actual Stripe price ID
        annual: 'price_max_annual_id'    // Replace with your actual Stripe price ID
    }
};

export const PLAN_FEATURES = {
    free: [
        'Limited to 3 summaries per day',
        'Basic summary length',
        'Standard response time',
        'Public videos only'
    ],
    pro: [
        'Up to 20 summaries per day',
        'Extended summary length',
        'Faster response time',
        'Save summaries to your library',
        'Public and unlisted videos'
    ],
    max: [
        'Unlimited summaries',
        'Comprehensive summary length',
        'Priority processing',
        'Save and organize summaries',
        'Full video library management',
        'Private video support with account linking',
        'Advanced AI model selection'
    ]
} as const;

export const PLAN_LIMITS = {
    free: {
        dailyLimit: 3,
        minuteLimit: 1
    },
    pro: {
        dailyLimit: 20,
        minuteLimit: 3
    },
    max: {
        dailyLimit: 100,
        minuteLimit: 10
    }
} as const;

export const SUBSCRIPTION_STATUSES = {
    ACTIVE: 'active',
    CANCELED: 'canceled',
    PAST_DUE: 'past_due',
    TRIALING: 'trialing',
    INCOMPLETE: 'incomplete',
    INCOMPLETE_EXPIRED: 'incomplete_expired',
    UNPAID: 'unpaid'
} as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[keyof typeof SUBSCRIPTION_STATUSES];