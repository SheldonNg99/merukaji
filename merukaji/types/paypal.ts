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