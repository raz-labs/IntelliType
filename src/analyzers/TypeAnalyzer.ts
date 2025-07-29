import * as vscode from 'vscode';
import * as ts from 'typescript';
import { ObjectShape, PropertySignature, UntypedObject, TypeMatch } from '../types';
import { TypeMatcher } from './TypeMatcher';

export class TypeAnalyzer {
    private program: ts.Program | undefined;
    private typeChecker: ts.TypeChecker | undefined;
    private sourceFiles: Map<string, { sourceFile: ts.SourceFile; version: number }> = new Map();
    private typeMatcher: TypeMatcher;

    constructor() {
        this.initializeTypeScript();
        this.typeMatcher = new TypeMatcher();
        
        // No longer need aggressive file save refresh - file watcher handles this automatically
        // Old approach was causing the performance issues you noticed!
    }

    private initializeTypeScript() {
        // Initialize TypeScript compiler when workspace is available
        if (vscode.workspace.workspaceFolders) {
            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const configPath = ts.findConfigFile(rootPath, ts.sys.fileExists, 'tsconfig.json');
            
            if (configPath) {
                const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
                const parsedConfig = ts.parseJsonConfigFileContent(
                    configFile.config,
                    ts.sys,
                    rootPath
                );
                
                this.program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
                this.typeChecker = this.program.getTypeChecker();
            }
        }
    }

    public async findUntypedObjects(document: vscode.TextDocument): Promise<UntypedObject[]> {
        console.log('🔎 TypeAnalyzer: Analyzing document language:', document.languageId);
        
        if (document.languageId !== 'typescript' && document.languageId !== 'typescriptreact') {
            console.log('❌ TypeAnalyzer: Not a TypeScript file');
            return [];
        }

        // Ultra-fast pre-filtering using indexOf (fastest string search)
        const text = document.getText();
        if (text.length === 0 || text.length > 30000) return []; // Even smaller threshold
        
        // Lightning-fast checks using indexOf
        const hasConst = text.indexOf('const ') !== -1;
        const hasLet = text.indexOf('let ') !== -1;
        const hasVar = text.indexOf('var ') !== -1;
        const hasObjectLiteral = text.indexOf('{') !== -1 && text.indexOf('}') !== -1;
        
        if ((!hasConst && !hasLet && !hasVar) || !hasObjectLiteral) {
            return [];
        }

        const untypedObjects: UntypedObject[] = [];
        const sourceFile = this.getOrCreateSourceFile(document);
        
        if (!sourceFile) {
            console.log('❌ TypeAnalyzer: Could not create source file');
            return [];
        }
        
        console.log('✅ TypeAnalyzer: Source file created, starting AST traversal');

        const visit = (node: ts.Node) => {
            // Look for variable declarations without explicit types
            if (ts.isVariableDeclaration(node)) {
                if (!node.type && node.initializer) {
                    // Check if the initializer is an object literal
                    if (ts.isObjectLiteralExpression(node.initializer)) {
                        const objectShape = this.analyzeObjectLiteral(node.initializer, sourceFile);
                        if (objectShape && node.name && ts.isIdentifier(node.name)) {
                            const start = document.positionAt(node.name.getStart(sourceFile));
                            const end = document.positionAt(node.name.getEnd());
                            const location = new vscode.Location(document.uri, new vscode.Range(start, end));
                            
                            untypedObjects.push({
                                name: node.name.text,
                                shape: objectShape,
                                location,
                                document
                            });
                        }
                    }
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return untypedObjects;
    }

    private analyzeObjectLiteral(node: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): ObjectShape | null {
        const properties: PropertySignature[] = [];
        
        for (const prop of node.properties) {
            if (ts.isPropertyAssignment(prop) && prop.name) {
                const propName = prop.name.getText(sourceFile);
                const propType = this.inferType(prop.initializer);
                
                let nestedProperties: PropertySignature[] | undefined;
                
                // If this is a nested object, analyze its structure
                if (ts.isObjectLiteralExpression(prop.initializer)) {
                    nestedProperties = this.extractNestedProperties(prop.initializer, sourceFile);
                }
                
                properties.push({
                    name: propName,
                    type: propType,
                    optional: false,
                    nestedProperties
                });
            }
        }

        if (properties.length === 0) {
            return null;
        }

        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        
        return {
            properties,
            methods: [], // For MVP, we'll focus on properties only
            location: new vscode.Location(
                vscode.Uri.file(sourceFile.fileName),
                new vscode.Range(
                    new vscode.Position(start.line, start.character),
                    new vscode.Position(end.line, end.character)
                )
            ),
            variableName: ''
        };
    }

    private extractNestedProperties(node: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): PropertySignature[] {
        const properties: PropertySignature[] = [];
        
        for (const prop of node.properties) {
            if (ts.isPropertyAssignment(prop) && prop.name) {
                const propName = prop.name.getText(sourceFile);
                const propType = this.inferType(prop.initializer);
                
                let nestedProperties: PropertySignature[] | undefined;
                
                // Recursively analyze nested objects
                if (ts.isObjectLiteralExpression(prop.initializer)) {
                    nestedProperties = this.extractNestedProperties(prop.initializer, sourceFile);
                }
                
                properties.push({
                    name: propName,
                    type: propType,
                    optional: false,
                    nestedProperties
                });
            }
        }
        
        return properties;
    }

    private inferType(node: ts.Node): string {
        if (ts.isStringLiteral(node)) {
            return 'string';
        } else if (ts.isNumericLiteral(node)) {
            return 'number';
        } else if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
            return 'boolean';
        } else if (ts.isArrayLiteralExpression(node)) {
            return 'any[]';
        } else if (ts.isObjectLiteralExpression(node)) {
            return 'object';
        } else if (node.kind === ts.SyntaxKind.NullKeyword) {
            return 'null';
        } else if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
            return 'undefined';
        } else if (ts.isNewExpression(node) && node.expression) {
            return node.expression.getText();
        }
        
        return 'any';
    }

    public async findMatchingTypes(objectShape: ObjectShape): Promise<TypeMatch[]> {
        return await this.typeMatcher.findMatches(objectShape);
    }

    private getOrCreateSourceFile(document: vscode.TextDocument): ts.SourceFile | undefined {
        const fileName = document.uri.fsPath;
        const cached = this.sourceFiles.get(fileName);
        
        if (!cached || cached.version !== document.version) {
            const sourceFile = ts.createSourceFile(
                fileName,
                document.getText(),
                ts.ScriptTarget.Latest,
                true
            );
            this.sourceFiles.set(fileName, { sourceFile, version: document.version });
            return sourceFile;
        }
        
        return cached.sourceFile;
    }

    public dispose() {
        this.sourceFiles.clear();
        this.program = undefined;
        this.typeChecker = undefined;
        this.typeMatcher.dispose(); // Make sure to dispose the TypeMatcher too
    }
} 