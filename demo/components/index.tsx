// Test index file for import path improvements
export interface IndexTestType {
    name: string;
    version: string;
    isActive: boolean;
}

export interface AnotherTestType {
    title: string;
    description: string;
    count: number;
}

// This should be imported without the /index.tsx suffix
export type IndexConfig = {
    environment: string;
    debugMode: boolean;
    apiUrl: string;
}; 