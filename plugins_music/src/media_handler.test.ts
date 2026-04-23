/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import { MusicMediaHandler } from './media_handler.js';

describe('MusicMediaHandler', () => {
  let handler: MusicMediaHandler;

  beforeEach(() => {
    handler = new MusicMediaHandler();
    vi.spyOn(fs, 'existsSync');
    vi.spyOn(fs, 'statSync');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error if file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const result = handler.validateFile('missing.wav');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File does not exist.');
  });

  it('should return error if file is too large', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    // 11 MB
    vi.mocked(fs.statSync).mockReturnValue({ size: 11 * 1024 * 1024 } as fs.Stats);

    const result = handler.validateFile('large.wav');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File too large');
  });

  it('should return valid for allowed extensions', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    // 5 MB
    vi.mocked(fs.statSync).mockReturnValue({ size: 5 * 1024 * 1024 } as fs.Stats);

    const allowed = ['.wav', '.mp3', '.mid', '.midi', '.flac', '.ogg', '.m4a', '.aac', '.wma'];
    for (const ext of allowed) {
      const result = handler.validateFile(`test${ext}`);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    }
  });

  it('should return error for unsupported extensions', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    // 5 MB
    vi.mocked(fs.statSync).mockReturnValue({ size: 5 * 1024 * 1024 } as fs.Stats);

    const unallowed = ['.txt', '.doc', '.exe', '.png'];
    for (const ext of unallowed) {
      const result = handler.validateFile(`test${ext}`);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    }
  });
});
