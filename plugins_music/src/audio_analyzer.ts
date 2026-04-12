/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface VisualizationResult {
  imagePath: string;
  panels: string[];
}

export interface TranscriptionResult {
  text: string;
  format: string;
}

/**
 * AudioAnalyzer provides wrappers for external sensory tools (songsee, whisper).
 */
export class AudioAnalyzer {
  private readonly reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports', 'analysis');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Generates a visualization using songsee.
   */
  async visualize(
    audioPath: string,
    options: {
      viz?: string;
      start?: number;
      duration?: number;
      style?: string;
    } = {},
  ): Promise<VisualizationResult> {
    const fileName = path.basename(audioPath, path.extname(audioPath));
    const outputName = `${fileName}_viz_${Date.now()}.jpg`;
    const outputPath = path.join(this.reportsDir, outputName);

    const viz = options.viz || 'spectrogram,mel,chroma,loudness';
    const style = options.style || 'magma';

    let command = `songsee "${audioPath}" --viz ${viz} --style ${style} -o "${outputPath}"`;

    if (options.start !== undefined) command += ` --start ${options.start}`;
    if (options.duration !== undefined)
      command += ` --duration ${options.duration}`;

    try {
      await execAsync(command);
      return {
        imagePath: outputPath,
        panels: viz.split(','),
      };
    } catch (error) {
      throw new Error(
        `Songsee error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Transcribes audio using Whisper.
   */
  async transcribe(
    audioPath: string,
    options: {
      model?: string;
    } = {},
  ): Promise<TranscriptionResult> {
    const fileName = path.basename(audioPath, path.extname(audioPath));
    const outputDir = this.reportsDir;
    const model = options.model || 'turbo';

    // Whisper CLI typically outputs a file with the same name as the audio in the target dir
    const command = `whisper "${audioPath}" --model ${model} --output_format txt --output_dir "${outputDir}"`;

    try {
      await execAsync(command);
      const txtPath = path.join(outputDir, `${fileName}.txt`);

      if (!fs.existsSync(txtPath)) {
        throw new Error('Whisper output file not found.');
      }

      const text = fs.readFileSync(txtPath, 'utf8');
      return {
        text,
        format: 'txt',
      };
    } catch (error) {
      throw new Error(
        `Whisper error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
