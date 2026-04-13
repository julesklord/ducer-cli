/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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
} from './prompts.js';
import { CompatibilityShield } from './compatibility_check.js';
import { ScriptManager } from './script_manager.js';

/**
 * Retorna el MIME type correcto para la extensión del archivo.
 * Gemini 1.5 Pro acepta audio/wav, audio/mp3, audio/aiff, audio/ogg, audio/flac.
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

  private readonly actionsDbPath: string;

  constructor(bridge: DawBridge) {
    this.mediaHandler = new MusicMediaHandler();
    this.audioAnalyzer = new AudioAnalyzer();
    this.toolsManager = new MusicToolsManager();
    this.bridge = bridge;
    this.scriptManager = new ScriptManager();
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
    let prompt = DUCER_CORE_PROMPT + '\n' + DAW_CONTROL_PROMPT;
    if (mode === 'advanced') prompt += '\n' + ADVANCED_ANALYSIS_ADDON;
    if (mode === 'lite') prompt += '\n' + LITE_ANALYSIS_ADDON;
    return prompt;
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
    const geminiClient = config.getGeminiClient();
    CompatibilityShield.validateGeminiClient(geminiClient);

    const sessionId = config.getSessionId();
    const systemPrompt = this.getSystemPrompt(mode) + '\n\n' + context;
    const toolDeclarations = this.toolsManager.getMusicToolsDeclarations();

    // Historial de mensajes para el loop multi-turn
    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: systemPrompt + '\n\nUSER: ' + query },
    ];

    let fullResponse = '';
    let continueLoop = true;

    while (continueLoop) {
      continueLoop = false; // se pone en true si hay tool-calls

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseStream = (geminiClient as any).sendMessageStream(
        messages.map((m) => ({ text: m.content })),
        new AbortController().signal,
        sessionId,
        toolDeclarations,
        false,
        'Ducer Insight Engine',
      );

      const toolCallsThisTurn: Array<{ name: string; args: string }> = [];
      let assistantTextThisTurn = '';

      for await (const event of responseStream) {
        if (event.type === 'content') {
          process.stdout.write(event.value);
          fullResponse += event.value;
          assistantTextThisTurn += event.value;
        }
        if (event.type === 'tool-call') {
          toolCallsThisTurn.push(event.value);
        }
      }

      // Appendear respuesta del asistente al historial
      if (assistantTextThisTurn) {
        messages.push({ role: 'assistant', content: assistantTextThisTurn });
      }

      // Si hubo tool-calls, ejecutarlas y appendear resultados
      if (toolCallsThisTurn.length > 0) {
        continueLoop = true;
        const toolResultParts: string[] = [];

        for (const call of toolCallsThisTurn) {
          console.log(`\n[Ducer] Ejecutando tool: ${call.name}`);
          const result = await this.dispatchTool(call);
          console.log(
            `[Ducer] Tool result (preview): ${result.substring(0, 120)}...`,
          );
          toolResultParts.push(`[TOOL: ${call.name}]\nRESULT: ${result}`);
        }

        // Appendear resultados como mensaje del usuario (formato que acepta Gemini)
        messages.push({
          role: 'user',
          content: toolResultParts.join('\n\n'),
        });
      }
    }

    return fullResponse;
  }
  /**
   * Dispatches music-specific tool calls.
   */
  private async dispatchTool(call: {
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
          const idToExecute = this.resolveActionId(args['action_id'] as string);

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
    try {
      const db = JSON.parse(fs.readFileSync(this.actionsDbPath, 'utf8'));
      return db[idOrName.toLowerCase()] || idOrName;
    } catch {
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
    const validation = this.mediaHandler.validateFile(filePath);
    if (!validation.valid) {
      throw new Error(`Validation Error: ${validation.error}`);
    }

    // Leer el archivo de audio y convertir a base64
    const audioBytes = fs.readFileSync(filePath);
    const audioBase64 = audioBytes.toString('base64');
    const mediaType = getAudioMediaType(filePath);
    const fileName = path.basename(filePath);

    console.log(
      `[Ducer] Audio cargado: ${fileName} (${(audioBytes.length / 1024 / 1024).toFixed(2)} MB, ${mediaType})`,
    );

    const geminiClient = config.getGeminiClient();
    CompatibilityShield.validateGeminiClient(geminiClient);

    const sessionId = config.getSessionId();
    const analysisMode =
      mode === 'advanced' ? 'advanced' : mode === 'lite' ? 'lite' : 'command';
    const systemPrompt = this.getSystemPrompt(analysisMode);
    const toolDeclarations = this.toolsManager.getMusicToolsDeclarations();

    const textPrompt = `${systemPrompt}

Analiza este archivo de audio de manera técnica y artística en modo ${mode}.
Archivo: ${fileName}

Proporciona:
1. Análisis espectral y de dinámica
2. Evaluación del balance tonal
3. Observaciones de la mezcla y producción
4. Recomendaciones concretas de mejora`;

    // Construir mensaje multimodal: texto + audio como inline_data base64
    const multimodalMessage = [
      {
        inlineData: {
          mimeType: mediaType,
          data: audioBase64,
        },
      },
      { text: textPrompt },
    ];

    let fullResponse = '';
    let continueLoop = true;

    // Historial para loop multi-turn si hay tool-calls
    const history: Array<{ role: string; parts: unknown[] }> = [
      { role: 'user', parts: multimodalMessage },
    ];

    while (continueLoop) {
      continueLoop = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseStream = (geminiClient as any).sendMessageStream(
        history[history.length - 1].parts as unknown[],
        new AbortController().signal,
        sessionId,
        toolDeclarations,
        false,
        'Ducer Audio Analyzer',
      );

      const toolCallsThisTurn: Array<{ name: string; args: string }> = [];
      let assistantTextThisTurn = '';

      for await (const event of responseStream) {
        if (event.type === 'content') {
          process.stdout.write(event.value);
          fullResponse += event.value;
          assistantTextThisTurn += event.value;
        }
        if (event.type === 'tool-call') {
          toolCallsThisTurn.push(event.value);
        }
      }

      if (assistantTextThisTurn) {
        history.push({
          role: 'assistant',
          parts: [{ text: assistantTextThisTurn }],
        });
      }

      if (toolCallsThisTurn.length > 0) {
        continueLoop = true;
        const toolResultParts: unknown[] = [];

        for (const call of toolCallsThisTurn) {
          // Inyectar el filePath en los args de las tools que lo necesitan
          let callArgs: Record<string, unknown> = {};
          try {
            callArgs = JSON.parse(call.args);
          } catch {
            /* usar vacío */
          }
          if (!callArgs['filePath']) callArgs['filePath'] = filePath;
          const enrichedCall = {
            name: call.name,
            args: JSON.stringify(callArgs),
          };

          const result = await this.dispatchTool(enrichedCall);
          toolResultParts.push({
            text: `[TOOL: ${call.name}]\nRESULT: ${result}`,
          });
        }

        history.push({ role: 'user', parts: toolResultParts });
      }
    }

    return fullResponse;
  }
}
