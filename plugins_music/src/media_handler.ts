/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Handles validation and preparation of media files (Audio/MIDI).
 * Implements Fair Use policies (size/format limits).
 */
export class MusicMediaHandler {
  private readonly MAX_FILE_SIZE_MB = 10; // Default limit for the PoC
  private readonly ALLOWED_EXTENSIONS = new Set([
    '.wav',
    '.mp3',
    '.mid',
    '.midi',
    '.flac',
    '.ogg',
    '.m4a',
    '.aac',
  ]);
  private readonly LOCAL_PROCESSING_MAX_FILE_SIZE_MB = 512;
  private readonly AUDIO_EXTENSIONS = new Set([
    '.wav',
    '.mp3',
    '.flac',
    '.ogg',
    '.m4a',
    '.aac',
    '.aiff',
    '.aif',
  ]);

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

    const ext = path.extname(filePath).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `Unsupported file format (${ext || 'no extension'}). Allowed formats: ${Array.from(this.ALLOWED_EXTENSIONS).join(', ')}.`,
      };
    }

    return { valid: true };
  }

  /**
   * Validates an audio file for local heavy processing (Demucs/UVR/etc.).
   */
  validateAudioFileForLocalProcessing(filePath: string): {
    valid: boolean;
    error?: string;
  } {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File does not exist.' };
    }

    const stats = fs.statSync(filePath);
    const sizeInMB = stats.size / (1024 * 1024);
    if (sizeInMB > this.LOCAL_PROCESSING_MAX_FILE_SIZE_MB) {
      return {
        valid: false,
        error: `File too large for local processing (${sizeInMB.toFixed(2)}MB). Max allowed: ${this.LOCAL_PROCESSING_MAX_FILE_SIZE_MB}MB.`,
      };
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!this.AUDIO_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `Unsupported local-processing audio format (${ext || 'no extension'}). Allowed formats: ${Array.from(this.AUDIO_EXTENSIONS).join(', ')}.`,
      };
    }

    return { valid: true };
  }

  /**
   * Normalizes audio gain using ffmpeg's loudnorm filter.
   */
  async normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
    const args = [
      '-i',
      inputPath,
      '-af',
      'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-y',
      outputPath,
    ];

    try {
      await execFileAsync('ffmpeg', args);
    } catch (error) {
      throw new Error(
        `FFmpeg normalization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Converts audio to a different format using ffmpeg.
   */
  async convertAudio(inputPath: string, outputPath: string): Promise<void> {
    const args = ['-i', inputPath, '-y', outputPath];

    try {
      await execFileAsync('ffmpeg', args);
    } catch (error) {
      throw new Error(
        `FFmpeg conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
