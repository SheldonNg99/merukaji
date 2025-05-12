// types/paypal.ts

// Main interface for PayPal button props
export interface PayPalSubscribeButtonProps {
    planId: string;
    amount: number;
    currency?: string;
    onSuccess: (data: PayPalSubscriptionResponse) => void;
    onError: (error: unknown) => void;
    onCancel: () => void;
    disabled?: boolean;
}

// Response when subscription is created
export interface PayPalSubscriptionResponse {
    subscriptionId: string;
    approvalUrl?: string;
}

// Data structure PayPal sends to onApprove
export interface PayPalSubscriptionData {
    // Make this optional to match PayPal's type
    subscriptionID?: string;
    facilitatorAccessToken?: string;
    orderID?: string;
}

// Button style options
export interface PayPalButtonStyle {
    shape?: 'rect' | 'pill';
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
    layout?: 'vertical' | 'horizontal';
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment' | 'subscribe';
    height?: number;
    tagline?: boolean;
}

// Make message required for error
export interface PayPalErrorType {
    message: string;
    name?: string;
    details?: unknown;
    stack?: string;
}

// PayPal's actual error structure
export interface PayPalErrorDetails {
    message?: string;
    name?: string;
    details?: unknown;
    stack?: string;
}

// Faking the PayPal SDK types to make TypeScript happy
export interface PayPalButtonsComponent {
    render: (container: string | HTMLElement) => Promise<void>;
}

export interface PayPalButtonsComponentOptions {
    style?: PayPalButtonStyle;
    createSubscription?: () => Promise<string>;
    onApprove?: (data: PayPalSubscriptionData, actions?: unknown) => Promise<void> | void;
    onCancel?: () => void;
    onError?: (err: PayPalErrorType) => void;
}

export interface PayPalNamespace {
    Buttons: (options?: PayPalButtonsComponentOptions) => PayPalButtonsComponent;
}

// Add this at the top of the file with the other imports and types

// Interfaces for PayPal responses
export interface PayPalAmount {
    currency_code: string;
    value: string;
}

export interface PayPalCapture {
    id: string;
    status: string;
    amount: PayPalAmount;
    final_capture: boolean;
    disbursement_mode: string;
    seller_protection: {
        status: string;
        dispute_categories: string[];
    };
    seller_receivable_breakdown: {
        gross_amount: PayPalAmount;
        paypal_fee: PayPalAmount;
        net_amount: PayPalAmount;
    };
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
    create_time: string;
    update_time: string;
}

export interface PayPalPaymentSource {
    paypal: {
        email_address: string;
        account_id: string;
        name: {
            given_name: string;
            surname: string;
        };
        address?: {
            country_code: string;
        };
    };
}

export interface PayPalCaptureDetails {
    id: string;
    status: string;
    payment_source: PayPalPaymentSource;
    purchase_units: Array<{
        reference_id: string;
        shipping?: {
            address: {
                address_line_1: string;
                admin_area_2: string;
                admin_area_1: string;
                postal_code: string;
                country_code: string;
            };
        };
        payments: {
            captures: PayPalCapture[];
        };
    }>;
    payer: {
        name: {
            given_name: string;
            surname: string;
        };
        email_address: string;
        payer_id: string;
    };
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
}

// Define proper TypeScript interfaces for our data
export interface CreditRecord {
    amount: number;
    description: string;
    created_at: string;
}

// More specific interface for credit package
export interface CreditPackage {
    name: string;
    credit_amount: number;
}

// Corrected interface to match Supabase's return format for nested relations
export interface TransactionRecord {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    credit_packages: CreditPackage[];
}

export interface CreditTransaction {
    id: string;
    amount: number;
    description: string;
    date: string;
}

export interface PurchaseTransaction {
    id: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    package: string;
    credits: number;
}

// Type definition for PayPal order details
export interface PayPalOrderDetails {
    id: string;
    status: string;
    intent?: string;
    purchase_units?: Array<{
        reference_id?: string;
        amount?: {
            value?: string;
            currency_code?: string;
        };
    }>;
}

export interface CreditPackage {
    id: string;
    name: string;
    creditAmount: number;
    price: number;
    description: string;
    productId: string;
}