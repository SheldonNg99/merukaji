// app/api/payment/paypal-config/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    const config = {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        environment: process.env.NODE_ENV,
        apiBase: process.env.NODE_ENV === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com'
    };

    // Check if environment variables are loaded
    const status = {
        hasClientId: !!config.clientId,
        clientIdLength: config.clientId?.length || 0,
        clientIdPrefix: config.clientId?.substring(0, 4) || 'none',
        hasClientSecret: !!config.clientSecret,
        clientSecretLength: config.clientSecret?.length || 0,
        clientSecretPrefix: config.clientSecret?.substring(0, 4) || 'none',
        environment: config.environment,
        apiBase: config.apiBase
    };

    // Common issues check
    const issues = [];

    if (!config.clientId) {
        issues.push('PAYPAL_CLIENT_ID is not set');
    } else {
        if (config.clientId.length < 40) {
            issues.push('PAYPAL_CLIENT_ID seems too short (should be around 80 characters)');
        }
        if (!config.clientId.startsWith('A')) {
            issues.push('PAYPAL_CLIENT_ID should start with "A" for sandbox');
        }
    }

    if (!config.clientSecret) {
        issues.push('PAYPAL_CLIENT_SECRET is not set');
    } else {
        if (config.clientSecret.length < 40) {
            issues.push('PAYPAL_CLIENT_SECRET seems too short (should be around 80 characters)');
        }
        if (!config.clientSecret.startsWith('E')) {
            issues.push('PAYPAL_CLIENT_SECRET should start with "E" for sandbox');
        }
    }

    // Check if credentials might be for wrong environment
    if (config.environment !== 'production' && config.clientId) {
        if (config.clientId.includes('live')) {
            issues.push('You might be using LIVE credentials in development mode');
        }
    }

    return NextResponse.json({
        status,
        issues,
        recommendation: issues.length > 0
            ? 'Please check your .env file and PayPal developer dashboard'
            : 'Configuration looks correct'
    });
}