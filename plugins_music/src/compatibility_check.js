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
export class CompatibilityShield {
    /**
     * Validates a Gemini Client instance against Ducer's expectations.
     * Throws a descriptive error if incompatible.
     */
    static validateGeminiClient(client) {
        if (!client || typeof client !== 'object') {
            throw new Error('[Ducer Maintenance Shield] CRITICAL: Invalid Gemini Client provided by host CLI.');
        }
        const requiredMethods = ['sendMessageStream'];
        const missingMethods = requiredMethods.filter((m) => typeof client[m] !== 'function');
        if (missingMethods.length > 0) {
            throw new Error(`[Ducer Maintenance Shield] INCOMPATIBILITY DETECTED: 
The host Gemini CLI has changed its internal API. 
Missing required methods: ${missingMethods.join(', ')}.
Please contact the Ducer maintainer to update the plugin layer.`);
        }
    }
    /**
     * Validates if the runtime environment matches Ducer's minimum requirements.
     */
    static validateRuntime() {
        const versionParts = process.version.replace('v', '').split('.');
        const major = parseInt(versionParts[0], 10);
        if (major < 20) {
            throw new Error(`[Ducer Maintenance Shield] Node.js version ${process.version} is not supported. Ducer requires Node.js >= 20.`);
        }
    }
}
//# sourceMappingURL=compatibility_check.js.map