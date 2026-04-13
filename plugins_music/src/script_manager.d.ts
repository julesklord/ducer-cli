/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * ScriptManager: Handles on-demand fetching and installation of
 * community-contributed music blocks and Lua scripts.
 */
export declare class ScriptManager {
    private readonly scriptsDir;
    constructor(baseDir?: string);
    /**
     * Installs a specific author set or individual plugin from the registry.
     *
     * NOTE: Currently this only initializes local directories. The actual
     * fetching from the remote registry URL is not yet implemented.
     */
    installToolset(authorName: string): Promise<string>;
    /**
     * Lists currently installed local authors.
     */
    listLocalToolsets(): string[];
    /**
     * Ensures the core Ducer scripts remain intact.
     */
    verifyCoreIntegrity(): boolean;
}
