/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cp from 'node:child_process';
import { StemSeparationManager } from './stem_separator';

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd, _args, cb) => cb(null, { stdout: 'ok', stderr: '' })),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
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

  it('should request two-stem mode for vocals preset', async () => {
    await manager.separate('vocal.wav', {
      backend: 'demucs',
      preset: 'vocals',
      outputDir: 'C:\\stems',
    });

    expect(cp.execFile).toHaveBeenCalledWith(
      'demucs',
      expect.arrayContaining(['--two-stems', 'vocals']),
      expect.any(Function),
    );
  });

  it('should run uvr backend with normalized args', async () => {
    const result = await manager.separate('mix.wav', {
      backend: 'uvr',
      preset: 'karaoke',
      outputDir: 'C:\\uvr',
      model: 'UVR-MDX-NET',
    });

    expect(cp.execFile).toHaveBeenCalledWith(
      'uvr-cli',
      expect.arrayContaining([
        '--input',
        'mix.wav',
        '--output_dir',
        expect.stringContaining('C:\\uvr'),
        '--preset',
        'karaoke',
        '--model',
        'UVR-MDX-NET',
      ]),
      expect.any(Function),
    );
    expect(result.backend).toBe('uvr');
  });
});
