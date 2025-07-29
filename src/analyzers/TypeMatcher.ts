import * as vscode from 'vscode';
import * as ts from 'typescript';
import { ObjectShape, TypeMatch, PropertySignature, NestedPropertyMatch } from '../types';
import * as path from 'path';

interface InterfaceInfo {
    name: string;
    properties: PropertySignature[];
    filePath: string;
    location: vscode.Location;
}

export class TypeMatcher {
    private interfaceCache: Map<string, InterfaceInfo[]> = new Map();
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private isInitialized = false;
    private initializationPromise: Promise<void> | undefined;
    private updateDebounceTimer: NodeJS.Timeout | undefined;
    private readonly DEBOUNCE_MS = 500;

    constructor() {
        // Don't block constructor - initialize asynchronously
        this.initializeAsync();
    }

    private async initializeAsync(): Promise<void> {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    private async performInitialization(): Promise<void> {
        console.log('🚀 IntelliType: Starting type analysis...');
        
        // Setup file watcher first
        this.setupFileWatcher();
        
        // Show progress for initial scan
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "IntelliType: Analyzing workspace types",
            cancellable: false
        }, async (progress) => {
            await this.scanWorkspaceForTypes(progress);
        });

        this.isInitialized = true;
        console.log(`✅ IntelliType: Analysis complete! Found ${this.getTotalInterfaceCount()} interfaces`);
    }

    private getTotalInterfaceCount(): number {
        let total = 0;
        for (const interfaces of this.interfaceCache.values()) {
            total += interfaces.length;
        }
        return total;
    }

    private setupFileWatcher(): void {
        // Watch for TypeScript file changes
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            '**/*.{ts,tsx}',
            false, // don't ignore creates
            false, // don't ignore changes
            false  // don't ignore deletes
        );

        // Debounced update for file changes
        this.fileWatcher.onDidCreate(this.debouncedFileUpdate.bind(this));
        this.fileWatcher.onDidChange(this.debouncedFileUpdate.bind(this));
        this.fileWatcher.onDidDelete(this.handleFileDelete.bind(this));
    }

    private debouncedFileUpdate(uri: vscode.Uri): void {
        // Skip if file should be ignored
        if (this.shouldIgnoreFile(uri.fsPath)) {
            return;
        }

        // Clear existing debounce timer
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
        }

        // Set new debounce timer
        this.updateDebounceTimer = setTimeout(async () => {
            console.log(`🔄 IntelliType: Updating ${path.basename(uri.fsPath)}`);
            await this.extractInterfacesFromFile(uri);
        }, this.DEBOUNCE_MS);
    }

    private handleFileDelete(uri: vscode.Uri): void {
        if (this.interfaceCache.has(uri.fsPath)) {
            console.log(`🗑️ IntelliType: Removing ${path.basename(uri.fsPath)} from cache`);
            this.interfaceCache.delete(uri.fsPath);
        }
    }

    private shouldIgnoreFile(filePath: string): boolean {
        // Normalize path separators
        const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
        
        // Get exclude patterns from configuration
        const config = vscode.workspace.getConfiguration('intellitype');
        const configPatterns = config.get<string[]>('excludePatterns', []);
        
        // Default patterns for performance
        const defaultPatterns = [
            '/node_modules/',
            '/dist/',
            '/build/',
            '/out/',
            '/.next/',
            '/coverage/',
            '/.git/',
            '.test.ts',
            '.spec.ts',
            '.d.ts',
            '.js.map',
            '.min.js'
        ];
        
        // Combine default and config patterns
        const allPatterns = [...defaultPatterns, ...configPatterns.map(p => p.toLowerCase())];
        
        return allPatterns.some(pattern => normalizedPath.includes(pattern));
    }

    private async scanWorkspaceForTypes(progress?: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
        // Get configuration
        const config = vscode.workspace.getConfiguration('intellitype');
        const includeNodeModules = config.get<boolean>('includeNodeModules', false);
        const batchSize = config.get<number>('batchSize', 10);
        
        // Build exclude pattern based on configuration
        let excludePattern = '{**/dist/**,**/build/**,**/out/**,**/.next/**,**/coverage/**,**/*.test.ts,**/*.spec.ts,**/*.d.ts}';
        if (!includeNodeModules) {
            excludePattern = '{**/node_modules/**,**/dist/**,**/build/**,**/out/**,**/.next/**,**/coverage/**,**/*.test.ts,**/*.spec.ts,**/*.d.ts}';
        }
        
        // Use more specific glob pattern with exclusions
        const tsFiles = await vscode.workspace.findFiles(
            '**/*.{ts,tsx}',
            excludePattern
        );
        
        console.log(`🔍 IntelliType: Found ${tsFiles.length} TypeScript files to analyze`);
        
        if (tsFiles.length === 0) {
            return;
        }

        // Process files in configurable batches
        for (let i = 0; i < tsFiles.length; i += batchSize) {
            const batch = tsFiles.slice(i, i + batchSize);
            
            // Update progress
            if (progress) {
                const percentage = ((i + batch.length) / tsFiles.length) * 100;
                progress.report({
                    message: `Processing ${i + batch.length}/${tsFiles.length} files...`,
                    increment: (batchSize / tsFiles.length) * 100
                });
            }

            // Process batch
            await Promise.all(batch.map(file => this.extractInterfacesFromFile(file)));
            
            // Allow other operations to run
            await new Promise(resolve => setImmediate(resolve));
        }
    }

    private async extractInterfacesFromFile(fileUri: vscode.Uri): Promise<void> {
        try {
            // Skip files that should be ignored
            if (this.shouldIgnoreFile(fileUri.fsPath)) {
                return;
            }

            const document = await vscode.workspace.openTextDocument(fileUri);
            const text = document.getText();
            
            // Quick check - skip files with no interfaces
            if (!text.includes('interface ') && !text.includes('type ')) {
                return;
            }

            const sourceFile = ts.createSourceFile(
                fileUri.fsPath,
                text,
                ts.ScriptTarget.Latest,
                true
            );

            const interfaces: InterfaceInfo[] = [];

            const visit = (node: ts.Node) => {
                if (ts.isInterfaceDeclaration(node) && node.name) {
                    const properties = this.extractProperties(node);
                    const start = document.positionAt(node.name.getStart(sourceFile));
                    const end = document.positionAt(node.name.getEnd());
                    
                    interfaces.push({
                        name: node.name.text,
                        properties,
                        filePath: fileUri.fsPath,
                        location: new vscode.Location(fileUri, new vscode.Range(start, end))
                    });
                }
                
                ts.forEachChild(node, visit);
            };

            visit(sourceFile);
            
            // Update cache (even if empty - this removes stale entries)
            if (interfaces.length > 0) {
                this.interfaceCache.set(fileUri.fsPath, interfaces);
            } else {
                // Remove from cache if no interfaces found
                this.interfaceCache.delete(fileUri.fsPath);
            }
        } catch (error) {
            console.error(`❌ IntelliType: Error processing ${fileUri.fsPath}:`, error);
            // Remove problematic file from cache
            this.interfaceCache.delete(fileUri.fsPath);
        }
    }

    private extractProperties(node: ts.InterfaceDeclaration): PropertySignature[] {
        const properties: PropertySignature[] = [];

        for (const member of node.members) {
            if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
                properties.push({
                    name: member.name.text,
                    type: this.getTypeString(member.type),
                    optional: !!member.questionToken
                });
            }
        }

        return properties;
    }

    private getTypeString(typeNode: ts.TypeNode | undefined): string {
        if (!typeNode) return 'any';

        switch (typeNode.kind) {
            case ts.SyntaxKind.StringKeyword:
                return 'string';
            case ts.SyntaxKind.NumberKeyword:
                return 'number';
            case ts.SyntaxKind.BooleanKeyword:
                return 'boolean';
            case ts.SyntaxKind.AnyKeyword:
                return 'any';
            case ts.SyntaxKind.VoidKeyword:
                return 'void';
            case ts.SyntaxKind.ArrayType:
                const arrayType = typeNode as ts.ArrayTypeNode;
                return `${this.getTypeString(arrayType.elementType)}[]`;
            case ts.SyntaxKind.TypeReference:
                const typeRef = typeNode as ts.TypeReferenceNode;
                return typeRef.typeName.getText();
            case ts.SyntaxKind.TypeLiteral:
                // Handle inline object types like { avatar: string; bio: string; }
                const typeLiteral = typeNode as ts.TypeLiteralNode;
                return this.extractInlineObjectType(typeLiteral);
            default:
                // For complex types, try to get the full text
                const fullText = typeNode.getText();
                console.log(`🔧 Complex type detected: ${fullText}`);
                return fullText || 'any';
        }
    }

    private extractInlineObjectType(typeLiteral: ts.TypeLiteralNode): string {
        const properties: string[] = [];
        
        for (const member of typeLiteral.members) {
            if (ts.isPropertySignature(member) && member.name) {
                const propName = member.name.getText();
                const propType = member.type ? this.getTypeString(member.type) : 'any';
                const optional = member.questionToken ? '?' : '';
                
                properties.push(`${propName}${optional}: ${propType}`);
            }
        }
        
        const result = `{ ${properties.join('; ')} }`;
        console.log(`🏗️ Extracted inline object type: ${result}`);
        return result;
    }

    public async findMatches(objectShape: ObjectShape): Promise<TypeMatch[]> {
        // Ensure initialization is complete
        if (!this.isInitialized) {
            console.log('⏳ IntelliType: Waiting for initialization...');
            await this.initializeAsync();
        }

        const matches: TypeMatch[] = [];

        for (const [filePath, interfaces] of this.interfaceCache) {
            for (const interfaceInfo of interfaces) {
                const { score, nestedMatches } = this.calculateCompatibilityScoreWithNested(objectShape, interfaceInfo);
                
                if (score > 0) {
                    const { missing, extra } = this.compareProperties(objectShape, interfaceInfo);
                    
                    matches.push({
                        typeName: interfaceInfo.name,
                        filePath: interfaceInfo.filePath,
                        location: interfaceInfo.location,
                        compatibilityScore: score,
                        missingProperties: missing,
                        extraProperties: extra,
                        isExactMatch: missing.length === 0 && extra.length === 0,
                        nestedPropertyMatches: nestedMatches
                    });
                }
            }
        }

        // Sort by compatibility score (highest first)
        return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    }

    private calculateCompatibilityScoreWithNested(objectShape: ObjectShape, interfaceInfo: InterfaceInfo): { score: number, nestedMatches: NestedPropertyMatch[] } {
        const objPropMap = new Map(objectShape.properties.map(p => [p.name, p]));
        const intPropMap = new Map(interfaceInfo.properties.map(p => [p.name, p]));

        let totalScore = 0;
        let totalWeight = 0;
        const nestedMatches: NestedPropertyMatch[] = [];

        // Check interface properties against object properties
        for (const [propName, intProp] of intPropMap) {
            totalWeight++;
            const objProp = objPropMap.get(propName);
            
            if (objProp) {
                // Use the new nested-aware compatibility checking
                const compatibility = this.isTypeCompatibleWithNested(objProp, intProp);
                totalScore += compatibility;
                
                // Store nested match information
                const isNested = this.isNestedType(objProp, intProp);
                nestedMatches.push({
                    propertyName: propName,
                    compatibilityScore: compatibility,
                    isNested: isNested
                });
            } else if (!intProp.optional) {
                // Missing required property - no points
                totalScore += 0;
                nestedMatches.push({
                    propertyName: propName,
                    compatibilityScore: 0,
                    isNested: false
                });
            } else {
                // Missing optional property - partial credit
                totalScore += 0.5;
                nestedMatches.push({
                    propertyName: propName,
                    compatibilityScore: 0.5,
                    isNested: false
                });
            }
        }

        // Check for extra properties in object (slight penalty)
        for (const [propName] of objPropMap) {
            if (!intPropMap.has(propName)) {
                totalWeight++; // Penalize extra properties
                totalScore += 0; // No points for extra properties
            }
        }

        const finalScore = totalWeight > 0 ? Math.max(0, Math.min(1, totalScore / totalWeight)) : 0;
        return { score: finalScore, nestedMatches };
    }

    private isNestedType(objProp: PropertySignature, intProp: PropertySignature): boolean {
        // Check if this is a nested type (not a primitive)
        const primitiveTypes = ['string', 'number', 'boolean', 'Date', 'any', 'void'];
        
        // If it's an array, check the element type
        if (intProp.type.endsWith('[]')) {
            const elementType = intProp.type.slice(0, -2);
            return !primitiveTypes.includes(elementType);
        }
        
        // If it's an inline object type
        if (intProp.type.includes('{')) {
            return true;
        }
        
        // If it's not a primitive type, it's likely a nested interface
        return !primitiveTypes.includes(intProp.type);
    }

    private isTypeCompatible(objType: string, intType: string): boolean {
        // Enhanced type compatibility checking
        if (objType === intType) return true;
        if (intType === 'any' || objType === 'any') return true;
        
        // Handle Date objects
        if ((objType === 'Date' || objType.includes('Date')) && intType === 'Date') return true;
        
        // Handle arrays
        if (objType.endsWith('[]') && intType.endsWith('[]')) {
            const objElementType = objType.slice(0, -2);
            const intElementType = intType.slice(0, -2);
            return this.isTypeCompatible(objElementType, intElementType);
        }
        
        // Handle union types (basic support)
        if (intType.includes('|')) {
            const unionTypes = intType.split('|').map(t => t.trim());
            return unionTypes.some(t => this.isTypeCompatible(objType, t));
        }
        
        return false;
    }

    private isTypeCompatibleWithNested(objProp: PropertySignature, intProp: PropertySignature): number {
        console.log(`🔍 Comparing property "${objProp.name}": obj="${objProp.type}" vs int="${intProp.type}"`);
        
        // If types match exactly, return 1.0
        if (this.isTypeCompatible(objProp.type, intProp.type)) {
            console.log(`✅ Exact type match for "${objProp.name}"`);
            return 1.0;
        }
        
        // Handle nested object matching
        if (objProp.type === 'object' && intProp.type !== 'object') {
            console.log(`🔄 Nested object matching for "${objProp.name}": ${intProp.type}`);
            // Object property vs interface type - need to do nested matching
            const score = this.matchNestedObjectType(objProp, intProp);
            console.log(`📊 Nested match score for "${objProp.name}": ${score}`);
            return score;
        }
        
        // If property names match but types don't, give partial credit
        console.log(`⚠️ Partial match for "${objProp.name}": ${objProp.type} vs ${intProp.type}`);
        return 0.3;
    }

    private matchNestedObjectType(objProp: PropertySignature, intProp: PropertySignature): number {
        console.log(`🏗️ matchNestedObjectType: "${objProp.name}" - checking type: "${intProp.type}"`);
        
        // Check if the interface type is a reference to another interface
        const referencedInterface = this.findInterfaceByName(intProp.type);
        if (referencedInterface) {
            console.log(`🔗 Found referenced interface: ${intProp.type}`);
            // Compare the nested object structure against the referenced interface
            if (objProp.nestedProperties) {
                const score = this.calculateNestedCompatibility(objProp.nestedProperties, referencedInterface.properties);
                console.log(`📊 Referenced interface compatibility: ${score}`);
                return score;
            } else {
                console.log(`❌ No nested properties found in object`);
                return 0.1;
            }
        }
        
        // Check if it's an inline object type (contains '{')
        if (intProp.type.includes('{')) {
            console.log(`🔧 Parsing inline object type: ${intProp.type}`);
            const inlineProps = this.parseInlineObjectType(intProp.type);
            console.log(`📋 Parsed ${inlineProps.length} inline properties:`, inlineProps.map(p => `${p.name}:${p.type}`));
            
            if (objProp.nestedProperties && inlineProps.length > 0) {
                const score = this.calculateNestedCompatibility(objProp.nestedProperties, inlineProps);
                console.log(`📊 Inline object compatibility: ${score}`);
                return score;
            } else {
                console.log(`❌ No nested properties or inline props`);
                return 0.1;
            }
        }
        
        // Give some credit for having a nested object even if we can't match it
        console.log(`🤷 Default nested object credit: 0.5`);
        return 0.5;
    }

    private findInterfaceByName(typeName: string): InterfaceInfo | null {
        // Remove any generic type parameters
        const cleanTypeName = typeName.replace(/<.*>/, '');
        
        for (const [filePath, interfaces] of this.interfaceCache) {
            for (const interfaceInfo of interfaces) {
                if (interfaceInfo.name === cleanTypeName) {
                    return interfaceInfo;
                }
            }
        }
        return null;
    }

    private parseInlineObjectType(typeStr: string): PropertySignature[] {
        const properties: PropertySignature[] = [];
        console.log(`🔧 Parsing inline object: "${typeStr}"`);
        
        // Extract content between outermost braces
        const match = typeStr.match(/\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
        if (!match) {
            console.log(`❌ No braces found in: ${typeStr}`);
            return properties;
        }
        
        const content = match[1].trim();
        console.log(`📄 Extracted content: "${content}"`);
        
        // Split by semicolons, but be careful about nested objects
        const parts = this.splitByDelimiter(content, ';');
        
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            
            console.log(`🔎 Processing part: "${trimmed}"`);
            
            // Match property: type pattern
            const propMatch = trimmed.match(/^\s*(\w+)(\??):\s*(.+)$/);
            if (propMatch) {
                const propName = propMatch[1];
                const isOptional = propMatch[2] === '?';
                const propType = propMatch[3].trim();
                
                console.log(`✅ Found property: ${propName}${isOptional ? '?' : ''}: ${propType}`);
                
                properties.push({
                    name: propName,
                    type: propType,
                    optional: isOptional
                });
            } else {
                console.log(`❌ Could not parse property: "${trimmed}"`);
            }
        }
        
        console.log(`📊 Parsed ${properties.length} properties from inline type`);
        return properties;
    }

    private splitByDelimiter(content: string, delimiter: string): string[] {
        const parts: string[] = [];
        let current = '';
        let braceDepth = 0;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            
            if (char === '{') {
                braceDepth++;
            } else if (char === '}') {
                braceDepth--;
            } else if (char === delimiter && braceDepth === 0) {
                parts.push(current);
                current = '';
                continue;
            }
            
            current += char;
        }
        
        if (current.trim()) {
            parts.push(current);
        }
        
        return parts;
    }

    private calculateNestedCompatibility(objProps: PropertySignature[], intProps: PropertySignature[]): number {
        console.log(`🧮 calculateNestedCompatibility: ${objProps.length} obj props vs ${intProps.length} int props`);
        console.log(`📋 Object properties: ${objProps.map(p => p.name).join(', ')}`);
        console.log(`📋 Interface properties: ${intProps.map(p => p.name).join(', ')}`);
        
        if (objProps.length === 0 && intProps.length === 0) return 1.0;
        if (objProps.length === 0 || intProps.length === 0) {
            console.log(`❌ One side is empty - returning 0`);
            return 0.0;
        }
        
        const objPropMap = new Map(objProps.map(p => [p.name, p]));
        const intPropMap = new Map(intProps.map(p => [p.name, p]));
        
        let totalScore = 0;
        let totalWeight = 0;
        
        // Check interface properties against object properties
        for (const [propName, intProp] of intPropMap) {
            totalWeight++;
            const objProp = objPropMap.get(propName);
            
            console.log(`🔍 Checking interface property "${propName}" (${intProp.optional ? 'optional' : 'required'})`);
            
            if (objProp) {
                const compatibility = this.isTypeCompatibleWithNested(objProp, intProp);
                totalScore += compatibility;
                console.log(`✅ Found matching property "${propName}": score = ${compatibility}`);
            } else if (!intProp.optional) {
                // Missing required property
                totalScore += 0;
                console.log(`❌ Missing required property "${propName}": score = 0`);
            } else {
                // Missing optional property - neutral
                totalScore += 0.5;
                console.log(`⚠️ Missing optional property "${propName}": score = 0.5`);
            }
        }
        
        // Penalize extra properties
        const extraProps = objProps.length - intProps.length;
        if (extraProps > 0) {
            totalWeight += extraProps;
            console.log(`⚠️ ${extraProps} extra properties - adding to weight`);
            // Don't add to totalScore for extra properties
        }
        
        const finalScore = totalWeight > 0 ? Math.max(0, Math.min(1, totalScore / totalWeight)) : 0;
        console.log(`📊 Final nested compatibility: ${totalScore}/${totalWeight} = ${finalScore}`);
        return finalScore;
    }

    private compareProperties(objectShape: ObjectShape, interfaceInfo: InterfaceInfo): { missing: string[], extra: string[] } {
        const objectPropNames = new Set(objectShape.properties.map(p => p.name));
        const interfacePropNames = new Set(interfaceInfo.properties.filter(p => !p.optional).map(p => p.name));

        const missing = Array.from(interfacePropNames).filter(name => !objectPropNames.has(name));
        const extra = Array.from(objectPropNames).filter(name => 
            !Array.from(interfaceInfo.properties).some(p => p.name === name)
        );

        return { missing, extra };
    }

    public async refreshCache(): Promise<void> {
        console.log('🔄 IntelliType: Manual refresh requested');
        this.interfaceCache.clear();
        this.isInitialized = false;
        this.initializationPromise = undefined;
        await this.initializeAsync();
    }

    private getRelativePath(fromFile: string, toFile: string): string {
        const path = require('path');
        
        // Get the directory of the current file
        const currentDir = path.dirname(toFile);
        
        // Get relative path from current file to target file
        const relativePath = path.relative(currentDir, fromFile);
        
        // Remove the .ts extension
        const withoutExtension = relativePath.replace(/\.ts$/, '');
        
        // Convert backslashes to forward slashes for ES module imports
        const normalizedPath = withoutExtension.replace(/\\/g, '/');
        
        // Ensure it starts with ./ or ../
        if (!normalizedPath.startsWith('.')) {
            return `./${normalizedPath}`;
        }
        
        return normalizedPath;
    }

    private parseInterfaceProperties(body: string): PropertySignature[] {
        const properties: PropertySignature[] = [];
        const lines = body.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
                // Handle optional properties with ?
                const propMatch = trimmed.match(/(\w+)(\??):\s*([^;,]+)/);
                if (propMatch) {
                    properties.push({
                        name: propMatch[1],
                        type: propMatch[3].trim().replace(/[;,]$/, ''),
                        optional: propMatch[2] === '?'
                    });
                }
            }
        }

        return properties;
    }

    private calculateCompatibilityScore(objectShape: ObjectShape, interfaceInfo: InterfaceInfo): number {
        const { score } = this.calculateCompatibilityScoreWithNested(objectShape, interfaceInfo);
        return score;
    }

    public dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
        }
    }
} 