export interface NotificationPreferences {
    emailSummaries: boolean;
    newFeatures: boolean;
}

export interface UserSettings {
    name: string;
    email: string;
    bio: string;
    notificationPreferences: NotificationPreferences;
    tier: string;
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