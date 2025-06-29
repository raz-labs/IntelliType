# IntelliType Quick Start Guide

## 🚀 Running the Extension

### Prerequisites
- Visual Studio Code installed
- Node.js and npm installed
- TypeScript knowledge

### Steps to Run

1. **Open the project in VS Code**
   ```bash
   cd IntelliType
   code .
   ```

2. **Install dependencies (if not already done)**
   ```bash
   npm install
   ```

3. **Compile the TypeScript code**
   ```bash
   npm run compile
   ```

4. **Launch the Extension**
   - Press `F5` in VS Code
   - A new VS Code window will open with the extension loaded
   - This is your "Extension Development Host"

## 🧪 Testing the Extension

1. **Create a test TypeScript file** in the Extension Development Host window
   
2. **Try this example code:**
   ```typescript
   // Untyped object - IntelliType will detect this!
   const user = {
       id: 1,
       name: "John Doe",
       email: "john@example.com"
   };

   // Define an interface that matches
   interface User {
       id: number;
       name: string;
       email: string;
   }
   ```

3. **See IntelliType in action:**
   - Look for a blue squiggly line under `user`
   - Hover over `user` to see the IntelliType tooltip
   - Click on the lightbulb or use `Ctrl+.` to see code actions
   - Select "💡 Show compatible types" to see matching interfaces

## 🔧 Debugging

- Set breakpoints in the TypeScript source files
- Use VS Code's debugging features
- Check the Debug Console for extension logs

## 📝 Configuration

Access IntelliType settings:
1. Go to File > Preferences > Settings
2. Search for "IntelliType"
3. Adjust settings as needed

## 🎯 What to Test

1. **Basic Detection**: Create untyped objects and see if they're detected
2. **Type Matching**: Create interfaces and see if they're suggested
3. **Hover Information**: Hover over detected objects
4. **Code Actions**: Try applying suggested types
5. **Configuration**: Toggle settings and see the effects

## 🐛 Troubleshooting

- **No squiggly lines?** Check if IntelliType is enabled in settings
- **No type suggestions?** Make sure you have interfaces defined in your workspace
- **Extension not loading?** Check the Output panel (View > Output > IntelliType)

## 📚 Next Steps

- Try the extension with your real TypeScript projects
- Report issues or suggest features
- Contribute to the development!

Happy typing with IntelliType! 🎉 