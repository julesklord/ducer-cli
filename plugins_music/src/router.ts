/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from './logger.js';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import type { Argv } from 'yargs';
import { DucerCore } from './ducer_core.js';
import { JobQueue } from './job_queue.js';
import {
  ReaperBridgeClient,
  getReaperScriptsDir,
} from './reaper_bridge_client.js';
import { generatePremiumHTML } from './ui_generator.js';
import { DAW_CONTROL_PROMPT } from './prompts.js';
import type {
  StemSeparationBackend,
  StemSeparationOptions,
  StemSeparationPreset,
} from './stem_separator.js';

/**
 * Performs an atomic write by writing to a temporary file and then renaming it.
 */
function atomicWriteSync(filePath: string, content: string): void {
  const tempPath = filePath + '.tmp';
  fs.writeFileSync(tempPath, content);
  fs.renameSync(tempPath, filePath);
}

interface DucerConfig {
  getGeminiClient: () => unknown;
  getSessionId: () => string;
  ducerSettings: {
    background_jobs?: {
      enabled: boolean;
      max_parallel: number;
      queue_file?: string;
    };
    stem_separation?: {
      default_backend?: StemSeparationBackend;
      default_output_dir?: string;
      demucs_path?: string;
      uvr_path?: string;
      default_preset?: StemSeparationPreset;
    };
  };
}

interface DucerArgs {
  subcommand?: string;
  file?: string | string[];
  dir?: string;
  advanced?: boolean;
  lite?: boolean;
  query?: string;
  status?: boolean;
  cancel?: string;
  backend?: StemSeparationBackend;
  preset?: StemSeparationPreset;
  output?: string;
  model?: string;
  device?: 'cpu' | 'cuda' | 'mps';
  [key: string]: unknown;
}

function buildStemSeparationOptions(
  argv: DucerArgs,
  config: DucerConfig,
): StemSeparationOptions {
  const settings = config.ducerSettings?.stem_separation;
  const backend = argv.backend || settings?.default_backend || 'demucs';
  const preset = argv.preset || settings?.default_preset || 'standard';

  return {
    backend,
    preset,
    outputDir: argv.output || settings?.default_output_dir,
    model: argv.model as string | undefined,
    device: argv.device as 'cpu' | 'cuda' | 'mps' | undefined,
    executablePath:
      backend === 'demucs' ? settings?.demucs_path : settings?.uvr_path,
  };
}

/**
 * handleDucerCommand: CLI entry point for the music layer.
 * Delegates actual logic to the DucerCore identity.
 */
export async function handleDucerCommand(argv: DucerArgs, config: DucerConfig) {
  const bridge = new ReaperBridgeClient();
  const ducer = new DucerCore(bridge);
  const subcommand = argv.subcommand;
  const filePaths = Array.isArray(argv.file)
    ? (argv.file as string[])
    : typeof argv.file === 'string'
      ? [argv.file]
      : [];
  const isAdvanced = argv.advanced || false;
  const isLite = argv.lite || false;

  logger.info('ducer_active', { message: 'Producer Intelligence active.' });

  if (subcommand === 'analyze') {
    const dirPath = typeof argv.dir === 'string' ? argv.dir : undefined;
    if (filePaths.length === 0 && !dirPath) {
      logger.error('analysis_missing_path', {
        message:
          'Error: You must provide at least one file path with --file [path] or a directory with --dir [path]',
      });
      return;
    }

    if (dirPath && !fs.existsSync(dirPath)) {
      logger.error('directory_not_found', { path: dirPath });
      return;
    }

    const missingFiles = filePaths.filter((p) => !fs.existsSync(p));
    if (missingFiles.length > 0) {
      logger.error('files_not_found', { files: missingFiles });
      return;
    }

    const mode = isAdvanced ? 'advanced' : isLite ? 'lite' : 'standard';
    const queueEnabled =
      config.ducerSettings?.background_jobs?.enabled ?? false;

    if (queueEnabled) {
      const queue = new JobQueue(
        config.ducerSettings?.background_jobs?.queue_file,
      );
      const job = queue.addJob('analysis', {
        filePaths,
        dirPath,
        mode,
        isAdvanced,
      });
      logger.info('analysis_queued', { jobId: job.id, filePaths, dirPath });
      return;
    }

    try {
      if (dirPath) {
        const result = await ducer.analyzeStemsDirectory(dirPath, mode, config);
        if (isAdvanced && result.comparativeReport) {
          await handleAdvancedArtifacts(
            result.comparativeReport,
            path.join(dirPath, 'Comparative_Report'),
          );
        }
      } else if (filePaths.length > 1) {
        const batchResults = await ducer.analyzeMultiple(
          filePaths,
          mode,
          config,
        );
        if (isAdvanced) {
          for (const res of batchResults.results) {
            if (res.success)
              await handleAdvancedArtifacts(res.response, res.file);
          }
        }
      } else {
        const filePath = filePaths[0];
        logger.info('analysis_starting', {
          file: path.basename(filePath),
          mode,
        });
        const fullResponse = await ducer.analyzeFile(filePath, mode, config);

        if (isAdvanced) {
          await handleAdvancedArtifacts(fullResponse, filePath);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('analysis_error', { error: message });
    }
  } else if (subcommand === 'batch-normalize') {
    const dirPath = typeof argv.dir === 'string' ? argv.dir : undefined;
    if (filePaths.length === 0 && !dirPath) {
      logger.error('normalization_missing_path', {
        message:
          'Error: You must provide at least one file path with --file [path] or a directory with --dir [path]',
      });
      return;
    }

    const outputDir = typeof argv.output === 'string' ? argv.output : undefined;
    const queueEnabled =
      config.ducerSettings?.background_jobs?.enabled ?? false;

    if (queueEnabled) {
      const queue = new JobQueue(
        config.ducerSettings?.background_jobs?.queue_file,
      );
      const job = queue.addJob('normalization', {
        filePaths,
        dirPath,
        outputDir,
      });
      logger.info('normalization_queued', {
        jobId: job.id,
        filePaths,
        dirPath,
      });
      return;
    }

    try {
      if (dirPath) {
        const result = await ducer.normalizeDirectory(dirPath, outputDir);
        logger.info('normalization_complete', { summary: result.summary });
      } else {
        const result = await ducer.normalizeMultipleAudio(filePaths, outputDir);
        logger.info('normalization_complete', { summary: result.summary });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('normalization_error', { error: message });
    }
  } else if (subcommand === 'batch-convert') {
    const dirPath = typeof argv.dir === 'string' ? argv.dir : undefined;
    if (filePaths.length === 0 && !dirPath) {
      logger.error('conversion_missing_path', {
        message:
          'Error: You must provide at least one file path with --file [path] or a directory with --dir [path]',
      });
      return;
    }

    const format = (argv['format'] as string) || 'mp3';
    const outputDir = typeof argv.output === 'string' ? argv.output : undefined;
    const queueEnabled =
      config.ducerSettings?.background_jobs?.enabled ?? false;

    if (queueEnabled) {
      const queue = new JobQueue(
        config.ducerSettings?.background_jobs?.queue_file,
      );
      const job = queue.addJob('conversion', {
        filePaths,
        dirPath,
        format,
        outputDir,
      });
      logger.info('conversion_queued', { jobId: job.id, filePaths, dirPath });
      return;
    }

    try {
      if (dirPath) {
        const result = await ducer.convertDirectory(dirPath, format, outputDir);
        logger.info('conversion_complete', { summary: result.summary });
      } else {
        const result = await ducer.convertMultipleAudio(
          filePaths,
          format,
          outputDir,
        );
        logger.info('conversion_complete', { summary: result.summary });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('conversion_error', { error: message });
    }
  } else if (subcommand === 'separate') {
    if (filePaths.length === 0) {
      logger.error('separation_missing_path', {
        message: 'Error: You must provide at least one file path with --file [path]',
      });
      return;
    }

    const missingFiles = filePaths.filter((p) => !fs.existsSync(p));
    if (missingFiles.length > 0) {
      logger.error('files_not_found', { files: missingFiles });
      return;
    }

    const separationOptions = buildStemSeparationOptions(argv, config);
    const queueEnabled =
      config.ducerSettings?.background_jobs?.enabled ?? false;

    if (queueEnabled) {
      const queue = new JobQueue(
        config.ducerSettings?.background_jobs?.queue_file,
      );
      const job = queue.addJob('stem-separation', {
        filePaths,
        separationOptions,
      });
      logger.info('separation_queued', { jobId: job.id, filePaths });
      return;
    }

    try {
      if (filePaths.length > 1) {
        const batchResults = await ducer.separateMultipleStems(
          filePaths,
          separationOptions,
        );
        for (const item of batchResults.results) {
          if (item.success && item.result) {
            printStemSeparationResult(item.file, item.result);
          } else {
            logger.error('separation_item_error', {
              file: item.file,
              error: item.error,
            });
          }
        }
      } else {
        const result = await ducer.separateStems(
          filePaths[0],
          separationOptions,
        );
        printStemSeparationResult(filePaths[0], result);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('separation_error', { error: message });
    }
  } else if (subcommand === 'jobs') {
    const queue = new JobQueue(
      config.ducerSettings?.background_jobs?.queue_file,
    );
    if (argv.status) {
      const jobs = queue.listJobs();
      logger.info('jobs_status', { count: jobs.length, jobs });
    } else if (argv.cancel) {
      const jobId = String(argv.cancel);
      const success = queue.cancelJob(jobId);
      if (success) {
        logger.info('job_cancelled', { jobId });
      } else {
        logger.error('job_cancel_failed', { jobId });
      }
    } else {
      logger.info('jobs_usage', {
        message: 'Usage: ducer jobs --status or ducer jobs --cancel [id]',
      });
    }
  } else if (subcommand === 'daemon') {
    await runDaemon(ducer, config);
  } else if (subcommand === 'do' || !subcommand || subcommand === 'service') {
    // prepare context
    const context = DAW_CONTROL_PROMPT;
    const finalQuery =
      (argv.query as string) || (argv['queryPositional'] as string);

    if (subcommand === 'do' && finalQuery) {
      await ducer.getInsight(finalQuery, context, config);
    } else if (subcommand === 'service') {
      await runServiceLoop(ducer, context, config);
    } else {
      logger.info('interactive_mode_starting', {
        message: 'Entering Interactive Producer Mode. (REAPER Linked)',
      });
      // Interactive mode integration with base CLI handled via core
    }
    } else {
      logger.warn('command_not_recognized', { subcommand });
    }
}

/**
 * Professional service loop for DAW integration.
 */
async function runServiceLoop(
  ducer: DucerCore,
  context: string,
  config: DucerConfig,
) {
  logger.info('service_mode_active', {
    message: 'Service Mode Active. Listening for REAPER commands...',
  });

  const scriptsDir = getReaperScriptsDir();
  const SERVICE_CMD_FILE = path.join(scriptsDir, 'ducer_commands.txt');
  const SERVICE_RESP_FILE = path.join(scriptsDir, 'ducer_response.txt');

  if (fs.existsSync(SERVICE_RESP_FILE)) atomicWriteSync(SERVICE_RESP_FILE, '');

  while (true) {
    if (fs.existsSync(SERVICE_CMD_FILE)) {
      const cmd = fs.readFileSync(SERVICE_CMD_FILE, 'utf8').trim();
      if (cmd !== '') {
        atomicWriteSync(SERVICE_CMD_FILE, '');
        logger.info('service_incoming_command', { command: cmd });

        try {
          const response = await ducer.getInsight(cmd, context, config);
          atomicWriteSync(SERVICE_RESP_FILE, response);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          atomicWriteSync(SERVICE_RESP_FILE, `Error: ${msg}`);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

/**
 * Professional daemon for background job processing.
 */
async function runDaemon(ducer: DucerCore, config: DucerConfig) {
  const queue = new JobQueue(config.ducerSettings?.background_jobs?.queue_file);

  // Reset stale 'running' jobs to 'pending' on startup
  logger.info('daemon_starting', { message: 'Cleaning up stale jobs...' });
  queue.resetStaleJobs();

  const maxParallel = config.ducerSettings?.background_jobs?.max_parallel ?? 2;
  const maxAttempts = 3;
  logger.info('daemon_ready', {
    maxParallel,
    message: `Job queue processor active. Max parallel: ${maxParallel}`,
  });

  while (true) {
    const running = queue.getRunningJobs();
    if (running.length < maxParallel) {
      const job = queue.claimNextPendingJob();
      if (job) {
        if (job.attempts > maxAttempts) {
          logger.error('job_max_attempts_reached', {
            jobId: job.id,
            attempts: job.attempts,
          });
          queue.updateJob(job.id, {
            status: 'failed',
            error: 'Exceeded maximum attempts.',
          });
          continue;
        }
        logger.info('job_started', { type: job.type }, { jobId: job.id });

        // Process in background
        (async () => {
          try {
            if (job.type === 'analysis') {
              const { filePaths, dirPath, mode, isAdvanced } = job.payload as {
                filePaths: string[];
                dirPath?: string;
                mode: 'lite' | 'advanced';
                isAdvanced: boolean;
              };
              if (dirPath) {
                const result = await ducer.analyzeStemsDirectory(
                  dirPath,
                  mode,
                  config,
                );
                if (isAdvanced && result.comparativeReport) {
                  await handleAdvancedArtifacts(
                    result.comparativeReport,
                    path.join(dirPath, 'Comparative_Report'),
                  );
                }
                queue.updateJob(job.id, {
                  status: 'completed',
                  result: result.summary,
                });
              } else if (filePaths.length > 1) {
                const batchResults = await ducer.analyzeMultiple(
                  filePaths,
                  mode,
                  config,
                );
                if (isAdvanced) {
                  for (const res of batchResults.results) {
                    if (res.success)
                      await handleAdvancedArtifacts(res.response, res.file);
                  }
                }
                queue.updateJob(job.id, {
                  status: 'completed',
                  result: batchResults.summary,
                });
              } else {
                const filePath = filePaths[0];
                const response = await ducer.analyzeFile(
                  filePath,
                  mode,
                  config,
                );
                if (isAdvanced) {
                  await handleAdvancedArtifacts(response, filePath);
                }
                queue.updateJob(job.id, {
                  status: 'completed',
                  result: 'Analysis completed successfully.',
                });
              }
            } else if (job.type === 'stem-separation') {
              const { filePaths, separationOptions } = job.payload as {
                filePaths: string[];
                separationOptions: StemSeparationOptions;
              };

              if (filePaths.length > 1) {
                const batchResults = await ducer.separateMultipleStems(
                  filePaths,
                  separationOptions,
                );
                queue.updateJob(job.id, {
                  status: 'completed',
                  result: batchResults.summary,
                });
              } else {
                const result = await ducer.separateStems(
                  filePaths[0],
                  separationOptions,
                );
                queue.updateJob(job.id, {
                  status: 'completed',
                  result: result.outputDir,
                });
              }
            } else if (job.type === 'normalization') {
              const { filePaths, dirPath, outputDir } = job.payload as {
                filePaths: string[];
                dirPath?: string;
                outputDir?: string;
              };

              if (dirPath) {
                const result = await ducer.normalizeDirectory(
                  dirPath,
                  outputDir,
                );
                queue.updateJob(job.id, {
                  status: 'completed',
                  result: result.summary,
                });
              } else {
                const result = await ducer.normalizeMultipleAudio(
                  filePaths,
                  outputDir,
                );
                queue.updateJob(job.id, {
                  status: 'completed',
                  result: result.summary,
                });
              }
            } else if (job.type === 'conversion') {
              const { filePaths, dirPath, format, outputDir } = job.payload as {
                filePaths: string[];
                dirPath?: string;
                format: string;
                outputDir?: string;
              };

              if (dirPath) {
                const result = await ducer.convertDirectory(
                  dirPath,
                  format,
                  outputDir,
                );
                queue.updateJob(job.id, {
                  status: 'completed',
                  result: result.summary,
                });
              } else {
                const result = await ducer.convertMultipleAudio(
                  filePaths,
                  format,
                  outputDir,
                );
                queue.updateJob(job.id, {
                  status: 'completed',
                  result: result.summary,
                });
              }
            } else {
              queue.updateJob(job.id, {
                status: 'failed',
                error: 'Unknown job type.',
              });
            }
            logger.info('job_completed', { type: job.type }, { jobId: job.id });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(
              'job_failed',
              { type: job.type, error: msg },
              { jobId: job.id },
            );
            queue.updateJob(job.id, { status: 'failed', error: msg });
          }
        })();
      }
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

function printStemSeparationResult(
  originalFile: string,
  result: {
    backend: StemSeparationBackend;
    preset: StemSeparationPreset;
    outputDir: string;
    stemFiles: string[];
  },
) {
  logger.info('separation_result', {
    file: path.basename(originalFile),
    backend: result.backend,
    preset: result.preset,
    output: result.outputDir,
    stems: result.stemFiles,
  });
}

/**
 * Handles saving and opening the advanced reporting artifacts.
 */
async function handleAdvancedArtifacts(content: string, originalFile: string) {
  const baseFileName =
    'Ducer_Report_' +
    path.basename(originalFile, path.extname(originalFile)) +
    '_' +
    Date.now();
  const rootReportDir = path.join(process.cwd(), 'reports');

  if (!fs.existsSync(rootReportDir))
    fs.mkdirSync(rootReportDir, { recursive: true });

  // 1. Save Markdown
  fs.writeFileSync(path.join(rootReportDir, baseFileName + '.md'), content);

  // 2. Generate and Save HTML Premium
  const htmlContent = generatePremiumHTML(content, path.basename(originalFile));
  const htmlPath = path.join(rootReportDir, baseFileName + '.html');
  fs.writeFileSync(htmlPath, htmlContent);

  const fileUrl = pathToFileURL(htmlPath).href;

  logger.info('audit_finished', {
    baseFileName,
    htmlPath,
    fileUrl,
  });

  // 3. Open in Browser
  const opener =
    process.platform === 'win32'
      ? 'start'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';
  const command =
    process.platform === 'win32'
      ? `${opener} "" "${htmlPath}"`
      : `${opener} "${htmlPath}"`;

  exec(command, (err) => {
    if (err)
      logger.error('report_open_failed', { error: err.message });
  });
}

export const ducerCommand = {
  command: 'ducer [subcommand] [queryPositional]',
  describe: 'Ducer Production Layer (Audio/MIDI analysis and generation)',
  builder: (yargs: Argv) => {
    return yargs
      .positional('subcommand', {
        type: 'string',
        describe:
          'Ducer subcommand (analyze, separate, batch-normalize, batch-convert, do, service, jobs, daemon)',
        choices: [
          'analyze',
          'separate',
          'batch-normalize',
          'batch-convert',
          'do',
          'service',
          'jobs',
          'daemon',
        ],
      })
      .positional('queryPositional', {
        type: 'string',
        describe: 'Natural language query (do mode only)',
      })
      .option('file', {
        alias: 'f',
        type: 'array',
        describe: 'Path to audio/MIDI file(s) to process',
      })
      .option('dir', {
        alias: 'd',
        type: 'string',
        describe: 'Directory of stems to analyze',
      })
      .option('advanced', {
        alias: 'a',
        type: 'boolean',
        describe: 'Generate advanced report (HTML Premium)',
        default: false,
      })
      .option('lite', {
        alias: 'l',
        type: 'boolean',
        describe: 'Generate concise technical summary',
        default: false,
      })
      .option('query', {
        alias: 'q',
        type: 'string',
        describe: 'Natural language query for do mode',
      })
      .option('backend', {
        type: 'string',
        choices: ['demucs', 'uvr'],
        describe: 'Stem separation backend',
      })
      .option('preset', {
        type: 'string',
        choices: ['standard', 'high-quality', 'vocals', 'karaoke'],
        describe: 'Separation preset',
      })
      .option('output', {
        type: 'string',
        describe: 'Output directory for stems',
      })
      .option('format', {
        type: 'string',
        describe: 'Target format for conversion (mp3, wav, flac, etc.)',
        default: 'mp3',
      })
      .option('model', {
        type: 'string',
        describe: 'Specific backend model if applicable',
      })
      .option('device', {
        type: 'string',
        choices: ['cpu', 'cuda', 'mps'],
        describe: 'Execution device for the backend',
      })
      .option('status', {
        type: 'boolean',
        describe: 'List all jobs (jobs only)',
      })
      .option('cancel', {
        type: 'string',
        describe: 'Cancel a job by ID (jobs only)',
      });
  },
};
