import * as vscode from 'vscode';
import { TypeAnalyzer } from '../analyzers/TypeAnalyzer';
import { UntypedObject } from '../types';

export class DecorationManager {
    private typeAnalyzer: TypeAnalyzer;
    private disposables: vscode.Disposable[] = [];
    private decorationType: vscode.TextEditorDecorationType;

    constructor(context: vscode.ExtensionContext, typeAnalyzer: TypeAnalyzer) {
        this.typeAnalyzer = typeAnalyzer;
        
        // Create the decoration type for squiggly lines
        this.decorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline wavy #4FC3F7'
        });
        
        context.subscriptions.push(this.decorationType);
    }

    public activate() {
        // Listen to document changes
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (this.isTypeScriptDocument(event.document)) {
                    this.updateDecorations(event.document);
                }
            })
        );

        // Listen to document open
        this.disposables.push(
            vscode.workspace.onDidOpenTextDocument((document) => {
                if (this.isTypeScriptDocument(document)) {
                    this.updateDecorations(document);
                }
            })
        );

        // Listen to document save
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((document) => {
                if (this.isTypeScriptDocument(document)) {
                    this.updateDecorations(document);
                }
            })
        );

        // Listen to active editor changes
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor && this.isTypeScriptDocument(editor.document)) {
                    this.updateDecorations(editor.document);
                }
            })
        );

        // Update decorations for all open TypeScript documents
        vscode.window.visibleTextEditors.forEach((editor) => {
            if (this.isTypeScriptDocument(editor.document)) {
                this.updateDecorations(editor.document);
            }
        });
    }

    private async updateDecorations(document: vscode.TextDocument) {
        console.log('🎨 IntelliType: Updating decorations for:', document.fileName);
        
        const config = vscode.workspace.getConfiguration('intellitype');
        
        if (!config.get('enabled') || !config.get('showDiagnostics')) {
            console.log('❌ IntelliType: Extension disabled or diagnostics disabled');
            this.clearDecorations(document);
            return;
        }

        try {
            const untypedObjects = await this.typeAnalyzer.findUntypedObjects(document);
            console.log(`🎯 IntelliType: Found ${untypedObjects.length} untyped objects`);
            
            const decorations: vscode.DecorationOptions[] = [];

            for (const untypedObject of untypedObjects) {
                const decoration = this.createDecoration(untypedObject);
                if (decoration) {
                    decorations.push(decoration);
                    console.log(`🎨 IntelliType: Created decoration for '${untypedObject.name}'`);
                }
            }

            // Apply decorations to all editors showing this document
            vscode.window.visibleTextEditors.forEach(editor => {
                if (editor.document.uri.toString() === document.uri.toString()) {
                    editor.setDecorations(this.decorationType, decorations);
                }
            });
            
            console.log(`✅ IntelliType: Applied ${decorations.length} decorations`);
        } catch (error) {
            console.error('❌ IntelliType: Error updating decorations:', error);
        }
    }

    private createDecoration(untypedObject: UntypedObject): vscode.DecorationOptions | null {
        const range = untypedObject.location.range;
        
        const decoration: vscode.DecorationOptions = {
            range: range
        };

        return decoration;
    }

    private clearDecorations(document: vscode.TextDocument) {
        vscode.window.visibleTextEditors.forEach(editor => {
            if (editor.document.uri.toString() === document.uri.toString()) {
                editor.setDecorations(this.decorationType, []);
            }
        });
    }

    private isTypeScriptDocument(document: vscode.TextDocument): boolean {
        return document.languageId === 'typescript' || document.languageId === 'typescriptreact';
    }

    public refresh() {
        // Refresh decorations for all open documents
        vscode.window.visibleTextEditors.forEach((editor) => {
            if (this.isTypeScriptDocument(editor.document)) {
                this.updateDecorations(editor.document);
            }
        });
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
        this.decorationType.dispose();
    }
} 