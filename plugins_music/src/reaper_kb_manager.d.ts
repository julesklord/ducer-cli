/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ReaperAction {
    id: string;
    name: string;
    type: 'ACT' | 'SCR';
}
export interface ScriptEntry {
    filename: string;
    path: string;
    description: string;
}
export declare class ReaperKBManager {
    private static readonly KB_DIR;
    private static readonly SCRIPTS_DIR;
    private static readonly KEYMAP_PATH;
    /**
     * Initializes the Reaper Knowledge Base by parsing the static KeyMap
     * and indexing the local scripts library.
     */
    initialize(): Promise<void>;
    private indexActions;
    private categorizeAction;
    private indexScripts;
    /**
     * Search for an action by name in the indexed database
     */
    searchActions(query: string, category?: string): ReaperAction[];
}
