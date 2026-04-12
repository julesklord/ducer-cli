/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { DawBridge } from './bridge_interface.js';
export interface DucerConfig {
    getGeminiClient: () => unknown;
    getSessionId: () => string;
}
/**
 * DucerCore: The "Producer Brain" of the system.
 * Encapsulates all domain logic to provide a portable, complex identity.
 */
export declare class DucerCore {
    private mediaHandler;
    private audioAnalyzer;
    private toolsManager;
    private bridge;
    private readonly actionsDbPath;
    constructor(bridge: DawBridge);
    /**
     * Generates a modular system prompt based on required context.
     */
    private getSystemPrompt;
    /**
     * Main entry point for any "insight" request (natural language query).
     */
    getInsight(query: string, context: string, config: DucerConfig, mode?: 'command' | 'advanced' | 'lite'): Promise<string>;
    /**
     * Dispatches music-specific tool calls.
     */
    private dispatchTool;
    private isInRegistry;
    private semanticSearchFallback;
    private performAdvancedSearch;
    private resolveActionId;
    private learnMacro;
    /**
     * Performs an initial expert audit of an audio file.
     */
    analyzeFile(filePath: string, mode: 'standard' | 'advanced' | 'lite', config: DucerConfig): Promise<string>;
    private getMimeType;
}
