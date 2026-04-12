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
import { DawBridge } from './bridge_interface.js';
import { DUCER_CORE_PROMPT, DAW_CONTROL_PROMPT, ADVANCED_ANALYSIS_ADDON, LITE_ANALYSIS_ADDON, } from './prompts.js';
import { CompatibilityShield } from './compatibility_check.js';
/**
 * DucerCore: The "Producer Brain" of the system.
 * Encapsulates all domain logic to provide a portable, complex identity.
 */
export class DucerCore {
    mediaHandler;
    audioAnalyzer;
    toolsManager;
    bridge;
    actionsDbPath;
    constructor(bridge) {
        this.mediaHandler = new MusicMediaHandler();
        this.audioAnalyzer = new AudioAnalyzer();
        this.toolsManager = new MusicToolsManager();
        this.bridge = bridge;
        this.actionsDbPath = path.join(process.cwd(), 'ducer-skills', 'reaper-control', 'knowledge', 'db', 'actions.json');
        // Ensure DB dir exists
        const dbDir = path.dirname(this.actionsDbPath);
        if (!fs.existsSync(dbDir))
            fs.mkdirSync(dbDir, { recursive: true });
        if (!fs.existsSync(this.actionsDbPath))
            fs.writeFileSync(this.actionsDbPath, '{}');
    }
    /**
     * Generates a modular system prompt based on required context.
     */
    getSystemPrompt(mode) {
        let prompt = DUCER_CORE_PROMPT + '\n' + DAW_CONTROL_PROMPT;
        if (mode === 'advanced')
            prompt += '\n' + ADVANCED_ANALYSIS_ADDON;
        if (mode === 'lite')
            prompt += '\n' + LITE_ANALYSIS_ADDON;
        return prompt;
    }
    /**
     * Main entry point for any "insight" request (natural language query).
     */
    async getInsight(query, context, config, mode = 'command') {
        const geminiClient = config.getGeminiClient();
        CompatibilityShield.validateGeminiClient(geminiClient);
        const sessionId = config.getSessionId();
        let fullResponse = '';
        const systemPrompt = this.getSystemPrompt(mode) + '\n\n' + context;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseStream = geminiClient.sendMessageStream([{ text: systemPrompt + '\n\nUSER: ' + query }], new AbortController().signal, sessionId, this.toolsManager.getMusicToolsDeclarations(), false, 'Ducer Insight Engine');
        for await (const event of responseStream) {
            if (event.type === 'content') {
                process.stdout.write(event.value);
                fullResponse += event.value;
            }
            if (event.type === 'tool-call') {
                const result = await this.dispatchTool(event.value);
                console.log(`\n[Ducer sensory-input]: ${result.substring(0, 100)}...`);
            }
        }
        return fullResponse;
    }
    /**
     * Dispatches music-specific tool calls.
     */
    async dispatchTool(call) {
        const args = JSON.parse(call.args);
        console.log(`\n[Ducer-Core] Dispatching Tool: ${call.name}`);
        try {
            switch (call.name) {
                case 'visualize_audio_features':
                    return JSON.stringify(await this.audioAnalyzer.visualize(args.filePath || '', args));
                case 'transcribe_vocals':
                    return JSON.stringify(await this.audioAnalyzer.transcribe(args.filePath || ''));
                case 'execute_reaper_action': {
                    const idToExecute = this.resolveActionId(args.action_id);
                    // Anti-Hallucination: Verify if NOT in our local registry
                    if (!this.isInRegistry(idToExecute)) {
                        console.log(`[Ducer-Core] Unknown ID detected (${idToExecute}). Verifying with REAPER...`);
                        const validation = await this.bridge.validateAction(idToExecute);
                        if (!validation.valid) {
                            console.log(`[Ducer-Core] Hallucination detected. Attempting semantic fallback for: ${args.action_id}`);
                            return await this.semanticSearchFallback(args.action_id);
                        }
                    }
                    return await this.bridge.executeAction(idToExecute);
                }
                case 'learn_workflow_macro':
                    return await this.learnMacro(args.name, args.action_id);
                case 'get_learned_actions':
                    return fs.readFileSync(this.actionsDbPath, 'utf8');
                case 'search_actions': {
                    return await this.performAdvancedSearch(args.query);
                }
                case 'execute_lua_script': {
                    if (this.bridge.executeScript) {
                        return await this.bridge.executeScript(args.code);
                    }
                    return 'Error: Scripting not supported by current DAW bridge.';
                }
                case 'get_reaper_status': {
                    const status = await this.bridge.getStatus();
                    return status ? JSON.stringify(status) : 'Error: DAW disconnected';
                }
                default:
                    return `Error: Tool ${call.name} not handled by DucerCore.`;
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return `Error in Ducer Sensory Tool: ${msg}`;
        }
    }
    isInRegistry(id) {
        try {
            const registry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'ducer-skills', 'reaper-control', 'knowledge', 'db', 'semantic_registry.json'), 'utf8'));
            return registry.actions.some((a) => a.id === id);
        }
        catch {
            return false;
        }
    }
    async semanticSearchFallback(query) {
        const registry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'ducer-skills', 'reaper-control', 'knowledge', 'db', 'semantic_registry.json'), 'utf8'));
        const matches = registry.actions.filter((a) => a.tags.some((t) => query.toLowerCase().includes(t)) ||
            a.name.toLowerCase().includes(query.toLowerCase()));
        if (matches.length > 0) {
            return `Hallucinated ID detected. Ducer suggests these real actions:\n${matches.map((m) => `- ${m.name} (ID: ${m.id})`).join('\n')}`;
        }
        return `Error: Could not validate ID ${query} nor find a semantic alternative in local registry.`;
    }
    async performAdvancedSearch(query) {
        const registryPath = path.join(process.cwd(), 'ducer-skills', 'reaper-control', 'knowledge', 'db', 'semantic_registry.json');
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const learnedDb = JSON.parse(fs.readFileSync(this.actionsDbPath, 'utf8'));
        const localResults = registry.actions.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()) ||
            a.tags.some((t) => t.includes(query.toLowerCase())));
        const learnedResults = Object.keys(learnedDb)
            .filter((k) => k.includes(query.toLowerCase()))
            .map((k) => ({ name: `[learned] ${k}`, id: learnedDb[k] }));
        const allResults = [...localResults, ...learnedResults];
        return allResults.length > 0
            ? JSON.stringify(allResults.map((r) => ({ name: r.name, id: r.id })))
            : 'No actions found in registry or learned database.';
    }
    resolveActionId(idOrName) {
        try {
            const db = JSON.parse(fs.readFileSync(this.actionsDbPath, 'utf8'));
            return db[idOrName.toLowerCase()] || idOrName;
        }
        catch {
            return idOrName;
        }
    }
    async learnMacro(name, id) {
        const db = JSON.parse(fs.readFileSync(this.actionsDbPath, 'utf8'));
        db[name.toLowerCase()] = id;
        fs.writeFileSync(this.actionsDbPath, JSON.stringify(db, null, 2));
        return `✅ Ducer has learned the macro: "${name}" -> ${id}`;
    }
    /**
     * Performs an initial expert audit of an audio file.
     */
    async analyzeFile(filePath, mode, config) {
        const validation = this.mediaHandler.validateFile(filePath);
        if (!validation.valid) {
            throw new Error(`Validation Error: ${validation.error}`);
        }
        fs.readFileSync(filePath);
        const promptContext = `Analyze this audio file (${mode}) technically and artistically.
    File: ${path.basename(filePath)}`;
        return await this.getInsight(promptContext, '', config, mode === 'advanced' ? 'advanced' : mode === 'lite' ? 'lite' : 'command');
    }
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const map = {
            '.wav': 'audio/wav',
            '.mp3': 'audio/mp3',
            '.aiff': 'audio/aiff',
            '.ogg': 'audio/ogg',
            '.flac': 'audio/flac',
        };
        return map[ext] || 'audio/mpeg';
    }
}
//# sourceMappingURL=ducer_core.js.map