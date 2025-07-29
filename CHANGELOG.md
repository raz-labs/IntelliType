# Change Log

All notable changes to the "IntelliType" extension will be documented in this file.

## [0.2.0] - 2024-01-01 - Enhanced Import Experience

### Added
- 🚀 **Auto-Export**: Automatically adds `export` keyword to types that aren't exported when importing them
- ✨ **Smart Hover Dismiss**: Auto-closes hover tooltip after clicking on a suggested type link for better UX
- 📂 **Improved Import Paths**: Intelligently removes `/index.tsx` and `/index.ts` from import paths for cleaner imports

### Improved
- Enhanced import path resolution for index files
- Better user experience with automatic hover dismissal
- Seamless workflow for importing non-exported types

### Technical Changes
- Added `checkAndHandleExport()` method to automatically export types when needed
- Enhanced `getRelativePath()` to handle index files properly
- Added `dismissHover()` method for better tooltip management

## [0.1.0] - 2024-01-01 - MVP Release

### Added
- 🔍 **Object Shape Analysis**: Automatically detects untyped objects in TypeScript files
- 💡 **Diagnostic Indicators**: Shows subtle blue squiggly lines under untyped objects
- 🎯 **Type Matching**: Scans workspace for compatible interfaces and types
- 👆 **Hover Provider**: Shows object properties and "Show compatible types" action on hover
- ⚡ **Code Actions**: Quick fix to show and apply compatible types
- ⚙️ **Configuration Options**: 
  - Enable/disable extension
  - Toggle diagnostic indicators
  - Set minimum compatibility score
  - Configure maximum suggestions
- 📁 **File Type Support**: Works with .ts and .tsx files

### Known Limitations (MVP)
- Type matching is limited to interfaces (not type aliases yet)
- Auto-import functionality not implemented
- Generic types not fully supported
- Cross-file type analysis is basic
- No support for complex types (unions, intersections)

### Technical Details
- Built with TypeScript Compiler API
- Integrates with VS Code's Language Server Protocol
- Non-blocking async operations
- Workspace-wide type scanning

---

## Roadmap

### [0.2.0] - Planned
- Auto-import functionality
- Support for type aliases
- Better generic type handling
- Performance optimizations

### [0.3.0] - Planned
- Advanced type matching algorithms
- Support for union and intersection types
- Batch type application
- Integration with popular TypeScript frameworks

### [1.0.0] - Planned
- Machine learning-based type suggestions
- Cross-project type discovery
- Advanced configuration options
- Full production readiness 