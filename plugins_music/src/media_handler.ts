/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Handles validation and preparation of media files (Audio/MIDI).
 * Implements Fair Use policies (size/format limits).
 */
export class MusicMediaHandler {
  private readonly MAX_FILE_SIZE_MB = 10; // Default limit for the PoC
  private readonly ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.mid', '.midi', '.flac', '.ogg', '.m4a', '.aac', '.wma'];

  /**
   * Validates if a file is suitable for Gemini API submission.
   */
  validateFile(filePath: string): { valid: boolean; error?: string } {
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

    // Add format validation
    const ext = path.extname(filePath).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file format (${ext}). Allowed formats: ${this.ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    return { valid: true };
  }
}
