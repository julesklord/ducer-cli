/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createLogger } from './logger.js';

vi.mock('vscode', () => ({
  ExtensionMode: {
    Development: 1,
    Production: 2,
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

describe('createLogger', () => {
  let mockContext: vscode.ExtensionContext;
  let mockOutputChannel: vscode.OutputChannel;
  let mockGetConfiguration: ReturnType<typeof vi.fn>;
  let mockGetConfigValue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockContext = {
      extensionMode: vscode.ExtensionMode.Production,
    } as vscode.ExtensionContext;

    mockOutputChannel = {
      appendLine: vi.fn(),
    } as unknown as vscode.OutputChannel;

    mockGetConfigValue = vi.fn();
    mockGetConfiguration = vi.fn(() => ({
      get: mockGetConfigValue,
    }));

    vi.mocked(vscode.workspace.getConfiguration).mockImplementation(
      mockGetConfiguration as unknown as any,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not log when in production mode and logging is disabled', () => {
    mockContext.extensionMode = vscode.ExtensionMode.Production;
    mockGetConfigValue.mockReturnValue(false);

    const log = createLogger(mockContext, mockOutputChannel);
    log('test message');

    expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    expect(mockGetConfiguration).toHaveBeenCalledWith('gemini-cli.debug');
    expect(mockGetConfigValue).toHaveBeenCalledWith('logging.enabled');
  });

  it('should log when in development mode even if logging is disabled', () => {
    mockContext.extensionMode = vscode.ExtensionMode.Development;
    mockGetConfigValue.mockReturnValue(false);

    const log = createLogger(mockContext, mockOutputChannel);
    log('test message');

    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('test message');
  });

  it('should log when in production mode and logging is enabled', () => {
    mockContext.extensionMode = vscode.ExtensionMode.Production;
    mockGetConfigValue.mockReturnValue(true);

    const log = createLogger(mockContext, mockOutputChannel);
    log('test message');

    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('test message');
  });

  it('should log when in development mode and logging is enabled', () => {
    mockContext.extensionMode = vscode.ExtensionMode.Development;
    mockGetConfigValue.mockReturnValue(true);

    const log = createLogger(mockContext, mockOutputChannel);
    log('test message');

    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('test message');
  });
});
