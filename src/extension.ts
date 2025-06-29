import * as vscode from 'vscode';
import { IntelliTypeProvider } from './providers/IntelliTypeProvider';
import { TypeAnalyzer } from './analyzers/TypeAnalyzer';
import { DecorationManager } from './decorations/DecorationManager';

let decorationManager: DecorationManager | undefined;
let intelliTypeProvider: IntelliTypeProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 IntelliType extension is now active!');
    
    try {
        // Initialize the type analyzer
        const typeAnalyzer = new TypeAnalyzer();

        // Initialize the decoration manager
        decorationManager = new DecorationManager(context, typeAnalyzer);

        // Initialize the IntelliType provider
        intelliTypeProvider = new IntelliTypeProvider(context, typeAnalyzer);

        // Register providers
        decorationManager.activate();
        intelliTypeProvider.activate();
        
        console.log('✅ IntelliType providers registered successfully');

        // Register configuration change listener
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('intellitype')) {
                    decorationManager?.refresh();
                }
            })
        );

        // Show welcome message
        const config = vscode.workspace.getConfiguration('intellitype');
        if (config.get('enabled')) {
            vscode.window.showInformationMessage('IntelliType is ready to help you discover types!');
        }
    } catch (error) {
        console.error('❌ Failed to activate IntelliType:', error);
        vscode.window.showErrorMessage(`IntelliType failed to activate: ${error}`);
    }
}

export function deactivate() {
    decorationManager?.dispose();
    intelliTypeProvider?.dispose();
    console.log('IntelliType extension has been deactivated');
} 