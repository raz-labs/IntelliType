// API-related type definitions

export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message: string;
    timestamp: Date;
    meta: ResponseMeta;
}

export interface ResponseMeta {
    requestId: string;
    version: string;
    pagination?: PaginationInfo;
    rateLimit: RateLimitInfo;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface RateLimitInfo {
    remaining: number;
    resetTime: Date;
    limit: number;
}

export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
        stack?: string;
    };
    timestamp: Date;
}

// Specific API endpoints
export interface LoginRequest {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface LoginResponse {
    token: string;
    refreshToken: string;
    user: {
        id: number;
        email: string;
        name: string;
    };
    expiresIn: number;
}

export interface SearchRequest {
    query: string;
    filters: SearchFilters;
    pagination: {
        page: number;
        limit: number;
    };
}

export interface SearchFilters {
    category?: string[];
    priceRange?: {
        min: number;
        max: number;
    };
    dateRange?: {
        from: Date;
        to: Date;
    };
    tags?: string[];
}

export interface SearchResult {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    thumbnail: string;
    score: number;
    highlights: {
        title?: string[];
        description?: string[];
    };
} 