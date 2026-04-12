/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { DawBridge, DawStatus, ActionValidationResult } from './bridge_interface.js';
export declare class ReaperBridgeClient implements DawBridge {
    private static readonly REAPER_SCRIPTS_DIR;
    private static readonly CMD_FILE;
    private static readonly RESP_FILE;
    private reaperIp;
    private reaperPort;
    constructor();
    /**
     * Checks if the REAPER bridge (File-system) is accessible.
     */
    isBridgeAvailable(): boolean;
    /**
     * Attempts to execute a command via Web Control (Faster).
     * Falls back to File Bridge if unreachable.
     */
    private tryWebControl;
    /**
     * Validates if an action ID exists in REAPER and returns its human-readable name.
     * This is a critical Anti-Hallucination measure.
     */
    validateAction(actionId: string | number): Promise<ActionValidationResult>;
    /**
     * Sends a raw command to the bridge.
     * High-level orchestrator that tries Web first, then File.
     */
    sendCommand(command: string): Promise<string>;
    /**
     * Executes a REAPER action by ID (Number or String).
     */
    executeAction(actionId: string | number): Promise<string>;
    /**
     * Executes raw Lua code.
     */
    executeLua(luaCode: string): Promise<string>;
    /**
     * Implements DawBridge.executeScript using Lua.
     */
    executeScript(code: string): Promise<string>;
    /**
     * Gets the current REAPER status.
     */
    getStatus(): Promise<DawStatus | null>;
    private pollResponse;
}
