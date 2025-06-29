# IntelliType ✨

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/raz-labs.intellitype?style=for-the-badge&label=Marketplace&logo=visual-studio-code&color=blue)](https://marketplace.visualstudio.com/items?itemName=raz-labs.intellitype)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/raziel5746/IntelliType)

**Intelligent TypeScript type discovery and application for VS Code**

![IntelliType Logo](https://raw.githubusercontent.com/raziel5746/IntelliType/main/images/icon.svg)

## Overview

IntelliType is a VS Code extension that helps TypeScript developers discover and apply existing types to untyped objects in their codebase. It automatically analyzes object shapes and suggests compatible interfaces, reducing code duplication and improving type consistency.

## Features

### 🔍 Smart Object Analysis
- Automatically detects untyped objects in TypeScript files
- Analyzes object shapes and property structures
- Shows subtle diagnostic indicators for objects that could benefit from typing

### 💡 Intelligent Type Suggestions
- Hover over untyped objects to see a list of compatible types
- See a compatibility score for each suggested type
- Click a suggested type directly in the hover panel to apply it
- Automatic import statements are added when a type is applied

### ⚡ Seamless Integration
- Works with your existing TypeScript (`.ts` and `.tsx`) configuration
- Non-intrusive UI that follows VS Code conventions
- Configurable diagnostic levels

## Installation

1. Open **VS Code**
2. Go to the **Extensions** view (`Ctrl+Shift+X`)
3. Search for `IntelliType`
4. Click **Install** on the **"IntelliType"** extension by **raz-labs**

Alternatively, open the command palette (`Ctrl+P`) and enter:
```
ext install raz-labs.intellitype
```

## Usage

1. Open any TypeScript or TSX file in your project.
2. IntelliType will automatically analyze untyped object literals.
3. Look for a **wavy blue underline** beneath the names of untyped variables.
4. **Hover** over an underlined variable to see a popup with compatible type suggestions.
5. In the hover panel, **click on the name** of the type you want to apply.
6. The type will be applied to your variable, and an import statement will be added if necessary.

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
  "intellitype.maxSuggestions": 5,
  
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
- Generic types are not fully supported in the MVP

## Release Notes

### 0.1.0 (MVP)

- Initial release
- Basic object shape analysis
- Diagnostic indicators for untyped objects
- Hover provider with property information
- Simple type matching and application

## Contributing

This project is open source and contributions are welcome! If you have a feature request, bug report, or want to contribute to the code, please check out the [GitHub repository](https://github.com/raziel5746/IntelliType).

Please feel free to open an issue or submit a pull request.

## License

This extension is licensed under the [MIT License](https://github.com/raziel5746/IntelliType/blob/main/LICENSE).

---

**Enjoy coding with IntelliType!** 🚀 