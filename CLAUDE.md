# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IntelliType is a VS Code extension that provides intelligent TypeScript type discovery and application. It analyzes untyped objects in TypeScript files and suggests compatible interfaces from the codebase, allowing developers to quickly apply types with automatic import generation.

## Development Commands

### Core Development
- `npm run compile` - Compile TypeScript to JavaScript (required for testing)
- `npm run watch` - Watch mode compilation during development
- `npm run lint` - Run ESLint on source files
- `npm run test` - Run extension tests (requires compilation first)
- `npm run pretest` - Compile and lint before testing
- `npm run vscode:prepublish` - Prepare for publishing (runs compile)

### VS Code Extension Testing
- Use F5 in VS Code to launch Extension Development Host for testing
- Tests are located in `out/test/` after compilation
- Extension activates for TypeScript and TSX files

## Architecture

### Core Components

**Extension Entry (`src/extension.ts`)**
- Initializes TypeAnalyzer, DecorationManager, and IntelliTypeProvider
- Handles activation/deactivation lifecycle
- Manages configuration change listeners

**Type Analysis System**
- `TypeAnalyzer` (`src/analyzers/TypeAnalyzer.ts`) - Main engine that finds untyped objects using TypeScript AST
- `TypeMatcher` (`src/analyzers/TypeMatcher.ts`) - Matches object shapes against existing type definitions
- `IntelliTypeProvider` (`src/providers/IntelliTypeProvider.ts`) - Hover provider and command handler

**User Interface**
- `DecorationManager` (`src/decorations/DecorationManager.ts`) - Shows diagnostic underlines for untyped objects
- Hover tooltips display compatible types with click-to-apply functionality
- Automatic import statement generation when applying types

### Key Data Structures (`src/types/index.ts`)
- `ObjectShape` - Represents the structure of an untyped object
- `TypeMatch` - Represents a compatible type with compatibility score
- `UntypedObject` - Combines object shape with location information
- `PropertySignature` - Describes object properties including nested structures

### Type Matching Algorithm
1. Scans TypeScript files for variable declarations without explicit types
2. Analyzes object literal structures recursively
3. Matches against existing interfaces/types in the workspace
4. Calculates compatibility scores based on property matches
5. Ranks results by score and file proximity

### Configuration
Extension settings in `package.json` include:
- `intellitype.enabled` - Enable/disable extension
- `intellitype.minimumCompatibilityScore` - Minimum match threshold (0-1)
- `intellitype.maxSuggestions` - Maximum suggestions in hover
- `intellitype.includeNodeModules` - Include node_modules types
- `intellitype.excludePatterns` - File patterns to exclude from analysis

## Development Notes

### Building and Testing
Always run `npm run compile` before testing since the extension uses JavaScript output in the `out/` directory. The `pretest` script handles this automatically.

### TypeScript Configuration
- Target: ES2020
- Module: CommonJS 
- Source maps enabled for debugging
- Strict mode enabled
- Demo files excluded from compilation

### File Structure
- `/src` - Source TypeScript files
- `/out` - Compiled JavaScript (excluded from git)
- `/demo` - Test files for extension development
- `/images` - Extension icon and assets

The extension follows VS Code extension patterns with proper disposal handling and configuration management.