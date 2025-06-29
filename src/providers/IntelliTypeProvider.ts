import * as vscode from 'vscode';
import { TypeAnalyzer } from '../analyzers/TypeAnalyzer';
import { UntypedObject, TypeMatch } from '../types';
import * as path from 'path';

export class IntelliTypeProvider implements vscode.HoverProvider {
    private typeAnalyzer: TypeAnalyzer;
    private disposables: vscode.Disposable[] = [];

    constructor(private context: vscode.ExtensionContext, typeAnalyzer: TypeAnalyzer) {
        this.typeAnalyzer = typeAnalyzer;
    }

    public activate() {
        // Register commands
        this.disposables.push(
            vscode.commands.registerCommand('intellitype.showCompatibleTypes', 
                this.showCompatibleTypes.bind(this))
        );
        
        this.disposables.push(
            vscode.commands.registerCommand('intellitype.applyType', 
                this.applyTypeCommand.bind(this))
        );

        // Register hover provider only
        this.disposables.push(
            vscode.languages.registerHoverProvider(
                [{ language: 'typescript' }, { language: 'typescriptreact' }],
                this
            )
        );

        this.context.subscriptions.push(...this.disposables);
        console.log('✅ IntelliType: Commands and hover provider registered');
    }

    private async showCompatibleTypes(documentUri: string, line: number, character: number) {
        console.log('🎯 IntelliType: showCompatibleTypes called for position:', line, character);
        
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri));
        const position = new vscode.Position(line, character);
        
        // Find the untyped object at this position
        const untypedObjects = await this.typeAnalyzer.findUntypedObjects(doc);
        const untypedObject = untypedObjects.find(obj => obj.location.range.contains(position));
        
        if (!untypedObject) {
            console.log('❌ IntelliType: No untyped object found at position');
            vscode.window.showWarningMessage('No untyped object found at this position');
            return;
        }
        
        console.log('✅ IntelliType: Found untyped object:', untypedObject.name);
        
        const matches = await this.typeAnalyzer.findMatchingTypes(untypedObject.shape);
        console.log(`🔍 IntelliType: Found ${matches.length} matches`);
        
        if (matches.length === 0) {
            vscode.window.showInformationMessage(
                `No matching types found for object '${untypedObject.name}'. Consider creating a new interface.`
            );
            return;
        }

        // Sort matches: primary key = score (desc), secondary key = path distance (asc)
        matches.sort((a, b) => {
            if (a.compatibilityScore !== b.compatibilityScore) {
                return b.compatibilityScore - a.compatibilityScore;
            }
            const distanceA = this.calculatePathDistance(a.filePath, doc.uri.fsPath);
            const distanceB = this.calculatePathDistance(b.filePath, doc.uri.fsPath);
            return distanceA - distanceB;
        });

        // For MVP, show a simple quick pick
        const items = matches.map(match => ({
            label: match.typeName,
            description: `${Math.round(match.compatibilityScore * 100)}% match`,
            detail: `From ${match.filePath}`,
            match: match
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Select a type for '${untypedObject.name}'`
        });

        if (selected) {
            await this.applyType(untypedObject, selected.match, doc);
        }
    }

    private async applyTypeCommand(documentUri: string, line: number, character: number, typeName: string) {
        console.log('🎯 IntelliType: applyTypeCommand called for:', typeName);
        
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri));
        const position = new vscode.Position(line, character);
        
        // Find the untyped object at this position
        const untypedObjects = await this.typeAnalyzer.findUntypedObjects(doc);
        const untypedObject = untypedObjects.find(obj => obj.location.range.contains(position));
        
        if (!untypedObject) {
            console.log('❌ IntelliType: No untyped object found at position');
            vscode.window.showWarningMessage('No untyped object found at this position');
            return;
        }
        
        // Find the matching type
        const matches = await this.typeAnalyzer.findMatchingTypes(untypedObject.shape);
        let allMatches = [...matches];
        
        // Sort matches: primary key = score (desc), secondary key = path distance (asc)
        allMatches.sort((a, b) => {
            if (a.compatibilityScore !== b.compatibilityScore) {
                return b.compatibilityScore - a.compatibilityScore;
            }
            const distanceA = this.calculatePathDistance(a.filePath, doc.uri.fsPath);
            const distanceB = this.calculatePathDistance(b.filePath, doc.uri.fsPath);
            return distanceA - distanceB;
        });
        
        const selectedMatch = allMatches.find(match => match.typeName === typeName);
        if (selectedMatch) {
            await this.applyType(untypedObject, selectedMatch, doc);
        } else {
            vscode.window.showErrorMessage(`Type '${typeName}' not found`);
        }
    }

    private async applyType(
        untypedObject: UntypedObject,
        typeMatch: TypeMatch,
        document: vscode.TextDocument
    ) {
        const edit = new vscode.WorkspaceEdit();
        
        // Add the type annotation
        const position = untypedObject.location.range.end;
        edit.insert(document.uri, position, `: ${typeMatch.typeName}`);

        // Smart import logic
        const needsImport = this.shouldAddImport(typeMatch, document);
        if (needsImport) {
            const importStatement = this.createImportStatement(typeMatch, document);
            if (importStatement) {
                edit.insert(document.uri, importStatement.position, importStatement.text);
            }
        }

        await vscode.workspace.applyEdit(edit);
        
        vscode.window.showInformationMessage(
            `Applied type '${typeMatch.typeName}' to '${untypedObject.name}'`
        );
    }

    // Hover Provider implementation
    public async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | null> {
        const config = vscode.workspace.getConfiguration('intellitype');
        
        if (!config.get('enabled')) {
            return null;
        }

        // Get untyped objects for this document
        const untypedObjects = await this.typeAnalyzer.findUntypedObjects(document);
        
        // Check if the position is within any untyped object
        const untypedObject = untypedObjects.find(obj =>
            obj.location.range.contains(position)
        );

        if (!untypedObject) {
            return null;
        }

        const markdown = new vscode.MarkdownString('', true);
        markdown.isTrusted = true;
        markdown.supportThemeIcons = true;
        
        // Get compatible types
        const matches = await this.typeAnalyzer.findMatchingTypes(untypedObject.shape);
        
        // Remove mock matching - always use real TypeMatcher
        const allMatches = [...matches];
        
        // Sort matches: primary key = score (desc), secondary key = path distance (asc)
        allMatches.sort((a, b) => {
            if (a.compatibilityScore !== b.compatibilityScore) {
                return b.compatibilityScore - a.compatibilityScore;
            }
            const distanceA = this.calculatePathDistance(a.filePath, document.uri.fsPath);
            const distanceB = this.calculatePathDistance(b.filePath, document.uri.fsPath);
            return distanceA - distanceB;
        });
        
        const maxSuggestions = config.get<number>('maxSuggestions', 5);
        const topMatches = allMatches.slice(0, maxSuggestions);
        
        markdown.appendMarkdown(`### IntelliType\n`);
        markdown.appendMarkdown(`The following types are compatible with **${untypedObject.name}**:\n`);
        
        if (topMatches.length > 0) {
            for (const match of topMatches) {
                const percentage = Math.round(match.compatibilityScore * 100);
                const fileInfo = this.getFileDisplayInfo(match, document);
                
                const commandArgs = JSON.stringify([
                    document.uri.toString(), 
                    position.line, 
                    position.character,
                    match.typeName
                ]);
                const commandUri = vscode.Uri.parse(`command:intellitype.applyType?${commandArgs}`);
                
                const hoverTitle = `Click to apply type '${match.typeName}'`;

                markdown.appendMarkdown(`\n---\n`);
                markdown.appendMarkdown(`[**${match.typeName}**](${commandUri} "${hoverTitle}") _(${percentage}% match)_ [${fileInfo}]\n`);
                
                const typeStructure = await this.getTypeStructure(match);
                if (typeStructure) {
                    markdown.appendCodeblock(typeStructure, 'typescript');
                }
            }
            // Add a final, more distinct separator at the end
            markdown.appendMarkdown(`\n---\n---\n`);
        } else {
            markdown.appendMarkdown(`Object **${untypedObject.name}** can benefit from explicit typing.\n\n`);
            markdown.appendMarkdown('**Properties detected:**\n');
            
            for (const prop of untypedObject.shape.properties) {
                markdown.appendMarkdown(`• \`${prop.name}: ${prop.type}\`\n`);
            }
            
            markdown.appendMarkdown('\n_No matching types found. Consider creating a new interface._');
        }

        return new vscode.Hover(markdown, untypedObject.location.range);
    }

    private shouldAddImport(typeMatch: TypeMatch, document: vscode.TextDocument): boolean {
        // Don't import if the type is in the same file
        const normalizedTypeMatchPath = typeMatch.filePath.replace(/\\/g, '/');
        const normalizedDocPath = document.fileName.replace(/\\/g, '/');
        
        if (normalizedTypeMatchPath === normalizedDocPath || 
            normalizedDocPath.endsWith(normalizedTypeMatchPath)) {
            return false;
        }
        
        // Don't import if already imported
        const text = document.getText();
        const importRegex = new RegExp(`import\\s*{[^}]*\\b${typeMatch.typeName}\\b[^}]*}\\s*from`, 'g');
        if (importRegex.test(text)) {
            return false;
        }
        
        // Don't import if the type is defined in the same file
        const typeDefRegex = new RegExp(`\\b(interface|type|class)\\s+${typeMatch.typeName}\\b`, 'g');
        if (typeDefRegex.test(text)) {
            return false;
        }
        
        return true;
    }

    private createImportStatement(typeMatch: TypeMatch, document: vscode.TextDocument): { position: vscode.Position, text: string } | null {
        const text = document.getText();
        const lines = text.split('\n');
        
        // Find the best position for the import
        let insertLine = 0;
        let hasImports = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('import ') || line.startsWith('export ')) {
                hasImports = true;
                insertLine = i + 1;
            } else if (hasImports && line !== '' && !line.startsWith('//')) {
                // We've found the first non-import, non-empty, non-comment line
                break;
            } else if (!hasImports && line !== '' && !line.startsWith('//')) {
                // No imports found, insert at the top
                insertLine = i;
                break;
            }
        }
        
        // Generate relative path
        const relativePath = this.getRelativePath(typeMatch.filePath, document.fileName);
        
        // Create import statement
        let importText = `import { ${typeMatch.typeName} } from '${relativePath}';\n`;
        
        // Add empty line after imports if needed
        if (!hasImports && insertLine < lines.length && lines[insertLine]?.trim() !== '') {
            importText += '\n';
        }
        
        return {
            position: new vscode.Position(insertLine, 0),
            text: importText
        };
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

    private calculatePathDistance(matchPath: string, currentPath: string): number {
        const path = require('path');
        const normMatchPath = path.normalize(matchPath);
        const normCurrentPath = path.normalize(currentPath);

        if (normMatchPath === normCurrentPath) {
            return 0; // Same file
        }

        const matchDir = path.dirname(normMatchPath);
        const currentDir = path.dirname(normCurrentPath);

        if (matchDir === currentDir) {
            return 1; // Same folder
        }
        
        const relative = path.relative(currentDir, matchDir);
        const parts = relative.split(path.sep);
        
        // Higher distance for more complex paths
        return parts.length + 2;
    }

    private getFileDisplayInfo(match: TypeMatch, currentDocument: vscode.TextDocument | null): string {
        const path = require('path');
        
        if (currentDocument) {
            const currentDocPath = path.normalize(currentDocument.uri.fsPath).toLowerCase();
            const matchPath = path.normalize(match.filePath).toLowerCase();

            if (currentDocPath === matchPath) {
                return 'current file';
            }
        }
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        let displayPath = path.normalize(match.filePath);

        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = path.normalize(workspaceFolders[0].uri.fsPath);
            const normalizedDisplayPath = displayPath.toLowerCase();
            if (normalizedDisplayPath.startsWith(workspaceRoot.toLowerCase())) {
                displayPath = path.relative(workspaceRoot, displayPath);
            }
        }
        
        const pathParts = displayPath.split(path.sep);

        if (pathParts.length > 2) {
            return `...${path.sep}${pathParts.slice(-2).join(path.sep)}`;
        }
        
        return displayPath;
    }

    private formatTypeHoverInfo(match: TypeMatch, typeStructure: string | null): string {
        if (typeStructure) {
            return `${match.typeName}\n\n${typeStructure}\n\nFile: ${this.getFileDisplayInfo(match, null)}`;
        }
        
        // Fallback to simple info
        return `${match.typeName}\n\nFile: ${this.getFileDisplayInfo(match, null)}`;
    }

    private async getTypeStructure(match: TypeMatch): Promise<string | null> {
        console.log(`[IntelliType] Attempting to get structure for '${match.typeName}' from '${match.filePath}'`);
        try {
            const fileUri = vscode.Uri.file(match.filePath);
            const document = await vscode.workspace.openTextDocument(fileUri);
            const text = document.getText();

            const regex = new RegExp(`(export |declare )?(interface|type)\\s+${match.typeName}\\s*.*?{`, 's');
            const matchResult = regex.exec(text);

            if (!matchResult) {
                console.log(`[IntelliType] Regex failed to find start of '${match.typeName}'.`);
                return null;
            }

            const startIndex = matchResult.index;
            console.log(`[IntelliType] Found start at index ${startIndex}.`);
            const bodyStartIndex = text.indexOf('{', startIndex);

            if (bodyStartIndex === -1) {
                console.log(`[IntelliType] Could not find opening brace '{'.`);
                return null;
            }

            let braceCount = 1;
            let endIndex = -1;

            for (let i = bodyStartIndex + 1; i < text.length; i++) {
                if (text[i] === '{') {
                    braceCount++;
                } else if (text[i] === '}') {
                    braceCount--;
                }
                if (braceCount === 0) {
                    endIndex = i + 1;
                    break;
                }
            }

            if (endIndex === -1) {
                console.log(`[IntelliType] Failed to find matching closing brace '}'.`);
                return null;
            }
            
            const structure = text.substring(startIndex, endIndex);
            console.log(`[IntelliType] Extracted structure: \n${structure}`);
            return structure;

        } catch (error) {
            console.error(`[IntelliType] Error in getTypeStructure for ${match.typeName}:`, error);
            return null;
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
    }
} 