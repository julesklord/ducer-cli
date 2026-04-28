/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type StemSeparationBackend = 'demucs' | 'uvr';
export type StemSeparationPreset =
  | 'standard'
  | 'high-quality'
  | 'vocals'
  | 'karaoke';

export interface StemSeparationOptions {
  backend: StemSeparationBackend;
  preset?: StemSeparationPreset;
  outputDir?: string;
  executablePath?: string;
  model?: string;
  device?: 'cpu' | 'cuda' | 'mps';
}

export interface StemSeparationResult {
  backend: StemSeparationBackend;
  preset: StemSeparationPreset;
  outputDir: string;
  stemFiles: string[];
  command: string;
}

interface StemSeparationProvider {
  backend: StemSeparationBackend;
  separate(
    audioPath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult>;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDatedOutputDir(baseDir: string, audioPath: string): string {
  const fileName = path.basename(audioPath, path.extname(audioPath));
  return path.join(baseDir, `${fileName}_${Date.now()}`);
}

class DemucsStemSeparationProvider implements StemSeparationProvider {
  backend: StemSeparationBackend = 'demucs';

  async separate(
    audioPath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult> {
    const preset = options.preset ?? 'standard';
    const executable = options.executablePath || 'demucs';
    const baseOutputDir =
      options.outputDir || path.join(process.cwd(), 'reports', 'stems');
    ensureDir(baseOutputDir);

    const modelByPreset: Record<StemSeparationPreset, string> = {
      standard: 'htdemucs',
      'high-quality': 'htdemucs_ft',
      vocals: 'htdemucs_ft',
      karaoke: 'htdemucs_ft',
    };
    const model = options.model || modelByPreset[preset];
    const args = ['-n', model, '-o', baseOutputDir];

    if (options.device) {
      args.push('-d', options.device);
    }
    if (preset === 'vocals' || preset === 'karaoke') {
      args.push('--two-stems', 'vocals');
    }

    args.push(audioPath);

    try {
      await execFileAsync(executable, args);
    } catch (error) {
      throw new Error(
        `Demucs execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const trackDir = path.join(
      baseOutputDir,
      model,
      path.basename(audioPath, path.extname(audioPath)),
    );
    const stemFiles =
      preset === 'vocals' || preset === 'karaoke'
        ? [
            path.join(trackDir, 'vocals.wav'),
            path.join(trackDir, 'no_vocals.wav'),
          ]
        : [
            path.join(trackDir, 'drums.wav'),
            path.join(trackDir, 'bass.wav'),
            path.join(trackDir, 'other.wav'),
            path.join(trackDir, 'vocals.wav'),
          ];

    return {
      backend: this.backend,
      preset,
      outputDir: trackDir,
      stemFiles,
      command: `${executable} ${args.join(' ')}`,
    };
  }
}

class UVRStemSeparationProvider implements StemSeparationProvider {
  backend: StemSeparationBackend = 'uvr';

  async separate(
    audioPath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult> {
    const preset = options.preset ?? 'vocals';
    const executable = options.executablePath || 'uvr-cli';
    const baseOutputDir =
      options.outputDir || path.join(process.cwd(), 'reports', 'stems');
    const outputDir = getDatedOutputDir(baseOutputDir, audioPath);
    ensureDir(outputDir);

    const args = [
      '--input',
      audioPath,
      '--output_dir',
      outputDir,
      '--preset',
      preset,
    ];

    if (options.model) {
      args.push('--model', options.model);
    }
    if (options.device) {
      args.push('--device', options.device);
    }

    try {
      await execFileAsync(executable, args);
    } catch (error) {
      throw new Error(
        `UVR execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      backend: this.backend,
      preset,
      outputDir,
      stemFiles: [
        path.join(outputDir, 'vocals.wav'),
        path.join(outputDir, 'instrumental.wav'),
      ],
      command: `${executable} ${args.join(' ')}`,
    };
  }
}

export class StemSeparationManager {
  private readonly providers: Record<
    StemSeparationBackend,
    StemSeparationProvider
  > = {
    demucs: new DemucsStemSeparationProvider(),
    uvr: new UVRStemSeparationProvider(),
  };

  getSupportedBackends(): StemSeparationBackend[] {
    return Object.keys(this.providers) as StemSeparationBackend[];
  }

  async separate(
    audioPath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult> {
    const provider = this.providers[options.backend];
    if (!provider) {
      throw new Error(`Unsupported stem separation backend: ${options.backend}`);
    }
    return provider.separate(audioPath, options);
  }
}
