// lib/settings.ts
export interface NotificationPreferences {
    emailSummaries: boolean;
    newFeatures: boolean;
}

export interface UserSettings {
    name: string;
    email: string;
    bio: string;
    notificationPreferences?: NotificationPreferences;
    credit_balance: number;
    free_tier_used: boolean;
    last_credit_reset?: string;
}

export interface UserSettingsResponse {
    success: boolean;
    user: UserSettings;
    error?: string;
}

export interface UpdateSettingsResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export interface UserUpdateData {
    name?: string;
    bio?: string;
    notificationPreferences?: {
        emailSummaries?: boolean;
        newFeatures?: boolean;
    };
    updatedAt: Date;
}