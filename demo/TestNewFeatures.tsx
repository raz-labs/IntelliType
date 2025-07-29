// Test file for IntelliType v0.2.0 new features
// Try hovering over the objects below and applying the suggested types!

// 1. Test improved import paths (should import from './components' not './components/index.tsx')
const testIndexImport = {
    name: "My App",
    version: "1.0.0",
    isActive: true
};

// 2. Test auto-export functionality (should auto-add export to NonExportedInterface)
const testAutoExport = {
    userId: "user123",
    email: "test@example.com",
    preferences: {
        theme: "dark",
        language: "en"
    }
};

// 3. Test another auto-export case with type alias
const testTypeAlias = {
    secretKey: "secret123",
    dbConnection: "mongodb://localhost",
    enableLogging: true
};

// 4. Test normal export handling (should work as before)
const testNormalExport = {
    id: 42,
    status: "active",
    createdAt: new Date()
};

// 5. Test hover dismissal - hover should close after clicking apply
const testHoverDismiss = {
    environment: "production",
    debugMode: false,
    apiUrl: "https://api.example.com"
};

/*
INSTRUCTIONS FOR TESTING:
1. Hover over any of the objects above
2. Click on a suggested type link in the hover tooltip
3. Notice that:
   - The import path should be clean (no '/index.tsx')
   - Non-exported types should get auto-exported
   - The hover tooltip should auto-dismiss after applying
   - Everything should work smoothly!
*/ 