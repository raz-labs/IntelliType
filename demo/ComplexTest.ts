// Complex test scenarios for IntelliType

// Test 1: Basic user object (should match types/UserTypes.ts)
const basicUser = {
    id: 123,
    name: "John Doe",
    email: "john@example.com"
};

// Test 2: Complex nested user object (should match User from types/UserTypes.ts)
const complexUser = {
    id: 456,
    name: "Jane Smith",
    email: "jane@example.com",
    createdAt: new Date(),
    profile: {
        location: {
            street: "123 Main St",
            city: "San Francisco",
            country: "USA",
            zipCode: "94105",
            coordinates: {
                lat: 37.7749,
                lng: -122.4194
            }
        },
        socialLinks: {
            github: "https://github.com/janesmith",
            linkedin: "https://linkedin.com/in/janesmith"
        }
    },
    settings: {
        theme: "dark",
        notifications: {
            email: true,
            push: false,
            sms: true,
            frequency: "daily"
        },
        privacy: {
            profileVisible: true,
            showEmail: false,
            allowMessages: true,
            dataSharing: {
                analytics: true,
                marketing: false,
                thirdParty: false
            }
        }
    }
};

// Test 3: API response object (should match api/ApiTypes.ts)
const apiResponse = {
    success: true,
    data: { userId: 123, token: "abc123" },
    message: "Login successful",
    timestamp: new Date(),
    meta: {
        requestId: "req-123",
        version: "1.0.0",
        rateLimit: {
            remaining: 100,
            resetTime: new Date(),
            limit: 1000
        }
    }
};

// Test 4: Button props (should match components/ComponentTypes.ts)
const buttonConfig = {
    text: "Click me",
    variant: "primary",
    size: "medium",
    disabled: false,
    loading: false,
    onClick: (event: MouseEvent) => console.log("clicked")
};

// Test 5: Database configuration (should match utils/UtilityTypes.ts)
const dbConfig = {
    host: "localhost",
    port: 5432,
    database: "myapp",
    username: "admin",
    password: "secret",
    ssl: true,
    pool: {
        min: 2,
        max: 10,
        idle: 30000
    },
    retry: {
        attempts: 3,
        delay: 1000
    }
};

// Test 6: Partial matches (missing some properties)
const partialUser = {
    id: 789,
    name: "Bob Wilson"
    // Missing email - should still match BasicUser with lower compatibility
};

// Test 7: Extra properties (should match with some compatibility)
const extendedUser = {
    id: 999,
    name: "Alice Brown",
    email: "alice@example.com",
    age: 30,
    department: "Engineering"
    // Extra properties that don't exist in BasicUser
};

// Test 8: Search request (should match api/ApiTypes.ts)
const searchQuery = {
    query: "laptop",
    filters: {
        category: ["electronics", "computers"],
        priceRange: {
            min: 500,
            max: 2000
        },
        tags: ["gaming", "portable"]
    },
    pagination: {
        page: 1,
        limit: 20
    }
};

// Test 9: Deeply nested application config (should match utils/UtilityTypes.ts)
const appConfig = {
    app: {
        name: "MyApp",
        version: "2.1.0",
        environment: "production",
        debug: false
    },
    server: {
        host: "0.0.0.0",
        port: 3000,
        cors: {
            enabled: true,
            origins: ["https://myapp.com"],
            methods: ["GET", "POST", "PUT", "DELETE"],
            credentials: true
        },
        rateLimit: {
            windowMs: 900000,
            max: 100,
            message: "Too many requests"
        }
    },
    database: {
        host: "db.example.com",
        port: 5432,
        database: "production_db",
        username: "app_user",
        password: "super_secret",
        ssl: true,
        pool: {
            min: 5,
            max: 20,
            idle: 10000
        },
        retry: {
            attempts: 5,
            delay: 2000
        }
    },
    features: {
        authentication: true,
        registration: true,
        emailVerification: true,
        passwordReset: true,
        twoFactorAuth: false
    }
};

// Test 10: Table configuration (should match components/ComponentTypes.ts)
const tableSetup = {
    data: [
        { id: 1, name: "Item 1", price: 100 },
        { id: 2, name: "Item 2", price: 200 }
    ],
    columns: [
        { key: "id", title: "ID", sortable: true },
        { key: "name", title: "Name", filterable: true },
        { key: "price", title: "Price", sortable: true }
    ],
    pagination: {
        current: 1,
        pageSize: 10,
        total: 100,
        onChange: (page: number, pageSize: number) => console.log(page, pageSize)
    },
    loading: false
};

// Test nested object matching improvement
const nestedTestUser = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    profile: {
        bio: "Software developer",
        avatar: "avatar.jpg",
        preferences: {
            theme: "dark",
            notifications: true
        }
    },
    addresses: [
        {
            street: "123 Main St",
            city: "New York",
            zipCode: "10001",
            country: "USA",
            isPrimary: true
        }
    ]
}; 