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
            default:
                return 'any';
        }
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
        const objectProps = new Map(objectShape.properties.map(p => [p.name, p]));
        const interfaceProps = new Map(interfaceInfo.properties.map(p => [p.name, p]));

        let matchCount = 0;
        let totalProps = Math.max(objectProps.size, interfaceProps.size);

        if (totalProps === 0) return 0;

        for (const [propName, objProp] of objectProps) {
            const intProp = interfaceProps.get(propName);
            if (intProp && this.isTypeCompatible(objProp.type, intProp.type)) {
                matchCount++;
            }
        }

        return matchCount / totalProps;
    }

    private isTypeCompatible(objType: string, intType: string): boolean {
        // Simple type compatibility check
        if (objType === intType) return true;
        if (intType === 'any') return true;
        if (objType === 'any') return true;
        
        // Handle Date objects
        if (objType === 'Date' && intType === 'Date') return true;
        
        // Handle arrays (simplified)
        if (objType.endsWith('[]') && intType.endsWith('[]')) return true;
        
        return false;
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
} 