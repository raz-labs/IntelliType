# IntelliType - Intelligent TypeScript Type Discovery

![IntelliType Logo](images/icon.png)

## Overview

IntelliType is a VS Code extension that helps TypeScript developers discover and apply existing types to untyped objects in their codebase. It automatically analyzes object shapes and suggests compatible interfaces, reducing code duplication and improving type consistency.

## Features

### 🔍 Smart Object Analysis
- Automatically detects untyped objects in TypeScript files
- Analyzes object shapes and property structures
- Shows subtle diagnostic indicators for objects that could benefit from typing

### 💡 Intelligent Type Suggestions
- Hover over untyped objects to see detected properties
- Click "Show compatible types" to see matching interfaces
- One-click type application

### ⚡ Seamless Integration
- Works with your existing TypeScript configuration
- Non-intrusive UI that follows VS Code conventions
- Configurable diagnostic levels

## Installation

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P` to open the Quick Open dialog
3. Type `ext install intellitype` and press Enter
4. Reload VS Code

## Usage

1. Open any TypeScript file in your project
2. IntelliType will automatically analyze untyped objects
3. Look for blue squiggly lines under object variable names
4. Hover over the underlined object to see available actions
5. Click "Show compatible types" to see matching interfaces
6. Select a type from the list to apply it

### Example

```typescript
// Before IntelliType
const user = {
    id: 1,
    name: "John Doe",
    email: "john@example.com"
};

// After using IntelliType (one click!)
const user: User = {
    id: 1,
    name: "John Doe",
    email: "john@example.com"
};
```

## Configuration

IntelliType can be configured through VS Code settings:

```json
{
  // Enable/disable the extension
  "intellitype.enabled": true,
  
  // Show diagnostic squiggly lines
  "intellitype.showDiagnostics": true,
  
  // Minimum compatibility score (0-1)
  "intellitype.minimumCompatibilityScore": 0.7,
  
  // Maximum number of type suggestions
  "intellitype.maxSuggestions": 10,
  
  // Include types from node_modules
  "intellitype.includeNodeModules": false
}
```

## Requirements

- VS Code 1.74.0 or higher
- TypeScript 4.0 or higher
- A TypeScript project with a `tsconfig.json` file

## Known Issues

- Type matching is currently limited to exact property matches
- Auto-import functionality is not yet implemented
- Generic types are not fully supported in the MVP

## Release Notes

### 0.1.0 (MVP)

- Initial release
- Basic object shape analysis
- Diagnostic indicators for untyped objects
- Hover provider with property information
- Simple type matching and application

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT

---

**Enjoy coding with IntelliType!** 🚀 