import * as vscode from 'vscode';
import * as ts from 'typescript';
import { ObjectShape, TypeMatch, PropertySignature } from '../types';
import * as path from 'path';

interface InterfaceInfo {
    name: string;
    properties: PropertySignature[];
    filePath: string;
    location: vscode.Location;
}

export class TypeMatcher {
    private interfaceCache: Map<string, InterfaceInfo[]> = new Map();

    constructor() {
        this.scanWorkspaceForTypes();
    }

    private async scanWorkspaceForTypes() {
        const tsFiles = await vscode.workspace.findFiles('**/*.{ts,tsx}', '**/node_modules/**');
        
        for (const file of tsFiles) {
            await this.extractInterfacesFromFile(file);
        }
    }

    private async extractInterfacesFromFile(fileUri: vscode.Uri) {
        try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            const sourceFile = ts.createSourceFile(
                fileUri.fsPath,
                document.getText(),
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
            
            if (interfaces.length > 0) {
                this.interfaceCache.set(fileUri.fsPath, interfaces);
            }
        } catch (error) {
            console.error(`Error extracting interfaces from ${fileUri.fsPath}:`, error);
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

    public findMatches(objectShape: ObjectShape): TypeMatch[] {
        const matches: TypeMatch[] = [];

        for (const [filePath, interfaces] of this.interfaceCache) {
            for (const interfaceInfo of interfaces) {
                const score = this.calculateCompatibilityScore(objectShape, interfaceInfo);
                
                if (score > 0) {
                    const { missing, extra } = this.compareProperties(objectShape, interfaceInfo);
                    
                    matches.push({
                        typeName: interfaceInfo.name,
                        filePath: interfaceInfo.filePath,
                        location: interfaceInfo.location,
                        compatibilityScore: score,
                        missingProperties: missing,
                        extraProperties: extra,
                        isExactMatch: missing.length === 0 && extra.length === 0
                    });
                }
            }
        }

        // Sort by compatibility score (highest first)
        return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    }

    private calculateCompatibilityScore(objectShape: ObjectShape, interfaceInfo: InterfaceInfo): number {
        const objPropMap = new Map(objectShape.properties.map(p => [p.name, p]));
        const intPropMap = new Map(interfaceInfo.properties.map(p => [p.name, p]));

        let totalScore = 0;
        let totalWeight = 0;

        // Check interface properties against object properties
        for (const [propName, intProp] of intPropMap) {
            totalWeight++;
            const objProp = objPropMap.get(propName);
            
            if (objProp) {
                // Use the new nested-aware compatibility checking
                const compatibility = this.isTypeCompatibleWithNested(objProp, intProp);
                totalScore += compatibility;
            } else if (!intProp.optional) {
                // Missing required property - no points
                totalScore += 0;
            } else {
                // Missing optional property - partial credit
                totalScore += 0.5;
            }
        }

        // Check for extra properties in object (slight penalty)
        for (const [propName] of objPropMap) {
            if (!intPropMap.has(propName)) {
                totalWeight++; // Penalize extra properties
                totalScore += 0; // No points for extra properties
            }
        }

        return totalWeight > 0 ? Math.max(0, Math.min(1, totalScore / totalWeight)) : 0;
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

    public async refreshCache() {
        this.interfaceCache.clear();
        await this.scanWorkspaceForTypes();
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
} 