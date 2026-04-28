/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { DucerCore } from './ducer_core.js';
import { logger } from './logger.js';

/**
 * A single step in a pipeline execution.
 */
export interface PipelineStep {
  id: string; // unique identifier: "step_1_analyze"
  tool: string; // tool name: "analyze_file"
  args: Record<string, unknown>; // { file: "...", mode: "lite" }
  prerequisites?: string[]; // step IDs that must complete first
  optional?: boolean; // continue if this step fails
  description?: string; // "Analyze input file"
}

/**
 * A complete pipeline definition.
 */
export interface PipelineDefinition {
  name: string; // "normalize", "remix", "mastering"
  description: string; // "Normalize audio to -14 LUFS with EQ + Comp + Limiter"
  steps: PipelineStep[];
  timeout_seconds: number; // total timeout for all steps
  allow_step_failures: boolean; // continue on non-optional step failure?
}

/**
 * Result of executing one step.
 */
export interface StepResult {
  step_id: string;
  tool: string;
  success: boolean;
  output: string; // tool's return value
  duration_ms: number;
  error?: string;
}

/**
 * Complete pipeline execution result.
 */
export interface PipelineResult {
  pipeline_name: string;
  success: boolean;
  steps_executed: number;
  steps_failed: number;
  step_results: StepResult[];
  total_duration_ms: number;
  summary: string; // final report text
}

/**
 * PREDEFINED PIPELINES - each task maps to a pipeline.
 */
export const PIPELINES: Record<string, PipelineDefinition> = {
  normalize: {
    name: 'normalize',
    description:
      'Normalize audio to streaming standard (-14 LUFS) with EQ, compression, and limiting.',
    steps: [
      {
        id: 'step_1_analyze',
        tool: 'visualize_audio_features',
        args: { viz: 'loudness,spectrogram' },
        description: 'Analyze input file for loudness and frequency content',
        optional: false,
      },
      {
        id: 'step_2_route',
        tool: 'execute_lua_script',
        args: {
          code: '-- Create routing for normalization\nreaper.Main_OnCommand(40001, 0) -- Example',
        },
        prerequisites: ['step_1_analyze'],
        description: 'Create parallel compression and limiting buses',
        optional: false,
      },
      {
        id: 'step_3_fx',
        tool: 'execute_reaper_action',
        args: { action_id: '40008' }, // Example: Normalize
        prerequisites: ['step_2_route'],
        description: 'Apply EQ, compression, and limiting based on analysis',
        optional: false,
      },
      {
        id: 'step_4_meter_post',
        tool: 'get_reaper_status',
        args: { full_scan: true },
        prerequisites: ['step_3_fx'],
        description: 'Measure final loudness and peak levels',
        optional: true,
      },
    ],
    timeout_seconds: 30,
    allow_step_failures: false,
  },

  remix: {
    name: 'remix',
    description:
      'Separate audio into stems (vocals, drums, bass, other) and import into DAW.',
    steps: [
      {
        id: 'step_1_separate',
        tool: 'separate_stems',
        args: { backend: 'demucs', preset: 'standard' },
        description: 'Separate stems using Demucs',
        optional: false,
      },
      {
        id: 'step_2_route',
        tool: 'execute_lua_script',
        args: {
          code: '-- Create 4 tracks for stems\nfor i=0,3 do reaper.InsertTrackAtIndex(i, true) end',
        },
        prerequisites: ['step_1_separate'],
        description: 'Create 4 tracks with proper gain staging and routing',
        optional: false,
      },
    ],
    timeout_seconds: 120,
    allow_step_failures: false,
  },
};

/**
 * PipelineOrchestrator: Executes pipelines step-by-step without user interruption.
 */
export class PipelineOrchestrator {
  constructor(private ducerCore: DucerCore) {}

  /**
   * Execute a complete pipeline.
   * Automatically orders steps by dependencies and executes them.
   * NO user prompts during execution.
   */
  async executePipeline(
    pipelineDefn: PipelineDefinition,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const results: StepResult[] = [];
    const executedSteps = new Set<string>();

    logger.info('pipeline_started', { pipeline: pipelineDefn.name });
    console.log(`\n[Ducer] Executing pipeline: ${pipelineDefn.name}`);
    console.log(
      `[Ducer] Plan: ${pipelineDefn.steps.map((s) => s.description).join(' → ')}\n`,
    );

    let stepsFailed = 0;

    for (const step of pipelineDefn.steps) {
      // Check if prerequisites are met
      if (step.prerequisites) {
        const allMet = step.prerequisites.every((prereq) =>
          executedSteps.has(prereq),
        );
        if (!allMet) {
          logger.warn('pipeline_step_skipped', {
            step: step.id,
            reason: 'prerequisites_not_met',
          });
          continue;
        }
      }

      // Execute step
      const stepStartTime = Date.now();
      console.log(`[Ducer] Step ${step.id}: ${step.description}...`);

      try {
        const output = await this.ducerCore.dispatchTool({
          name: step.tool,
          args: JSON.stringify(step.args),
        });

        const duration = Date.now() - stepStartTime;
        results.push({
          step_id: step.id,
          tool: step.tool,
          success: true,
          output: typeof output === 'string' ? output : JSON.stringify(output),
          duration_ms: duration,
        });

        executedSteps.add(step.id);
        console.log(`[Ducer] ✓ ${step.id} completed in ${duration}ms\n`);
      } catch (err) {
        const duration = Date.now() - stepStartTime;
        const errorMsg = err instanceof Error ? err.message : String(err);

        results.push({
          step_id: step.id,
          tool: step.tool,
          success: false,
          output: '',
          duration_ms: duration,
          error: errorMsg,
        });

        stepsFailed++;
        logger.error('pipeline_step_failed', {
          step: step.id,
          error: errorMsg,
        });

        if (!step.optional && !pipelineDefn.allow_step_failures) {
          console.error(`[Ducer] ✗ ${step.id} FAILED: ${errorMsg}`);
          console.error(
            `[Ducer] Pipeline execution STOPPED (non-optional step failed)`,
          );
          break;
        } else {
          console.warn(
            `[Ducer] ⚠ ${step.id} failed (optional, continuing): ${errorMsg}\n`,
          );
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const success = stepsFailed === 0 || pipelineDefn.allow_step_failures;

    // Generate summary
    const summary = this.generateSummary(pipelineDefn.name, results, success);

    return {
      pipeline_name: pipelineDefn.name,
      success,
      steps_executed: executedSteps.size,
      steps_failed: stepsFailed,
      step_results: results,
      total_duration_ms: totalDuration,
      summary,
    };
  }

  /**
   * Generate a human-readable summary of pipeline execution.
   */
  private generateSummary(
    pipelineName: string,
    results: StepResult[],
    success: boolean,
  ): string {
    if (success) {
      return `✅ ${pipelineName} pipeline completed successfully in ${(results.reduce((a, r) => a + r.duration_ms, 0) / 1000).toFixed(1)}s`;
    } else {
      const failed = results.filter((r) => !r.success);
      return `❌ ${pipelineName} pipeline failed. Failed steps: ${failed.map((r) => r.step_id).join(', ')}`;
    }
  }

  /**
   * Identify which pipeline matches a user query.
   */
  async identifyPipeline(
    userQuery: string,
  ): Promise<PipelineDefinition | null> {
    const lower = userQuery.toLowerCase();

    // Simple keyword matching (can be enhanced with LLM)
    if (lower.includes('normaliz')) {
      return PIPELINES['normalize'];
    } else if (
      lower.includes('remix') ||
      lower.includes('separ') ||
      lower.includes('stem')
    ) {
      return PIPELINES['remix'];
    }

    return null;
  }
}
