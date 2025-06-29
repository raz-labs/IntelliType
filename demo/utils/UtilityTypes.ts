// Utility types and helper interfaces

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    pool: {
        min: number;
        max: number;
        idle: number;
    };
    retry: {
        attempts: number;
        delay: number;
    };
}

export interface CacheConfig {
    provider: 'redis' | 'memory' | 'file';
    ttl: number;
    maxSize: number;
    compression: boolean;
    serialization: {
        format: 'json' | 'msgpack' | 'binary';
        options: Record<string, any>;
    };
}

export interface LoggerConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text' | 'structured';
    outputs: LogOutput[];
    metadata: {
        includeTimestamp: boolean;
        includeLevel: boolean;
        includeSource: boolean;
        customFields: Record<string, any>;
    };
}

export interface LogOutput {
    type: 'console' | 'file' | 'database' | 'http';
    config: FileLogConfig | DatabaseLogConfig | HttpLogConfig;
    filters?: LogFilter[];
}

export interface FileLogConfig {
    path: string;
    maxSize: string;
    maxFiles: number;
    compress: boolean;
}

export interface DatabaseLogConfig {
    table: string;
    connection: string;
    batchSize: number;
}

export interface HttpLogConfig {
    url: string;
    method: 'POST' | 'PUT';
    headers: Record<string, string>;
    timeout: number;
}

export interface LogFilter {
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'regex';
    value: string;
    action: 'include' | 'exclude';
}

// Complex nested configuration
export interface ApplicationConfig {
    app: {
        name: string;
        version: string;
        environment: 'development' | 'staging' | 'production';
        debug: boolean;
    };
    server: {
        host: string;
        port: number;
        cors: {
            enabled: boolean;
            origins: string[];
            methods: string[];
            credentials: boolean;
        };
        rateLimit: {
            windowMs: number;
            max: number;
            message: string;
        };
    };
    database: DatabaseConfig;
    cache: CacheConfig;
    logging: LoggerConfig;
    features: {
        authentication: boolean;
        registration: boolean;
        emailVerification: boolean;
        passwordReset: boolean;
        twoFactorAuth: boolean;
    };
} 