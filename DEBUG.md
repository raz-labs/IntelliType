# IntelliType Debug Guide

## 🐛 Troubleshooting Steps

### 1. Check Extension Activation

1. **Open the Extension Development Host** (F5)
2. **Open Developer Tools**: `Help > Toggle Developer Tools`
3. **Check the Console** for IntelliType messages:
   - Look for: `🚀 IntelliType extension is now active!`
   - Look for: `✅ IntelliType providers registered successfully`

### 2. Test with Simple TypeScript File

Create a new file called `test.ts` with this content:
```typescript
const user = {
    id: 1,
    name: "John"
};

interface User {
    id: number;
    name: string;
}
```

### 3. Check Debug Console Output

After opening the test file, you should see logs like:
- `🔍 IntelliType: Analyzing document: /path/to/test.ts`
- `🔎 TypeAnalyzer: Analyzing document language: typescript`
- `✅ TypeAnalyzer: Source file created, starting AST traversal`
- `🔍 Found variable declaration: user`
- `📋 Variable has no type annotation and has initializer`
- `🎯 Found object literal expression!`
- `✅ Added untyped object: user`

### 4. Check Extension Settings

1. Go to `File > Preferences > Settings`
2. Search for "IntelliType"
3. Verify these settings:
   - `intellitype.enabled`: ✅ true
   - `intellitype.showDiagnostics`: ✅ true

### 5. Manual Extension Reload

If the extension isn't working:
1. In the Extension Development Host, press `Ctrl+Shift+P`
2. Type "Developer: Reload Window"
3. Press Enter

### 6. Check File Language Mode

Make sure your file is recognized as TypeScript:
1. Look at the bottom right of VS Code
2. Should show "TypeScript" or "TypeScript React"
3. If not, click on it and select "TypeScript"

## 🔍 Common Issues

### No Squiggly Lines Appearing

**Possible Causes:**
1. Extension not activated
2. File not recognized as TypeScript
3. Settings disabled
4. Error in extension code

**Debug Steps:**
1. Check console for error messages
2. Verify file language mode
3. Check extension settings
4. Try reloading the window

### Extension Not Loading

**Possible Causes:**
1. Compilation errors
2. Missing dependencies
3. VS Code version compatibility

**Debug Steps:**
1. Run `npm run compile` in terminal
2. Check for TypeScript errors
3. Verify VS Code version (needs 1.74.0+)

## 📝 What to Report

If you're still having issues, please provide:

1. **Console Output**: Copy all IntelliType-related messages
2. **VS Code Version**: From `Help > About`
3. **File Content**: The TypeScript file you're testing with
4. **Extension Settings**: Your IntelliType configuration
5. **Steps Taken**: What you tried from this debug guide

## 🚀 Expected Behavior

When working correctly, you should see:
1. Blue squiggly lines under untyped object variable names
2. Hover tooltip showing object properties
3. Code action "💡 Show compatible types"
4. Quick pick menu with matching interfaces

## 🔧 Reset Extension

To completely reset the extension:
1. Close all VS Code windows
2. Run `npm run compile` in the project folder
3. Open VS Code and press F5 again 