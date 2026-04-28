/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { logger } from './logger.js';

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
  device?: 'cpu' | 'cuda' | 'mps' | 'auto';
  batchSize?: number;
  segmentSize?: number;
  onProgress?: (progress: number, message?: string) => void;
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

class AudioSeparatorProvider implements StemSeparationProvider {
  backend: StemSeparationBackend = 'uvr';

  private getExecutablePath(manualPath?: string): string {
    if (manualPath && fs.existsSync(manualPath)) return manualPath;

    const isWin = process.platform === 'win32';
    const venvPath = path.resolve(
      process.cwd(),
      'plugins_music',
      'python_env',
      isWin ? 'Scripts' : 'bin',
      isWin ? 'audio-separator.exe' : 'audio-separator',
    );

    if (fs.existsSync(venvPath)) return venvPath;

    // Fallback to global path
    return isWin ? 'audio-separator.exe' : 'audio-separator';
  }

  async separate(
    audioPath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult> {
    const preset = options.preset ?? 'vocals';
    const executable = this.getExecutablePath(options.executablePath);
    const baseOutputDir =
      options.outputDir || path.join(process.cwd(), 'reports', 'stems');
    const outputDir = getDatedOutputDir(baseOutputDir, audioPath);
    ensureDir(outputDir);

    // Audio-separator command: audio-separator <input> --model_filename <model> --output_dir <dir>
    // Note: presets in audio-separator are usually handled by model choice,
    // but we can map our presets to default models.
    const modelMap: Record<StemSeparationPreset, string> = {
      standard: 'UVR-MDX-NET-Inst_HQ_3.onnx',
      'high-quality': 'UVR-MDX-NET-Inst_HQ_3.onnx',
      vocals: 'UVR-MDX-NET-Voc_FT.onnx',
      karaoke: 'UVR-MDX-NET-Voc_FT.onnx',
    };

    const model = options.model || modelMap[preset];
    const args = [
      audioPath,
      '--model_filename',
      model,
      '--output_dir',
      outputDir,
    ];

    const device = options.device || 'auto';

    if (device === 'cuda' || device === 'auto') {
      // We assume if 'auto' is selected and we're on a system that had the GPU setup run,
      // cuda will be available. audio-separator itself handles the fallback if we don't force it,
      // but passing the flags ensures we use the right provider.
      args.push('--use_autocast');
      args.push('--execution_providers', 'CUDAExecutionProvider');
    } else if (device === 'mps') {
      args.push('--execution_providers', 'CoreMLExecutionProvider');
    }

    if (options.batchSize) {
      args.push('--mdx_batch_size', options.batchSize.toString());
      args.push('--mdxc_batch_size', options.batchSize.toString());
    }

    if (options.segmentSize) {
      args.push('--mdxc_segment_size', options.segmentSize.toString());
    }

    // Add debug flag for better troubleshooting
    args.push('--log_level', 'info');

    return new Promise((resolve, reject) => {
      const proc = spawn(executable, args, { shell: true });
      let output = '';
      let lastProgress = 0;

      proc.stdout?.on('data', (data: Buffer | string) => {
        const line = data.toString();
        output += line;
        // Progress parsing: "Separation progress: 45%"
        const match = line.match(/Separation progress: (\d+)%/);
        if (match && options.onProgress) {
          const progress = parseInt(match[1], 10);
          if (progress !== lastProgress) {
            lastProgress = progress;
            // Keep the legacy stdout marker because the web-controller parses it
            // in real time while we also persist structured progress logs.
            process.stdout.write(`PROGRESS: ${progress}%\n`);
            logger.info(`separation_progress`, { progress });
            options.onProgress(progress, line.trim());
          }
        }
      });

      proc.stderr?.on('data', (data: Buffer | string) => {
        const line = data.toString();
        output += line;
        // Some models report progress on stderr
        const match = line.match(/(\d+)%/);
        if (match && options.onProgress) {
          const progress = parseInt(match[1], 10);
          if (progress !== lastProgress) {
            lastProgress = progress;
            // Keep the legacy stdout marker because the web-controller parses it
            // in real time while we also persist structured progress logs.
            process.stdout.write(`PROGRESS: ${progress}%\n`);
            logger.info(`separation_progress`, { progress });
            options.onProgress(progress, line.trim());
          }
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({
            backend: this.backend,
            preset,
            outputDir,
            stemFiles: fs
              .readdirSync(outputDir)
              .map((f) => path.join(outputDir, f)),
            command: `${executable} ${args.join(' ')}`,
          });
        } else {
          reject(
            new Error(
              `audio-separator failed with code ${code}. Output: ${output}`,
            ),
          );
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }
}

export class StemSeparationManager {
  private readonly providers: Record<
    StemSeparationBackend,
    StemSeparationProvider
  > = {
    demucs: new DemucsStemSeparationProvider(),
    uvr: new AudioSeparatorProvider(),
  };

  getSupportedBackends(): StemSeparationBackend[] {
    return Object.keys(this.providers).filter((k): k is StemSeparationBackend =>
      ['demucs', 'uvr'].includes(k),
    );
  }

  async separate(
    audioPath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult> {
    const provider = this.providers[options.backend];
    if (!provider) {
      throw new Error(
        `Unsupported stem separation backend: ${options.backend}`,
      );
    }
    return provider.separate(audioPath, options);
  }
}
