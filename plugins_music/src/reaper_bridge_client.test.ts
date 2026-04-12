/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReaperBridgeClient } from './reaper_bridge_client';
import * as fs from 'node:fs';

vi.mock('fs');

describe('ReaperBridgeClient', () => {
  let client: ReaperBridgeClient;

  beforeEach(() => {
    vi.resetAllMocks();
    client = new ReaperBridgeClient();

    // Mock fs methods used in pollResponse
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue('OK');
    (fs.writeFileSync as any).mockImplementation(() => {});

    // Default fetch mock (success)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('OK'),
    }) as any;
  });

  it('should use Web API by default if available', async () => {
    const result = await client.executeAction('40044');
    expect(global.fetch).toHaveBeenCalled();
    expect(result).toBe('OK (Web API)');
  });

  it('should fallback to File Bridge if Web API fails', async () => {
    // Mock fetch failure
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('Connection refused')) as any;

    const result = await client.executeAction('40044');

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(result).toBe('OK');
  });

  it('should validate actions via Lua and ExtState', async () => {
    // Mock fetch for executeLua (Web)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('OK'),
    }) as any;

    // Mock fs.readFileSync for pollResponse (get_ext_state fallback)
    (fs.readFileSync as any).mockReturnValue('Transport: Play');

    const validation = await client.validateAction('40044');

    expect(validation.valid).toBe(true);
    expect(validation.name).toBe('Transport: Play');
  });

  it('should identify invalid actions during validation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('OK'),
    }) as any;

    // validateAction calls sendCommand twice:
    // 1. lua execution (should be OK)
    // 2. get_ext_state (should be INVALID for this test)
    (fs.readFileSync as any)
      .mockReturnValueOnce('OK')
      .mockReturnValueOnce('INVALID');

    const validation = await client.validateAction('99999');

    expect(validation.valid).toBe(false);
  });
});
