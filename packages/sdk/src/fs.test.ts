/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SdkAgentFilesystem } from './fs.js';
import fs from 'node:fs/promises';
import type { Config } from '@google/gemini-cli-core';

vi.mock('node:fs/promises');

describe('SdkAgentFilesystem', () => {
  let mockConfig: {
    validatePathAccess: ReturnType<typeof vi.fn>;
  };
  let filesystem: SdkAgentFilesystem;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      validatePathAccess: vi.fn().mockReturnValue(null),
    };
    filesystem = new SdkAgentFilesystem(mockConfig as unknown as Config);
  });

  describe('readFile', () => {
    it('returns file content on success', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('file content');
      const result = await filesystem.readFile('/path/to/file');
      expect(result).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/file', 'utf-8');
    });

    it('returns null when path access is denied', async () => {
      mockConfig.validatePathAccess.mockReturnValue('Access denied');
      const result = await filesystem.readFile('/path/to/file');
      expect(result).toBe(null);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('returns null when fs.readFile throws', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'));
      const result = await filesystem.readFile('/path/to/file');
      expect(result).toBe(null);
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/file', 'utf-8');
    });
  });

  describe('writeFile', () => {
    it('calls fs.writeFile on success', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      await filesystem.writeFile('/path/to/file', 'content');
      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/file', 'content', 'utf-8');
    });

    it('throws error when path access is denied', async () => {
      mockConfig.validatePathAccess.mockReturnValue('Access denied');
      await expect(filesystem.writeFile('/path/to/file', 'content')).rejects.toThrow('Access denied');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });
});
