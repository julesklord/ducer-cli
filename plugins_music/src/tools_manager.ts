/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Manages Function Calling (Tools) for the music layer.
 */
export class MusicToolsManager {
  /**
   * Returns minimized JSON schema declarations for music-specific tools.
   */
  getMusicToolsDeclarations() {
    return [
      {
        name: 'visualize_audio_features',
        description:
          'Gen tech viz (spectrogram, mel, chroma, loudness) via Songsee.',
        parameters: {
          type: 'object',
          properties: {
            viz: {
              type: 'string',
              description: 'Panels (viz: "spectrogram,mel,chroma,loudness").',
            },
            start: { type: 'number', description: 'Start time (sec).' },
            duration: { type: 'number', description: 'Clip duration (sec).' },
            style: {
              type: 'string',
              description: 'Palette (classic, magma, inferno, viridis, gray).',
            },
          },
        },
      },
      {
        name: 'transcribe_vocals',
        description: 'Transcribe vocals via local Whisper.',
        parameters: {
          type: 'object',
          properties: {
            focus: {
              type: 'string',
              description: 'Scope (e.g., "chorus", "full").',
            },
          },
        },
      },
      {
        name: 'analyze_frequencies',
        description: 'Detailed frequency/tonal balance audit.',
        parameters: {
          type: 'object',
          properties: {
            focus: {
              type: 'string',
              description: 'Aspect (e.g., "lows", "vocals", "balance").',
            },
          },
        },
      },
      {
        name: 'suggest_chords',
        description: 'Suggest chord progressions or harmonic variations.',
        parameters: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Musical key (e.g., "Am", "C# Major").',
            },
            style: {
              type: 'string',
              description: 'Genre (e.g., "Jazz", "Lo-fi").',
            },
          },
          required: ['key'],
        },
      },
      {
        name: 'search_actions',
        description: 'Search DAW actions by name/function.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term (e.g., "glue", "normalize").',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'learn_workflow_macro',
        description: 'Map a friendly name to a DAW action ID.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Friendly name (e.g., "fader flip").',
            },
            action_id: { type: 'string', description: 'Target action ID.' },
          },
          required: ['name', 'action_id'],
        },
      },
      {
        name: 'get_learned_actions',
        description: 'List user-defined macros/learned actions.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'execute_reaper_action',
        description: 'Execute DAW action by ID or learned macro name.',
        parameters: {
          type: 'object',
          properties: {
            action_id: { type: 'string', description: 'ID or macro name.' },
          },
          required: ['action_id'],
        },
      },
      {
        name: 'execute_lua_script',
        description: 'Run dynamic Lua script for complex automation.',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Lua code.' },
          },
          required: ['code'],
        },
      },
      {
        name: 'get_reaper_status',
        description: 'Get project telemetry (transport, timeline, tracks).',
        parameters: {
          type: 'object',
          properties: {
            full_scan: {
              type: 'boolean',
              description: 'Include FX chain list.',
            },
          },
        },
      },
    ];
  }
}
