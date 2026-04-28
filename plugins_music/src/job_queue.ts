/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from './logger.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  error?: string;
  result?: unknown;
}

export class JobQueue {
  private queueFile: string;

  constructor(customQueueFile?: string) {
    if (customQueueFile) {
      this.queueFile = customQueueFile;
    } else {
      const ducerDir = path.join(os.homedir(), '.ducer');
      if (!fs.existsSync(ducerDir)) {
        fs.mkdirSync(ducerDir, { recursive: true });
      }
      this.queueFile = path.join(ducerDir, '_jobs.json');
    }

    if (!fs.existsSync(this.queueFile)) {
      this.saveJobs([]);
    }
  }

  private loadJobs(): Job[] {
    try {
      const content = fs.readFileSync(this.queueFile, 'utf8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private atomicWriteSync(filePath: string, content: string): void {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, content);
    fs.renameSync(tempPath, filePath);
  }

  private saveJobs(jobs: Job[]): void {
    const ducerDir = path.dirname(this.queueFile);
    if (!fs.existsSync(ducerDir)) {
      fs.mkdirSync(ducerDir, { recursive: true });
    }
    this.atomicWriteSync(this.queueFile, JSON.stringify(jobs, null, 2));
  }

  addJob(type: string, payload: Record<string, unknown>): Job {
    const jobs = this.loadJobs();
    const newJob: Job = {
      id: randomUUID(),
      type,
      payload,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
    };
    jobs.push(newJob);
    logger.info('job_enqueued', { type, payload }, { jobId: newJob.id });
    this.saveJobs(jobs);
    return newJob;
  }

  listJobs(): Job[] {
    return this.loadJobs();
  }

  cancelJob(id: string): boolean {
    const jobs = this.loadJobs();
    const job = jobs.find((j) => j.id === id);
    if (job && (job.status === 'pending' || job.status === 'running')) {
      job.status = 'cancelled';
      job.updatedAt = new Date().toISOString();
      this.saveJobs(jobs);
      return true;
    }
    return false;
  }

  updateJob(id: string, updates: Partial<Job>): void {
    const jobs = this.loadJobs();
    const jobIndex = jobs.findIndex((j) => j.id === id);
    if (jobIndex !== -1) {
      jobs[jobIndex] = { ...jobs[jobIndex], ...updates, updatedAt: new Date().toISOString() };
      this.saveJobs(jobs);
    }
  }

  claimNextPendingJob(): Job | undefined {
    const jobs = this.loadJobs();
    const job = jobs.find((j) => j.status === 'pending');
    if (!job) {
      return undefined;
    }

    job.status = 'running';
    job.attempts = (job.attempts || 0) + 1;
    job.updatedAt = new Date().toISOString();
    this.saveJobs(jobs);
    return { ...job };
  }

  getRunningJobs(): Job[] {
    const jobs = this.loadJobs();
    return jobs.filter((j) => j.status === 'running');
  }

  resetStaleJobs(maxAgeMs: number = 4 * 60 * 60 * 1000): void {
    const jobs = this.loadJobs();
    let changed = false;
    const now = Date.now();

    for (const job of jobs) {
      if (job.status === 'running') {
        const updatedAt = new Date(job.updatedAt).getTime();
        if (now - updatedAt > maxAgeMs) {
          job.status = 'pending';
          job.updatedAt = new Date().toISOString();
          changed = true;
        }
      }
    }

    if (changed) {
      this.saveJobs(jobs);
    }
  }
}
