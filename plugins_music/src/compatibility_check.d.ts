/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Ducer Compatibility Shield
 *
 * This utility validates that the host Gemini CLI environment provides
 * the necessary APIs for Ducer to function. This helps prevent breakage
 * when the upstream repository (Google) updates its core SDK or interfaces.
 */
export declare class CompatibilityShield {
    /**
     * Validates a Gemini Client instance against Ducer's expectations.
     * Throws a descriptive error if incompatible.
     */
    static validateGeminiClient(client: unknown): void;
    /**
     * Validates if the runtime environment matches Ducer's minimum requirements.
     */
    static validateRuntime(): void;
}
