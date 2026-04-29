/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */



import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cp from 'node:child_process';
import { StemSeparationManager } from './stem_separator';

vi.mock('node:child_process', () => {
  const mockProcess = {
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === 'close') {
        setTimeout(() => cb(0), 10);
      }
    }),
  };
  return {
    execFile: vi.fn((_cmd, _args, cb) => cb(null, { stdout: 'ok', stderr: '' })),
    spawn: vi.fn(() => mockProcess),
    promisify: vi.fn((fn) => fn),
  };
});

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue(['vocals.wav', 'no_vocals.wav']),
  },
}));

describe('StemSeparationManager', () => {
  let manager: StemSeparationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new StemSeparationManager();
  });

  it('should run demucs with expected args for high-quality preset', async () => {
    const result = await manager.separate('song.wav', {
      backend: 'demucs',
      preset: 'high-quality',
      outputDir: 'C:\\stems',
    });

    expect(cp.execFile).toHaveBeenCalledWith(
      'demucs',
      expect.arrayContaining(['-n', 'htdemucs_ft', '-o', 'C:\\stems', 'song.wav']),
      expect.any(Function),
    );
    expect(result.backend).toBe('demucs');
    expect(result.stemFiles.some((file) => file.endsWith('vocals.wav'))).toBe(true);
  });

  it('should run uvr backend (audio-separator) with correct args', async () => {
    const result = await manager.separate('mix.wav', {
      backend: 'uvr',
      preset: 'vocals',
      outputDir: 'C:\\uvr',
    });

    expect(cp.spawn).toHaveBeenCalledWith(
      expect.stringContaining('audio-separator'),
      expect.arrayContaining([
        'mix.wav',
        '--model_filename',
        'UVR-MDX-NET-Voc_FT.onnx',
        '--output_dir',
        expect.stringContaining('mix_'),
      ]),
      expect.objectContaining({ shell: true }),
    );
    expect(result.backend).toBe('uvr');
  });

  it('should respect device option in uvr backend', async () => {
    await manager.separate('mix.wav', {
      backend: 'uvr',
      device: 'cpu',
    });

    expect(cp.spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['--use_cpu']),
      expect.any(Object),
    );
  });
});
