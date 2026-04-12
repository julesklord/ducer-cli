/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Handles validation and preparation of media files (Audio/MIDI).
 * Implements Fair Use policies (size/format limits).
 */
export declare class MusicMediaHandler {
    private readonly MAX_FILE_SIZE_MB;
    /**
     * Validates if a file is suitable for Gemini API submission.
     */
    validateFile(filePath: string): {
        valid: boolean;
        error?: string;
    };
}
