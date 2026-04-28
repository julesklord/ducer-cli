/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  data?: Record<string, unknown>;
  jobId?: string;
  sessionId?: string;
}

export class DucerLogger {
  private logDir: string;
  private logFile: string;

  constructor(customLogDir?: string) {
    if (customLogDir) {
      this.logDir = customLogDir;
    } else {
      this.logDir = path.join(os.homedir(), '.ducer', 'logs');
    }

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    this.logFile = path.join(this.logDir, `ducer-${today}.jsonl`);
  }

  log(event: string, level: 'info' | 'warn' | 'error' = 'info', data?: Record<string, unknown>, extra?: { jobId?: string; sessionId?: string }): void {
    const entry: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      event,
      data,
      ...extra,
    };

    try {
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    } catch (err) {
      console.error(`[DucerLogger] Failed to write log: ${err}`);
    }
  }

  info(event: string, data?: Record<string, unknown>, extra?: { jobId?: string; sessionId?: string }): void {
    this.log(event, 'info', data, extra);
  }

  warn(event: string, data?: Record<string, unknown>, extra?: { jobId?: string; sessionId?: string }): void {
    this.log(event, 'warn', data, extra);
  }

  error(event: string, data?: Record<string, unknown>, extra?: { jobId?: string; sessionId?: string }): void {
    this.log(event, 'error', data, extra);
  }
}

// Export a singleton for easy use
export const logger = new DucerLogger();
