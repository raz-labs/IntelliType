// User-related type definitions

export interface User {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
    profile: UserProfile;
    settings: UserSettings;
}

export interface UserProfile {
    avatar: string;
    bio: string;
    location: Address;
    socialLinks: SocialLinks;
}

export interface Address {
    street: string;
    city: string;
    country: string;
    zipCode: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}

export interface SocialLinks {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
}

export interface UserSettings {
    theme: 'light' | 'dark' | 'auto';
    notifications: NotificationSettings;
    privacy: PrivacySettings;
}

export interface NotificationSettings {
    email: boolean;
    push: boolean;
    sms: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export interface PrivacySettings {
    profileVisible: boolean;
    showEmail: boolean;
    allowMessages: boolean;
    dataSharing: {
        analytics: boolean;
        marketing: boolean;
        thirdParty: boolean;
    };
}

// Alternative user types for testing compatibility
export interface BasicUser {
    id: number;
    name: string;
    email: string;
}

export interface AdminUser extends BasicUser {
    role: 'admin' | 'super-admin';
    permissions: string[];
    lastLogin: Date;
}

export type UserRole = 'user' | 'admin' | 'moderator' | 'guest';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending'; 