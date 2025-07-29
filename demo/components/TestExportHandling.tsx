// Test file for auto-export functionality

// This interface is NOT exported - should get auto-exported when imported
interface NonExportedInterface {
    userId: string;
    email: string;
    preferences: {
        theme: string;
        language: string;
    };
}

// This one IS already exported - should not be modified
export interface AlreadyExportedInterface {
    id: number;
    status: string;
    createdAt: Date;
}

// Test type (not exported) - should also get auto-exported when imported
type PrivateConfig = {
    secretKey: string;
    dbConnection: string;
    enableLogging: boolean;
}; 