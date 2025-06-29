import * as vscode from 'vscode';

export interface ObjectShape {
    properties: PropertySignature[];
    methods: MethodSignature[];
    location: vscode.Location;
    variableName: string;
}

export interface PropertySignature {
    name: string;
    type: string;
    optional: boolean;
    value?: any;
}

export interface MethodSignature {
    name: string;
    returnType: string;
    parameters: ParameterSignature[];
}

export interface ParameterSignature {
    name: string;
    type: string;
    optional: boolean;
}

export interface TypeMatch {
    typeName: string;
    filePath: string;
    location: vscode.Location;
    compatibilityScore: number;
    missingProperties: string[];
    extraProperties: string[];
    isExactMatch: boolean;
}

export interface UntypedObject {
    name: string;
    shape: ObjectShape;
    location: vscode.Location;
    document: vscode.TextDocument;
}

export interface IntelliTypeConfig {
    enabled: boolean;
    showDiagnostics: boolean;
    minimumCompatibilityScore: number;
    maxSuggestions: number;
    includeNodeModules: boolean;
} 