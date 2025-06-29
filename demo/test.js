"use strict";
// Demo file for IntelliType extension
// Example 1: User object without type
const user = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    createdAt: new Date()
};
// Example 2: Product object without type
const product = {
    id: "prod-123",
    name: "Laptop",
    price: 999.99,
    inStock: true,
    categories: ["Electronics", "Computers"]
};
// Example 3: Configuration object without type
const config = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
    retryAttempts: 3,
    enableLogging: true
};
// Example of a typed object (IntelliType will ignore this)
const typedUser = {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    createdAt: new Date()
};
//# sourceMappingURL=test.js.map