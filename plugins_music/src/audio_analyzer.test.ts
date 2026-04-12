/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioAnalyzer } from './audio_analyzer';
import * as cp from 'node:child_process';

vi.mock('node:child_process', () => ({
  exec: vi.fn((cmd, cb) => cb(null, { stdout: 'ok', stderr: '' })),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('Transcription result'),
  },
}));

describe('AudioAnalyzer', () => {
  let analyzer: AudioAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new AudioAnalyzer();
  });

  it('should construct correct songsee command with options', async () => {
    const result = await analyzer.visualize('test.wav', {
      viz: 'mel',
      start: 10,
      duration: 5,
    });

    expect(cp.exec).toHaveBeenCalledWith(
      expect.stringContaining('songsee "test.wav" --viz mel'),
      expect.any(Function),
    );
    expect(cp.exec).toHaveBeenCalledWith(
      expect.stringContaining('--start 10 --duration 5'),
      expect.any(Function),
    );
    expect(result.panels).toContain('mel');
  });

  it('should construct correct whisper command', async () => {
    const result = await analyzer.transcribe('vocal.wav', { model: 'base' });

    expect(cp.exec).toHaveBeenCalledWith(
      expect.stringContaining('whisper "vocal.wav" --model base'),
      expect.any(Function),
    );
    expect(result.text).toBe('Transcription result');
  });

  it('should handle songsee errors', async () => {
    (cp.exec as any).mockImplementationOnce((cmd: string, cb: any) =>
      cb(new Error('Spawn fail')),
    );

    await expect(analyzer.visualize('error.wav')).rejects.toThrow(
      'Songsee error: Spawn fail',
    );
  });
});
