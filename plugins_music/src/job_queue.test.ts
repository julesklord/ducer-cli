/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { JobQueue } from './job_queue';

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    dirname: vi.fn().mockReturnValue('.'),
  },
}));

// Mock path and os to avoid issues with homedir
vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    dirname: vi.fn().mockReturnValue('.'),
  };
});

// Mock logger
vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('JobQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('[]');
  });

  it('writes the queue atomically when adding a job', () => {
    const queue = new JobQueue('C:\\ducer\\jobs.json');
    queue.addJob('analysis', { filePaths: ['song.wav'] });

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'C:\\ducer\\jobs.json.tmp',
      expect.any(String),
    );
    expect(fs.renameSync).toHaveBeenCalledWith(
      'C:\\ducer\\jobs.json.tmp',
      'C:\\ducer\\jobs.json',
    );
  });

  it('claims the next pending job and marks it as running and increments attempts', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify([
        {
          id: 'job-1',
          type: 'analysis',
          payload: {},
          status: 'pending',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          attempts: 0,
        },
      ]),
    );

    const queue = new JobQueue('C:\\ducer\\jobs.json');
    const job = queue.claimNextPendingJob();

    expect(job?.id).toBe('job-1');
    expect(job?.status).toBe('running');
    expect(job?.attempts).toBe(1);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('resets stale jobs', () => {
    const staleTime = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5 hours ago
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify([
        {
          id: 'job-stale',
          type: 'analysis',
          payload: {},
          status: 'running',
          createdAt: staleTime,
          updatedAt: staleTime,
          attempts: 1,
        },
        {
          id: 'job-fresh',
          type: 'analysis',
          payload: {},
          status: 'running',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attempts: 1,
        }
      ]),
    );

    const queue = new JobQueue('C:\\ducer\\jobs.json');
    queue.resetStaleJobs(); // Default 4 hours

    // We need to check what was saved
    const saveCall = vi.mocked(fs.writeFileSync).mock.calls.find(call => call[0] === 'C:\\ducer\\jobs.json.tmp');
    expect(saveCall).toBeDefined();
    const savedJobs = JSON.parse(saveCall![1] as string);
    
    const staleJob = savedJobs.find((j: any) => j.id === 'job-stale');
    const freshJob = savedJobs.find((j: any) => j.id === 'job-fresh');

    expect(staleJob.status).toBe('pending');
    expect(freshJob.status).toBe('running');
  });

  it('does not cancel completed jobs', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify([
        {
          id: 'job-1',
          type: 'analysis',
          payload: {},
          status: 'completed',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );

    const queue = new JobQueue('C:\\ducer\\jobs.json');
    expect(queue.cancelJob('job-1')).toBe(false);
  });
});
