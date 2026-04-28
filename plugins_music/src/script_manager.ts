/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';


/**
 * ScriptManager: Handles on-demand fetching and installation of 
 * community-contributed music blocks and Lua scripts.
 */
export class ScriptManager {
  private readonly scriptsDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.scriptsDir = path.join(baseDir, 'scripts', 'lua');
  }

  /**
   * Remote toolset installation is intentionally disabled until there is a
   * real registry and integrity verification flow behind it.
   */
  supportsRemoteInstall(): boolean {
    return false;
  }

  /**
   * Installs a specific author set or individual plugin from the registry.
   * 
   * NOTE: Currently this only initializes local directories. The actual
   * fetching from the remote registry URL is not yet implemented.
   */
  async installToolset(authorName: string): Promise<string> {
    return `[ScriptManager] Remote toolset installation for "${authorName}" is disabled until the registry, download, and integrity verification flow are implemented.`;
  }

  /**
   * Lists currently installed local authors.
   */
  listLocalToolsets(): string[] {
    if (!fs.existsSync(this.scriptsDir)) return [];
    return fs.readdirSync(this.scriptsDir).filter(f => 
       fs.statSync(path.join(this.scriptsDir, f)).isDirectory()
    );
  }

  /**
   * Ensures the core Ducer scripts remain intact.
   */
  verifyCoreIntegrity(): boolean {
    return fs.existsSync(path.join(this.scriptsDir, 'Ducer', 'Ducer_Bridge.lua'));
  }
}
