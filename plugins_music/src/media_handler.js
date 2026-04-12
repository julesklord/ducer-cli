/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
/**
 * Handles validation and preparation of media files (Audio/MIDI).
 * Implements Fair Use policies (size/format limits).
 */
export class MusicMediaHandler {
    MAX_FILE_SIZE_MB = 10; // Default limit for the PoC
    /**
     * Validates if a file is suitable for Gemini API submission.
     */
    validateFile(filePath) {
        if (!fs.existsSync(filePath)) {
            return { valid: false, error: 'File does not exist.' };
        }
        const stats = fs.statSync(filePath);
        const sizeInMB = stats.size / (1024 * 1024);
        if (sizeInMB > this.MAX_FILE_SIZE_MB) {
            return {
                valid: false,
                error: `File too large (${sizeInMB.toFixed(2)}MB). Max allowed: ${this.MAX_FILE_SIZE_MB}MB.`,
            };
        }
        // TODO: Add format validation (wav, mp3, mid, etc.)
        return { valid: true };
    }
}
//# sourceMappingURL=media_handler.js.map