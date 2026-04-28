/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MusicMediaHandler } from './media_handler.js';
import fs from 'node:fs';

vi.mock('node:fs');

describe('MusicMediaHandler', () => {
  let handler: MusicMediaHandler;

  beforeEach(() => {
    handler = new MusicMediaHandler();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns invalid if file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const result = handler.validateFile('missing.mp3');
    expect(result).toEqual({ valid: false, error: 'File does not exist.' });
  });

  it('returns invalid if file is too large', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 15 * 1024 * 1024 } as fs.Stats);

    const result = handler.validateFile('large.mp3');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/File too large \(15\.00MB\)/);
  });

  it('returns invalid for unsupported file format', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 1 * 1024 * 1024 } as fs.Stats);

    const result = handler.validateFile('test.txt');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Unsupported file format \(\.txt\)/);
  });

  it('returns valid for supported file format (.wav)', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 1 * 1024 * 1024 } as fs.Stats);

    const result = handler.validateFile('test.wav');
    expect(result).toEqual({ valid: true });
  });

  it('returns valid for supported file format (.mp3) ignoring case', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 1 * 1024 * 1024 } as fs.Stats);

    const result = handler.validateFile('TEST.MP3');
    expect(result).toEqual({ valid: true });
  });

  it('allows larger local-processing audio files', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 120 * 1024 * 1024 } as fs.Stats);

    const result = handler.validateAudioFileForLocalProcessing('mix.wav');
    expect(result).toEqual({ valid: true });
  });

  it('rejects unsupported local-processing formats', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 1 * 1024 * 1024 } as fs.Stats);

    const result = handler.validateAudioFileForLocalProcessing('notes.mid');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Unsupported local-processing audio format/);
  });
});
