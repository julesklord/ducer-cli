/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

import {
  DawBridge,
  DawStatus,
  ActionValidationResult,
} from './bridge_interface.js';

/**
 * Gets the cross-platform config directory for REAPER scripts.
 * Windows: %APPDATA%\REAPER\Scripts
 * macOS: ~/Library/Application Support/REAPER/Scripts  
 * Linux: ~/.config/REAPER/Scripts
 */
function getReaperScriptsDir(): string {
  const platform = os.platform();
  
  if (platform === 'win32') {
    const appData = process.env['APPDATA'];
    if (!appData) {
      throw new Error('APPDATA environment variable not set. Cannot locate REAPER scripts directory on Windows.');
    }
    return path.join(appData, 'REAPER', 'Scripts');
  }
  
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'REAPER', 'Scripts');
  }
  
  // Linux and other Unix-like systems
  const xdgConfig = process.env['XDG_CONFIG_HOME'];
  if (xdgConfig) {
    return path.join(xdgConfig, 'REAPER', 'Scripts');
  }
  return path.join(os.homedir(), '.config', 'REAPER', 'Scripts');
}

export class ReaperBridgeClient implements DawBridge {
  private static readonly REAPER_SCRIPTS_DIR = getReaperScriptsDir();
  private static readonly CMD_FILE = path.join(
    ReaperBridgeClient.REAPER_SCRIPTS_DIR,
    'ducer_commands.txt',
  );
  private static readonly RESP_FILE = path.join(
    ReaperBridgeClient.REAPER_SCRIPTS_DIR,
    'ducer_response.txt',
  );

  // High-Performance Web Interface (reaper-control style)
  private reaperIp: string;
  private reaperPort: string;

  constructor() {
    this.reaperIp = process.env['REAPER_IP'] || '127.0.0.1';
    this.reaperPort = process.env['REAPER_PORT'] || '8080';
  }

  /**
   * Checks if the REAPER bridge (File-system) is accessible.
   */
  public isBridgeAvailable(): boolean {
    return fs.existsSync(ReaperBridgeClient.REAPER_SCRIPTS_DIR);
  }

  /**
   * Attempts to execute a command via Web Control (Faster).
   * Falls back to File Bridge if unreachable.
   */
  private async tryWebControl(cmd: string): Promise<string | null> {
    const url = `http://${this.reaperIp}:${this.reaperPort}/_/${cmd}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        return await response.text();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validates if an action ID exists in REAPER and returns its human-readable name.
   * This is a critical Anti-Hallucination measure.
   */
  public async validateAction(
    actionId: string | number,
  ): Promise<ActionValidationResult> {
    // 1. Try Web API for quick validation if possible
    // (Web API doesn't have a direct "validate" endpoint, so we usually rely on Lua for this)

    // 2. Lua-based verification
    const luaValidator = `
      local id = "${actionId}"
      local name = reaper.ReverseNamedCommandLookup(tonumber(id) or reaper.NamedCommandLookup(id))
      if name then 
        reaper.SetExtState("Ducer", "last_val", name, false)
      else
        reaper.SetExtState("Ducer", "last_val", "INVALID", false)
      end
    `;

    try {
      await this.executeLua(luaValidator);
      // We need to poll for the ExtState response via bridge or just trust the execution
      // For now, if executeLua succeeds, we've at least sent it.
      // To be strictly robust, we query the bridge for the result.
      const result = await this.sendCommand('get_ext_state:Ducer|last_val');
      return {
        valid: result !== 'INVALID',
        name: result !== 'INVALID' ? result : undefined,
      };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Sends a raw command to the bridge.
   * High-level orchestrator that tries Web first, then File.
   */
  public async sendCommand(command: string): Promise<string> {
    // 1. Try Web API for simple actions (id only)
    if (command.startsWith('action:')) {
      const actionId = command.split(':')[1];
      const webResult = await this.tryWebControl(actionId);
      if (webResult !== null) {
        return 'OK (Web API)';
      }
    }

    // 2. Fallback to File Bridge
    if (!this.isBridgeAvailable()) {
      throw new Error(
        'REAPER Bridge not found. Ensure Ducer bridge is installed in REAPER and check Web Control.',
      );
    }

    // Write command
    fs.writeFileSync(ReaperBridgeClient.CMD_FILE, command);

    // Poll for response
    return this.pollResponse();
  }

  /**
   * Executes a REAPER action by ID (Number or String).
   */
  public async executeAction(actionId: string | number): Promise<string> {
    return this.sendCommand(`action:${actionId}`);
  }

  /**
   * Executes raw Lua code.
   */
  public async executeLua(luaCode: string): Promise<string> {
    return this.sendCommand(`lua:${luaCode}`);
  }

  /**
   * Implements DawBridge.executeScript using Lua.
   */
  public async executeScript(code: string): Promise<string> {
    return this.executeLua(code);
  }

  /**
   * Gets the current REAPER status.
   */
  public async getStatus(): Promise<DawStatus | null> {
    // Try Web API for status (command "" returns project info in reaper web)
    const webStatusRaw = await this.tryWebControl('');
    if (webStatusRaw) {
      const lines = webStatusRaw.split('\n');
      const parts = lines[0]?.split('\t');
      if (parts && parts.length >= 4) {
        return {
          version: 'WebAPI',
          playState: parseInt(parts[0], 10),
          cursor: parseFloat(parts[3]),
          projectPath: parts[4] || 'Unknown (Web)',
        };
      }
    }

    // Fallback to File Bridge status
    try {
      const response = await this.sendCommand('status');
      const parts = response.split('|');
      const status: Partial<DawStatus> = {};

      for (const part of parts) {
        const [key, val] = part.split(':');
        if (key === 'v') status.version = val;
        if (key === 'state') status.playState = parseInt(val, 10);
        if (key === 'cursor') status.cursor = parseFloat(val);
        if (key === 'proj')
          status.projectPath = parts
            .slice(parts.indexOf(part))
            .join(':')
            .substring(5);
      }

      return status as DawStatus;
    } catch {
      return null;
    }
  }

  private async pollResponse(timeoutMs = 5000): Promise<string> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (fs.existsSync(ReaperBridgeClient.RESP_FILE)) {
        const content = fs
          .readFileSync(ReaperBridgeClient.RESP_FILE, 'utf8')
          .trim();
        if (content !== '') {
          // Clear response file
          fs.writeFileSync(ReaperBridgeClient.RESP_FILE, '');
          return content;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Timeout waiting for REAPER response.');
  }
}
