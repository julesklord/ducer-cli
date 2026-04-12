/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DucerCore } from './ducer_core';
import fs from 'node:fs';

// Mock everything
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn((p: string) => {
      if (p.includes('semantic_registry.json')) {
        return JSON.stringify({
          actions: [{ id: '40044', name: 'Transport: Play', tags: ['play'] }],
        });
      }
      if (p.includes('actions.json')) {
        return '{}';
      }
      return '';
    }),
  },
}));

// Mock the dependencies
const mockBridge = {
  executeAction: vi.fn().mockResolvedValue('OK'),
  validateAction: vi
    .fn()
    .mockResolvedValue({ valid: true, name: 'Transport: Play' }),
  getStatus: vi.fn().mockResolvedValue({
    version: '7.x',
    playState: 1,
    cursor: 0,
    projectPath: '/test',
  }),
  isBridgeAvailable: vi.fn().mockReturnValue(true),
  executeScript: vi.fn().mockResolvedValue('OK'),
};

describe('DucerCore', () => {
  let ducer: DucerCore;

  beforeEach(() => {
    vi.clearAllMocks();
    ducer = new DucerCore(mockBridge as any);
  });

  it('should dispatch recognized tools correctly', async () => {
    const call = {
      name: 'execute_reaper_action',
      args: JSON.stringify({ action_id: '40044' }),
    };
    const result = await (ducer as any).dispatchTool(call);

    expect(result).toBe('OK');
  });

  it('should trigger anti-hallucination loop for unknown IDs', async () => {
    const bridge = (ducer as any).bridge;
    bridge.validateAction.mockResolvedValueOnce({ valid: false });

    // Using an ID that might trigger a tag match like 'play'
    const call = {
      name: 'execute_reaper_action',
      args: JSON.stringify({ action_id: 'PLAY_HALLUCINATED_ID' }),
    };
    const result = await (ducer as any).dispatchTool(call);

    expect(result).toContain('Hallucinated ID detected');
    expect(result).toContain('Transport: Play');
  });

  it('should perform advanced semantic searches', async () => {
    const call = {
      name: 'search_actions',
      args: JSON.stringify({ query: 'play' }),
    };
    const result = await (ducer as any).dispatchTool(call);

    const parsed = JSON.parse(result);
    expect(parsed[0].name).toBe('Transport: Play');
  });

  it('should allow Ducer to learn new macros', async () => {
    const call = {
      name: 'learn_workflow_macro',
      args: JSON.stringify({ name: 'misupermacro', action_id: '123' }),
    };
    const result = await (ducer as any).dispatchTool(call);

    expect(result).toContain('Ducer has learned');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
