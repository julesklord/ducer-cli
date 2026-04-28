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
    : argv.file
      ? [argv.file as string]
      : [];
  const isAdvanced = argv.advanced || false;
  const isLite = argv.lite || false;

  console.log('\n[DUCER] Producer Intelligence active.');

  if (subcommand === 'analyze') {
    const dirPath = argv.dir as string | undefined;
    if (filePaths.length === 0 && !dirPath) {
      console.error(
        'Error: You must provide at least one file path with --file [path] or a directory with --dir [path]',
      );
      return;
    }

    if (dirPath && !fs.existsSync(dirPath)) {
      console.error(`Error: Directory does not exist: ${dirPath}`);
      return;
    }

    const missingFiles = filePaths.filter((p) => !fs.existsSync(p));
    if (missingFiles.length > 0) {
      console.error(
        `Error: The following files do not exist: ${missingFiles.join(', ')}`,
      );
      return;
    }

    const mode = isAdvanced ? 'advanced' : isLite ? 'lite' : 'standard';
    const queueEnabled = config.ducerSettings?.background_jobs?.enabled ?? false;

    if (queueEnabled) {
      const queue = new JobQueue(config.ducerSettings?.background_jobs?.queue_file);
      const job = queue.addJob('analysis', {
        filePaths,
        dirPath,
        mode,
        isAdvanced,
      });
      console.log(`\n[Ducer] Analysis task queued. Job ID: ${job.id}`);
      console.log('[Ducer] Run "ducer daemon" to process the queue or "ducer jobs --status" to check progress.');
      return;
    }

    try {
      if (dirPath) {
        const result = await ducer.analyzeStemsDirectory(dirPath, mode, config);
        if (isAdvanced && result.comparativeReport) {
           await handleAdvancedArtifacts(result.comparativeReport, path.join(dirPath, "Comparative_Report"));
        }
      } else if (filePaths.length > 1) {
        const batchResults = await ducer.analyzeMultiple(
          filePaths,
          mode,
          config,
        );
        if (isAdvanced) {
          for (const res of batchResults.results) {
            if (res.success) await handleAdvancedArtifacts(res.response, res.file);
          }
        }
      } else {
        const filePath = filePaths[0];
        console.log(
          `[Ducer] Starting expert audit (${mode}): ${path.basename(filePath)}...`,
        );
        const fullResponse = await ducer.analyzeFile(filePath, mode, config);

        if (isAdvanced) {
          await handleAdvancedArtifacts(fullResponse, filePath);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Ducer] Error during analysis: ${message}`);
    }
  } else if (subcommand === 'separate') {
    if (filePaths.length === 0) {
      console.error(
        'Error: You must provide at least one file path with --file [path]',
      );
      return;
    }

    const missingFiles = filePaths.filter((p) => !fs.existsSync(p));
    if (missingFiles.length > 0) {
      console.error(
        `Error: The following files do not exist: ${missingFiles.join(', ')}`,
      );
      return;
    }

    const separationOptions = buildStemSeparationOptions(argv, config);
    const queueEnabled = config.ducerSettings?.background_jobs?.enabled ?? false;

    if (queueEnabled) {
      const queue = new JobQueue(config.ducerSettings?.background_jobs?.queue_file);
      const job = queue.addJob('stem-separation', {
        filePaths,
        separationOptions,
      });
      console.log(`\n[Ducer] Separation task queued. Job ID: ${job.id}`);
      console.log('[Ducer] Run "ducer daemon" to process the queue or "ducer jobs --status" to check progress.');
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
            console.error(`[Ducer] Error separating ${item.file}: ${item.error}`);
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
      console.error(`[Ducer] Error during stem separation: ${message}`);
    }
  } else if (subcommand === 'jobs') {
    const queue = new JobQueue(config.ducerSettings?.background_jobs?.queue_file);
    if (argv.status) {
      const jobs = queue.listJobs();
      console.log('\n[Ducer Jobs] Current queue:');
      if (jobs.length === 0) {
        console.log('  (No jobs found)');
      } else {
        jobs.forEach((job) => {
          console.log(
            `  - [${job.id}] ${job.type} (${job.status}) - ${job.createdAt}`,
          );
        });
      }
    } else if (argv.cancel) {
      const success = queue.cancelJob(argv.cancel);
      if (success) {
        console.log(`[Ducer Jobs] Job ${argv.cancel} cancelled.`);
      } else {
        console.error(
          `[Ducer Jobs] Error: Could not cancel job ${argv.cancel}.`,
        );
      }
    } else {
      console.log('Usage: ducer jobs --status or ducer jobs --cancel [id]');
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
      console.log(
        '\n[Ducer] Entering Interactive Producer Mode. (REAPER Linked)',
      );
      // Interactive mode integration with base CLI handled via core
    }
  } else {
    console.log(
      'Command not recognized. Use "ducer analyze", "ducer do", "ducer service", "ducer jobs" or "ducer daemon"',
    );
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
  console.log(
    `\n[Ducer] Service Mode Active. Listening for REAPER commands...`,
  );

  const scriptsDir = getReaperScriptsDir();
  const SERVICE_CMD_FILE = path.join(scriptsDir, 'ducer_commands.txt');
  const SERVICE_RESP_FILE = path.join(scriptsDir, 'ducer_response.txt');

  if (fs.existsSync(SERVICE_RESP_FILE)) atomicWriteSync(SERVICE_RESP_FILE, '');

  while (true) {
    if (fs.existsSync(SERVICE_CMD_FILE)) {
      const cmd = fs.readFileSync(SERVICE_CMD_FILE, 'utf8').trim();
      if (cmd !== '') {
        atomicWriteSync(SERVICE_CMD_FILE, '');
        console.log(`\n[Ducer Service] Incoming Command: ${cmd}`);

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
  console.log('[Ducer Daemon] Cleaning up stale jobs...');
  queue.resetStaleJobs();

  const maxParallel = config.ducerSettings?.background_jobs?.max_parallel ?? 2;
  const maxAttempts = 3;
  console.log(`[Ducer Daemon] Job queue processor active. Max parallel: ${maxParallel}`);

  while (true) {
    const running = queue.getRunningJobs();
    if (running.length < maxParallel) {
      const job = queue.claimNextPendingJob();
      if (job) {
        if (job.attempts > maxAttempts) {
          console.error(`[Ducer Daemon] Skipping job ${job.id} after ${job.attempts} failed attempts.`);
          logger.error('job_max_attempts_reached', { jobId: job.id, attempts: job.attempts });
          queue.updateJob(job.id, { status: 'failed', error: 'Exceeded maximum attempts.' });
          continue;
        }
        console.log(`[Ducer Daemon] Starting job: ${job.id} (${job.type})`);
        logger.info('job_started', { type: job.type }, { jobId: job.id });

        // Process in background
        (async () => {
          try {
            if (job.type === 'analysis') {
              const { filePaths, dirPath, mode, isAdvanced } = job.payload as any;
              if (dirPath) {
                const result = await ducer.analyzeStemsDirectory(dirPath, mode, config);
                if (isAdvanced && result.comparativeReport) {
                   await handleAdvancedArtifacts(result.comparativeReport, path.join(dirPath, "Comparative_Report"));
                }
                queue.updateJob(job.id, { status: 'completed', result: result.summary });
              } else if (filePaths.length > 1) {
                const batchResults = await ducer.analyzeMultiple(filePaths, mode, config);
                if (isAdvanced) {
                  for (const res of batchResults.results) {
                    if (res.success) await handleAdvancedArtifacts(res.response, res.file);
                  }
                }
                queue.updateJob(job.id, { status: 'completed', result: batchResults.summary });
              } else {
                const filePath = filePaths[0];
                const response = await ducer.analyzeFile(filePath, mode, config);
                if (isAdvanced) {
                  await handleAdvancedArtifacts(response, filePath);
                }
                queue.updateJob(job.id, { status: 'completed', result: 'Analysis completed successfully.' });
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
            } else {
              queue.updateJob(job.id, { status: 'failed', error: 'Unknown job type.' });
            }
            console.log(`[Ducer Daemon] Job completed: ${job.id}`);
            logger.info('job_completed', { type: job.type }, { jobId: job.id });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Ducer Daemon] Job failed: ${job.id} - ${msg}`);
            logger.error('job_failed', { type: job.type, error: msg }, { jobId: job.id });
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
  console.log(`\n[Ducer] Separation completed for ${path.basename(originalFile)}:`);
  console.log(`  -> Backend: ${result.backend}`);
  console.log(`  -> Preset: ${result.preset}`);
  console.log(`  -> Output: ${result.outputDir}`);
  console.log('  -> Expected stems:');
  for (const stem of result.stemFiles) {
    console.log(`     - ${stem}`);
  }
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

  console.log('\n[Ducer] Audit finished. Reports generated:');
  console.log(`  -> MD: ${baseFileName}.md`);
  console.log(`  -> HTML: ${baseFileName}.html`);
  console.log(`  -> Link: ${fileUrl}`);

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
      console.error('[Ducer] Could not open automatically: ' + err.message);
  });
}

export const ducerCommand = {
  command: 'ducer [subcommand] [queryPositional]',
  describe: 'Ducer Production Layer (Audio/MIDI analysis and generation)',
  builder: (yargs: Argv) => {
    return yargs
      .positional('subcommand', {
        type: 'string',
        describe: 'Ducer subcommand (analyze, separate, do, service, jobs, daemon)',
        choices: ['analyze', 'separate', 'do', 'service', 'jobs', 'daemon'],
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
      .option('dir', { alias: 'd', type: 'string', describe: 'Directory of stems to analyze' })
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
