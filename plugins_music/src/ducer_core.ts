/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from './logger.js';
import fs from 'node:fs';
import path from 'node:path';
import { MusicMediaHandler } from './media_handler.js';
import { AudioAnalyzer } from './audio_analyzer.js';
import { MusicToolsManager } from './tools_manager.js';
import type { DawBridge } from './bridge_interface.js';
import {
  DUCER_CORE_PROMPT,
  DAW_CONTROL_PROMPT,
  ADVANCED_ANALYSIS_ADDON,
  LITE_ANALYSIS_ADDON,
  AGENTIC_MODE_PROMPT,
} from './prompts.js';
import { CompatibilityShield } from './compatibility_check.js';
import { ScriptManager } from './script_manager.js';
import {
  StemSeparationManager,
  type StemSeparationOptions,
  type StemSeparationResult,
} from './stem_separator.js';
import { PipelineOrchestrator } from './pipeline_orchestrator.js';

/**
 * Returns the correct MIME type for the file extension.
 * Gemini 1.5 Pro accepts audio/wav, audio/mp3, audio/aiff, audio/ogg, audio/flac.
 */
function getAudioMediaType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mediaTypeMap: Record<string, string> = {
    '.wav': 'audio/wav',
    '.wave': 'audio/wav',
    '.mp3': 'audio/mp3',
    '.mp4': 'audio/mp4',
    '.aiff': 'audio/aiff',
    '.aif': 'audio/aiff',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
  };
  return mediaTypeMap[ext] || 'audio/wav';
}

export interface DucerConfig {
  getGeminiClient: () => unknown;
  getSessionId: () => string;
}

/**
 * DucerCore: The "Producer Brain" of the system.
 * Encapsulates all domain logic to provide a portable, complex identity.
 */
export class DucerCore {
  private mediaHandler: MusicMediaHandler;
  private audioAnalyzer: AudioAnalyzer;
  private toolsManager: MusicToolsManager;
  private bridge: DawBridge;
  private scriptManager: ScriptManager;
  private stemSeparationManager: StemSeparationManager;
  private currentGeminiClient: {
    sendMessageStream: (
      input: unknown[],
      signal: AbortSignal,
      sessionId: string,
      toolDeclarations: unknown[],
      flag: boolean,
      label: string,
    ) => AsyncIterable<{
      type: string;
      value: string | { name: string; args: string };
    }>;
  } | null = null;

  private readonly actionsDbPath: string;

  constructor(bridge: DawBridge) {
    this.mediaHandler = new MusicMediaHandler();
    this.audioAnalyzer = new AudioAnalyzer();
    this.toolsManager = new MusicToolsManager();
    this.bridge = bridge;
    this.scriptManager = new ScriptManager();
    this.stemSeparationManager = new StemSeparationManager();
    this.actionsDbPath = path.join(
      process.cwd(),
      'ducer-skills',
      'reaper-control',
      'knowledge',
      'db',
      'actions.json',
    );

    // Ensure DB dir exists
    const dbDir = path.dirname(this.actionsDbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    if (!fs.existsSync(this.actionsDbPath))
      fs.writeFileSync(this.actionsDbPath, '{}');
  }

  /**
   * Generates a modular system prompt based on required context.
   */
  private getSystemPrompt(mode: 'command' | 'advanced' | 'lite'): string {
    let prompt =
      DUCER_CORE_PROMPT +
      '\n' +
      AGENTIC_MODE_PROMPT +
      '\n' +
      DAW_CONTROL_PROMPT;
    if (mode === 'advanced') prompt += '\n' + ADVANCED_ANALYSIS_ADDON;
    if (mode === 'lite') prompt += '\n' + LITE_ANALYSIS_ADDON;
    return prompt;
  }

  private async runToolAwareLoop(
    initialParts: unknown[],
    sessionId: string,
    toolDeclarations: unknown[],
    engineLabel: string,
    enrichToolCall?: (call: { name: string; args: string }) => {
      name: string;
      args: string;
    },
  ): Promise<string> {
    if (!this.currentGeminiClient) {
      throw new Error(
        'Gemini client is not initialized for the active Ducer flow.',
      );
    }

    let fullResponse = '';
    let currentMessages: Array<{ role: string; parts: unknown[] }> = [
      { role: 'user', parts: initialParts },
    ];
    let turnCount = 0;

    while (turnCount < 10) {
      turnCount++;
      const currentParts = currentMessages[0]?.parts || [];
      const responseStream = this.currentGeminiClient.sendMessageStream(
        currentParts,
        new AbortController().signal,
        sessionId,
        toolDeclarations,
        false,
        engineLabel,
      );

      const toolCallsThisTurn: Array<{ name: string; args: string }> = [];

      for await (const event of responseStream) {
        if (event.type === 'content' && typeof event.value === 'string') {
          process.stdout.write(event.value);
          fullResponse += event.value;
        }
        if (
          event.type === 'tool-call' &&
          typeof event.value === 'object' &&
          event.value !== null &&
          'name' in event.value &&
          'args' in event.value
        ) {
          toolCallsThisTurn.push(event.value as { name: string; args: string });
        }
      }

      if (toolCallsThisTurn.length === 0) {
        return fullResponse;
      }

      const toolResultParts: unknown[] = [];
      for (const rawCall of toolCallsThisTurn) {
        const call = enrichToolCall ? enrichToolCall(rawCall) : rawCall;
        console.log(`\n[Ducer] Executing: ${call.name}...`);
        const result = await this.dispatchTool(call);
        console.log(`[Ducer] Result for ${call.name} obtained.`);
        toolResultParts.push({
          text: `[RESULTADO TOOL ${call.name}]: ${result}`,
        });
      }

      currentMessages = [{ role: 'user', parts: toolResultParts }];
    }

    console.warn(`[Ducer] Turn limit reached in ${engineLabel}.`);
    return fullResponse;
  }

  /**
   * Main entry point for any "insight" request (natural language query).
   */
  async getInsight(
    query: string,
    context: string,
    config: DucerConfig,
    mode: 'command' | 'advanced' | 'lite' = 'command',
  ): Promise<string> {
    // NEW: Check if this query triggers a known pipeline
    const orchestrator = new PipelineOrchestrator(this);
    const matchedPipeline = await orchestrator.identifyPipeline(query);

    if (matchedPipeline) {
      console.log(
        `\n[Ducer-Core] Query matched pipeline: "${matchedPipeline.name}"`,
      );
      const result = await orchestrator.executePipeline(matchedPipeline);
      return (
        result.summary +
        '\n\n' +
        result.step_results
          .map(
            (r) =>
              `${r.step_id} (${r.tool}): ${r.output.substring(0, 100)}${r.output.length > 100 ? '...' : ''}`,
          )
          .join('\n')
      );
    }

    const geminiClient = config.getGeminiClient();
    CompatibilityShield.validateGeminiClient(geminiClient);

    const sessionId = config.getSessionId();
    const systemPrompt = this.getSystemPrompt(mode) + '\n\n' + context;
    const toolDeclarations = this.toolsManager.getMusicToolsDeclarations();

    console.log(`[Ducer] Processing query: "${query}"`);
    this.currentGeminiClient = geminiClient as typeof this.currentGeminiClient;

    return this.runToolAwareLoop(
      [{ text: systemPrompt + '\n\nUSER: ' + query }],
      sessionId,
      toolDeclarations,
      'Ducer Insight Engine',
    );
  }
  /**
   * Dispatches music-specific tool calls.
   */
  public async dispatchTool(call: {
    name: string;
    args: string;
  }): Promise<string> {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(call.args);
    } catch (parseError) {
      const errorMsg =
        parseError instanceof Error ? parseError.message : String(parseError);
      console.error(`[Ducer-Core] Failed to parse tool arguments: ${errorMsg}`);
      return `Error: Invalid tool arguments JSON - ${errorMsg}`;
    }

    console.log(`\n[Ducer-Core] Dispatching Tool: ${call.name}`);

    try {
      switch (call.name) {
        case 'visualize_audio_features':
          return JSON.stringify(
            await this.audioAnalyzer.visualize(
              (args['filePath'] as string) || '',
              args,
            ),
          );

        case 'transcribe_vocals':
          return JSON.stringify(
            await this.audioAnalyzer.transcribe(
              (args['filePath'] as string) || '',
            ),
          );

        case 'execute_reaper_action': {
          const actionIdRaw = args['action_id'];
          if (!actionIdRaw || typeof actionIdRaw !== 'string') {
            return 'Error: Missing or invalid action_id. Expected a string.';
          }
          const idToExecute = this.resolveActionId(actionIdRaw);

          // Anti-Hallucination: Verify if NOT in our local registry
          if (!this.isInRegistry(idToExecute)) {
            console.log(
              `[Ducer-Core] Unknown ID detected (${idToExecute}). Verifying with REAPER...`,
            );
            const validation = await this.bridge.validateAction(idToExecute);
            if (!validation.valid) {
              console.log(
                `[Ducer-Core] Hallucination detected. Attempting semantic fallback for: ${args['action_id']}`,
              );
              return await this.semanticSearchFallback(
                args['action_id'] as string,
              );
            }
          }
          return await this.bridge.executeAction(idToExecute);
        }

        case 'learn_workflow_macro':
          return await this.learnMacro(
            args['name'] as string,
            args['action_id'] as string,
          );

        case 'get_learned_actions':
          return fs.readFileSync(this.actionsDbPath, 'utf8');

        case 'search_actions': {
          return await this.performAdvancedSearch(args['query'] as string);
        }

        case 'execute_lua_script': {
          if (this.bridge.executeScript) {
            return await this.bridge.executeScript(args['code'] as string);
          }
          return 'Error: Scripting not supported by current DAW bridge.';
        }

        case 'install_producer_toolset': {
          if (!this.scriptManager.supportsRemoteInstall()) {
            return '[ScriptManager] Remote toolset installation is intentionally unavailable until a verified registry and integrity checks are implemented.';
          }
          return await this.scriptManager.installToolset(
            args['author'] as string,
          );
        }

        case 'get_reaper_status': {
          const status = await this.bridge.getStatus();
          return status ? JSON.stringify(status) : 'Error: DAW disconnected';
        }

        default:
          return `Error: Tool ${call.name} not handled by DucerCore.`;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error in Ducer Sensory Tool: ${msg}`;
    }
  }

  private isInRegistry(id: string): boolean {
    try {
      const registry = JSON.parse(
        fs.readFileSync(
          path.join(
            process.cwd(),
            'ducer-skills',
            'reaper-control',
            'knowledge',
            'db',
            'semantic_registry.json',
          ),
          'utf8',
        ),
      );
      return registry.actions.some((a: { id: string }) => a.id === id);
    } catch {
      return false;
    }
  }

  private async semanticSearchFallback(query: string): Promise<string> {
    const registry = JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          'ducer-skills',
          'reaper-control',
          'knowledge',
          'db',
          'semantic_registry.json',
        ),
        'utf8',
      ),
    );
    const matches = registry.actions.filter(
      (a: { tags: string[]; name: string; id: string }) =>
        a.tags.some((t: string) => query.toLowerCase().includes(t)) ||
        a.name.toLowerCase().includes(query.toLowerCase()),
    );

    if (matches.length > 0) {
      return `Hallucinated ID detected. Ducer suggests these real actions:\n${matches.map((m: { name: string; id: string }) => `- ${m.name} (ID: ${m.id})`).join('\n')}`;
    }
    return `Error: Could not validate ID ${query} nor find a semantic alternative in local registry.`;
  }

  private async performAdvancedSearch(query: string): Promise<string> {
    const registryPath = path.join(
      process.cwd(),
      'ducer-skills',
      'reaper-control',
      'knowledge',
      'db',
      'semantic_registry.json',
    );
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const learnedDb = JSON.parse(fs.readFileSync(this.actionsDbPath, 'utf8'));

    const localResults = registry.actions.filter(
      (a: { name: string; tags: string[] }) =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.tags.some((t: string) => t.includes(query.toLowerCase())),
    );

    const learnedResults = Object.keys(learnedDb)
      .filter((k) => k.includes(query.toLowerCase()))
      .map((k) => ({ name: `[learned] ${k}`, id: learnedDb[k] as string }));

    const allResults = [...localResults, ...learnedResults];

    return allResults.length > 0
      ? JSON.stringify(allResults.map((r) => ({ name: r.name, id: r.id })))
      : 'No actions found in registry or learned database.';
  }

  private resolveActionId(idOrName: string): string {
    if (!idOrName) return '';
    try {
      if (!fs.existsSync(this.actionsDbPath)) return idOrName;
      const db = JSON.parse(fs.readFileSync(this.actionsDbPath, 'utf8'));
      return db[idOrName.toLowerCase()] || idOrName;
    } catch (error: unknown) {
      console.warn(
        `[DucerCore] Failed to resolve action ID: ${error instanceof Error ? error.message : String(error)}`,
      );
      return idOrName;
    }
  }

  private async learnMacro(name: string, id: string): Promise<string> {
    const db = JSON.parse(fs.readFileSync(this.actionsDbPath, 'utf8'));
    db[name.toLowerCase()] = id;
    fs.writeFileSync(this.actionsDbPath, JSON.stringify(db, null, 2));
    return `✅ Ducer has learned the macro: "${name}" -> ${id}`;
  }

  /**
   * Performs an initial expert audit of an audio file.
   */
  async analyzeFile(
    filePath: string,
    mode: 'standard' | 'advanced' | 'lite',
    config: DucerConfig,
  ): Promise<string> {
    logger.info('analysis_started', { filePath, mode });
    const validation = this.mediaHandler.validateFile(filePath);
    if (!validation.valid) {
      throw new Error(`Validation Error: ${validation.error}`);
    }

    // Read audio file and convert to base64
    const audioBytes = fs.readFileSync(filePath);
    const audioBase64 = audioBytes.toString('base64');
    const mediaType = getAudioMediaType(filePath);
    const fileName = path.basename(filePath);

    console.log(
      `[Ducer] Audio loaded: ${fileName} (${(audioBytes.length / 1024 / 1024).toFixed(2)} MB, ${mediaType})`,
    );

    const geminiClient = config.getGeminiClient();
    CompatibilityShield.validateGeminiClient(geminiClient);

    const sessionId = config.getSessionId();
    const analysisMode =
      mode === 'advanced' ? 'advanced' : mode === 'lite' ? 'lite' : 'command';
    const systemPrompt = this.getSystemPrompt(analysisMode);
    const toolDeclarations = this.toolsManager.getMusicToolsDeclarations();

    const textPrompt = `${systemPrompt}

Analyze this audio file technically and artistically in ${mode} mode.
File: ${fileName}

Provide:
1. Spectral and dynamics analysis
2. Tonal balance evaluation
3. Mix and production observations
4. Concrete improvement recommendations`;

    // Build multimodal message: text + audio as inline_data base64
    const multimodalMessage = [
      {
        inlineData: {
          mimeType: mediaType,
          data: audioBase64,
        },
      },
      { text: textPrompt },
    ];

    this.currentGeminiClient = geminiClient as typeof this.currentGeminiClient;

    const response = await this.runToolAwareLoop(
      multimodalMessage,
      sessionId,
      toolDeclarations,
      'Ducer Audio Analyzer',
      (call) => {
        let callArgs: Record<string, unknown> = {};
        try {
          callArgs = JSON.parse(call.args);
        } catch {
          callArgs = {};
        }
        if (!callArgs['filePath']) {
          callArgs['filePath'] = filePath;
        }
        return {
          name: call.name,
          args: JSON.stringify(callArgs),
        };
      },
    );

    logger.info('analysis_completed', { filePath, mode });
    return response;
  }

  /**
   * Refactor A.2: Batch Processing for multiple files.
   */
  async analyzeMultiple(
    filePaths: string[],
    mode: 'standard' | 'advanced' | 'lite',
    config: DucerConfig,
  ): Promise<{
    results: Array<{ file: string; response: string; success: boolean }>;
    summary: string;
    totalDurationSeconds: number;
  }> {
    const startTime = Date.now();
    const results: Array<{ file: string; response: string; success: boolean }> =
      [];

    console.log(
      `\n[Ducer] Starting batch processing of ${filePaths.length} files...`,
    );

    // Using allSettled so individual failures don't stop the whole batch
    const tasks = filePaths.map(async (filePath) => {
      try {
        const response = await this.analyzeFile(filePath, mode, config);
        return { file: filePath, response, success: true };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return { file: filePath, response: `Error: ${msg}`, success: false };
      }
    });

    const settledResults = await Promise.allSettled(tasks);

    for (const res of settledResults) {
      if (res.status === 'fulfilled') {
        results.push(res.value);
      } else {
        // This shouldn't happen with the internal try/catch, but for safety
        results.push({
          file: 'Unknown',
          response: `Fatal error in task`,
          success: false,
        });
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    const successCount = results.filter((r) => r.success).length;
    const summary = `${successCount}/${filePaths.length} files analyzed successfully in ${duration.toFixed(1)}s.`;

    console.log(`\n[Ducer] Batch Summary: ${summary}`);
    return { results, summary, totalDurationSeconds: duration };
  }

  async separateStems(
    filePath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult> {
    logger.info('stem_separation_started', {
      filePath,
      backend: options.backend,
    });
    const validation =
      this.mediaHandler.validateAudioFileForLocalProcessing(filePath);
    if (!validation.valid) {
      throw new Error(`Validation Error: ${validation.error}`);
    }

    console.log(
      `[Ducer] Starting stem separation (${options.backend}/${options.preset ?? 'standard'}): ${path.basename(filePath)}...`,
    );
    const result = await this.stemSeparationManager.separate(filePath, options);
    logger.info('stem_separation_completed', {
      filePath,
      backend: options.backend,
    });
    return result;
  }

  async separateMultipleStems(
    filePaths: string[],
    options: StemSeparationOptions,
  ): Promise<{
    results: Array<{
      file: string;
      success: boolean;
      result?: StemSeparationResult;
      error?: string;
    }>;
    summary: string;
  }> {
    const tasks = filePaths.map(async (filePath) => {
      try {
        const result = await this.separateStems(filePath, options);
        return { file: filePath, success: true, result };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { file: filePath, success: false, error: message };
      }
    });

    const results = await Promise.all(tasks);
    const successCount = results.filter((item) => item.success).length;
    const summary = `${successCount}/${filePaths.length} files processed successfully for stem separation.`;

    console.log(`\n[Ducer] Stem Separation Summary: ${summary}`);
    return { results, summary };
  }

  /**
   * Normalizes a single audio file.
   */
  async normalizeAudio(filePath: string, outputDir?: string): Promise<string> {
    const fileName = path.basename(filePath);
    const baseDir = outputDir || path.dirname(filePath);
    const normalizedDir = outputDir
      ? baseDir
      : path.join(baseDir, 'normalized');

    if (!fs.existsSync(normalizedDir)) {
      fs.mkdirSync(normalizedDir, { recursive: true });
    }

    const outputPath = path.join(normalizedDir, fileName);
    logger.info('normalization_started', { filePath, outputPath });

    await this.mediaHandler.normalizeAudio(filePath, outputPath);

    logger.info('normalization_completed', { filePath, outputPath });
    return outputPath;
  }

  /**
   * Converts a single audio file to another format.
   */
  async convertAudio(
    filePath: string,
    format: string,
    outputDir?: string,
  ): Promise<string> {
    const fileName =
      path.basename(filePath, path.extname(filePath)) + `.${format}`;
    const baseDir = outputDir || path.dirname(filePath);
    const convertedDir = outputDir ? baseDir : path.join(baseDir, 'converted');

    if (!fs.existsSync(convertedDir)) {
      fs.mkdirSync(convertedDir, { recursive: true });
    }

    const outputPath = path.join(convertedDir, fileName);
    logger.info('conversion_started', { filePath, outputPath, format });

    await this.mediaHandler.convertAudio(filePath, outputPath);

    logger.info('conversion_completed', { filePath, outputPath, format });
    return outputPath;
  }

  /**
   * Converts multiple audio files in batch.
   */
  async convertMultipleAudio(
    filePaths: string[],
    format: string,
    outputDir?: string,
  ): Promise<{
    results: Array<{
      file: string;
      outputPath?: string;
      success: boolean;
      error?: string;
    }>;
    summary: string;
  }> {
    console.log(
      `\n[Ducer] Converting ${filePaths.length} files to ${format}...`,
    );
    const tasks = filePaths.map(async (filePath) => {
      try {
        const outputPath = await this.convertAudio(filePath, format, outputDir);
        return { file: filePath, outputPath, success: true };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { file: filePath, success: false, error: message };
      }
    });

    const results = await Promise.all(tasks);
    const successCount = results.filter((r) => r.success).length;
    const summary = `${successCount}/${filePaths.length} files converted successfully to ${format}.`;

    console.log(`[Ducer] Conversion Summary: ${summary}`);
    return { results, summary };
  }

  /**
   * Converts all audio files in a directory.
   */
  async convertDirectory(
    dirPath: string,
    format: string,
    outputDir?: string,
  ): Promise<{
    results: Array<{
      file: string;
      outputPath?: string;
      success: boolean;
      error?: string;
    }>;
    summary: string;
  }> {
    const filePaths = this.getAudioFilesFromDirectory(dirPath);
    if (filePaths.length === 0) {
      throw new Error(`No valid audio files found in directory: ${dirPath}`);
    }
    return this.convertMultipleAudio(filePaths, format, outputDir);
  }

  /**
   * Normalizes multiple audio files in batch.
   */
  async normalizeMultipleAudio(
    filePaths: string[],
    outputDir?: string,
  ): Promise<{
    results: Array<{
      file: string;
      outputPath?: string;
      success: boolean;
      error?: string;
    }>;
    summary: string;
  }> {
    console.log(`\n[Ducer] Normalizing ${filePaths.length} files...`);
    const tasks = filePaths.map(async (filePath) => {
      try {
        const outputPath = await this.normalizeAudio(filePath, outputDir);
        return { file: filePath, outputPath, success: true };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { file: filePath, success: false, error: message };
      }
    });

    const results = await Promise.all(tasks);
    const successCount = results.filter((r) => r.success).length;
    const summary = `${successCount}/${filePaths.length} files normalized successfully.`;

    console.log(`[Ducer] Normalization Summary: ${summary}`);
    return { results, summary };
  }

  /**
   * Normalizes all audio files in a directory.
   */
  async normalizeDirectory(
    dirPath: string,
    outputDir?: string,
  ): Promise<{
    results: Array<{
      file: string;
      outputPath?: string;
      success: boolean;
      error?: string;
    }>;
    summary: string;
  }> {
    const filePaths = this.getAudioFilesFromDirectory(dirPath);
    if (filePaths.length === 0) {
      throw new Error(`No valid audio files found in directory: ${dirPath}`);
    }
    return this.normalizeMultipleAudio(filePaths, outputDir);
  }

  /**
   * Scans a directory for valid audio files.
   */
  private getAudioFilesFromDirectory(dirPath: string): string[] {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return [];
    }

    return fs
      .readdirSync(dirPath)
      .map((f) => path.join(dirPath, f))
      .filter((p) => this.mediaHandler.validateFile(p).valid);
  }

  /**
   * Analyzes all stems in a directory and provides an aggregated report.
   */
  async analyzeStemsDirectory(
    dirPath: string,
    mode: 'standard' | 'advanced' | 'lite',
    config: DucerConfig,
  ): Promise<{
    results: Array<{ file: string; response: string; success: boolean }>;
    summary: string;
    comparativeReport?: string;
  }> {
    const filePaths = this.getAudioFilesFromDirectory(dirPath);
    if (filePaths.length === 0) {
      throw new Error(`No valid audio files found in directory: ${dirPath}`);
    }

    console.log(
      `[Ducer] Analyzing ${filePaths.length} stems in: ${path.basename(dirPath)}`,
    );
    const batch = await this.analyzeMultiple(filePaths, mode, config);

    let comparativeReport: string | undefined;
    if (mode === 'advanced' && batch.results.some((r) => r.success)) {
      comparativeReport = await this.generateComparativeReport(
        batch.results,
        config,
      );
    }

    return { ...batch, comparativeReport };
  }

  /**
   * Generates a comparative summary of multiple analyzed stems.
   */
  private async generateComparativeReport(
    results: Array<{ file: string; response: string; success: boolean }>,
    config: DucerConfig,
  ): Promise<string> {
    const geminiClient = config.getGeminiClient();
    const sessionId = config.getSessionId();
    this.currentGeminiClient = geminiClient as NonNullable<
      DucerCore['currentGeminiClient']
    >;

    const context = results
      .filter((r) => r.success)
      .map((r) => `FILE: ${path.basename(r.file)}\nANALYSIS: ${r.response}`)
      .join('\n\n---\n\n');

    const prompt = `
Act as a Senior Mix Engineer. Based on the individual analyses of these stems, generate a **Comparative Mix Report**.
Identify frequency conflicts between instruments, potential phase issues, and how these elements should fit into the stereo field.

STEM DATA:
${context}
`;

    return this.runToolAwareLoop(
      [{ text: prompt }],
      sessionId,
      [], // No tools needed for summary
      'Ducer Comparative Reporter',
    );
  }
}
