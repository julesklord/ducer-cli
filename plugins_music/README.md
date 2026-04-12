# Ducer Architecture & API Reference (v0.45.0)

## Table of Contents
1. [Overview](#1-overview)
2. [Core Concepts](#2-core-concepts)
3. [Architecture & Design](#3-architecture--design)
4. [API & Interface Reference](#4-api--interface-reference)
5. [Real-World Examples](#5-real-world-examples)
6. [Troubleshooting](#6-troubleshooting)
7. [Maintenance Notes](#7-maintenance-notes)

---

## 1. Overview
Ducer is a detached orchestration layer for the Gemini CLI, specifically designed for professional audio production environments. It provides a modular infrastructure to bridge LLM reasoning with Digital Audio Workstations (DAWs), starting with REAPER. It is used by technical producers and audio engineers to automate complex sessions, perform multimodal audio analysis, and manage production metadata directly from the terminal.

## 2. Core Concepts
- **DawBridge**: A universal abstraction layer that decouples Ducer's logic from any specific DAW API.
- **Maintenance Shield**: A runtime validation utility (`CompatibilityShield`) that checks for upstream API breaking changes.
- **Token-Wise Optimization**: A methodology of using high-density technical English and schema compression to minimize operational costs in Gemini API calls.
- **Anti-Hallucination Loop**: A verification flow where Ducer validates hallucinated DAW Command IDs against a local semantic registry before falling back to search.

## 3. Architecture & Design

Ducer follows a "Detached Plugin" architecture. Instead of modifying the core Gemini CLI logic, it injects itself as an external command router, maintaining full portability.

### High-Level Data Flow
```text
[ USER PROMPT ] 
      |
      v
[ Gemini CLI Router ] ----> [ DUCER PLUGIN LAYER ]
                                  |
      +---------------------------+---------------------------+
      |                           |                           |
[ DucerCore ] <----------> [ Sensory Tools ] <----------> [ DawBridge ] (I/O)
      |         (Logic)           |         (Actions)         |
      v                           v                           v
[ Local Registry ]        [ Audio Analyzer ]          [ REAPER Bridge ]
```

### Design Decisions
- **Passive Core Integration**: We use a "Jump Hook" in the main CLI router to redirect music commands. This is done to minimize merge conflicts with Google's upstream updates.
- **Technical English Standard**: All internal prompts and tool schemas are strictly in English to optimize token precision, while the user interface remains multilingual.

## 4. API & Interface Reference

### `DawBridge` Interface
Located in `src/bridge_interface.ts`. All new DAW integrations must implement this interface.

| Method | Parameters | Return Type | Description |
| :--- | :--- | :---: | :--- |
| `executeAction` | `id: string \| number` | `Promise<string>` | Triggers a DAW internal command. |
| `validateAction`| `id: string \| number` | `Promise<Validation>`| Checks existence of ID to prevent hallucinations. |
| `getStatus` | - | `Promise<DawStatus>` | Retrieves playhead, tracks, and version info. |
| `executeScript` | `code: string` | `Promise<string>` | (Optional) Executes Lua/Python/JS in the DAW. |

### `DucerCore` Orchestrator
The main logic engine.

- **`getInsight(query, context, config, mode)`**:
    - `query`: The user's natural language request.
    - `mode`: `'command' | 'advanced' | 'lite'`. Determines prompt density.
    - **Returns**: A high-fidelity LLM response with tool execution results.

### Tool Schemas (Sensory Input)
Ducer declares tools for Gemini via `tools_manager.ts`.
- `visualize_audio_features`: Analyzes waveforms/spectra.
- `execute_reaper_action`: The primary I/O for project control.
- `transcribe_vocals`: Local-first transcription utility.

## 5. Real-World Examples

### Example 1: Complex Automation with Lua
**Prompt**: *"Create a sidechain route from Track 1 to Track 2 and add a compressor."*
**Ducer Logic**:
1. Generates the Lua code via `ADVANCED_ANALYSIS_ADDON`.
2. Dispatches `execute_lua_script`.
3. Validates success via the Bridge response.

### Example 2: Anti-Hallucination Fallback
**Prompt**: *"Press Play on the hallucinated ID PLAY_ID_999"*
**Ducer Logic**:
1. `execute_reaper_action` triggered.
2. `CompatibilityShield` / Registry check fails.
3. Ducer runs `semanticSearchFallback` and suggests `40001` (Real Play ID).

## 6. Troubleshooting

- **Error: GH007 (Push Rejected)**: Occurs when git author email is private. Fix: Set local config to `julesklord@users.noreply.github.com`.
- **Error: Sensor tool timeout**: Check if REAPER is open and the `reaper_bridge_client` is reaching the `reaper-control` directory.
- **Hallucination Loops**: If Ducer insists on wrong IDs, run `npm run test:music` to verify registry integrity.

## 7. Maintenance Notes
- **Upstream Sync**: Always pull from `upstream/main` into a clean branch before merging into `ducer`.
- **Dependencies**: Requires Node.js >= 20.0.0 and `vitest` for technical suite validation.
- **Branch Policy**: `main` is for mirror syncing; `ducer` is for production features.

---
- **Last updated**: 2026-04-12
- **Maintainer**: @julesklord
- **Known Limitations**: Currently optimized for single-project orchestration. Multiproject support is a TODO for Phase 3.
