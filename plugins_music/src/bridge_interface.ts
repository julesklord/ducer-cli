/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Common status information for any supported DAW.
 */
export interface DawStatus {
  version: string;
  playState: number; // 0=Stop, 1=Play, 2=Pause, 5=Record (Standardized)
  cursor: number; // Timeline position in seconds
  projectPath: string;
}

/**
 * Schema for DAW action validation (Anti-Hallucination).
 */
export interface ActionValidationResult {
  valid: boolean;
  name?: string;
}

/**
 * Universal Bridge Interface for DAW orchestration.
 */
export interface DawBridge {
  /**
   * Executes a DAW action by ID or Name.
   */
  executeAction(actionId: string | number): Promise<string>;

  /**
   * Executes custom scripting code (Lua, Python, JS) if supported.
   */
  executeScript?(code: string): Promise<string>;

  /**
   * Validates if an action exists in the DAW.
   */
  validateAction(actionId: string | number): Promise<ActionValidationResult>;

  /**
   * Retrieves current DAW state.
   */
  getStatus(): Promise<DawStatus | null>;

  /**
   * Checks if the bridge mechanism is currently reachable.
   */
  isBridgeAvailable(): boolean;
}
