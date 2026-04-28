# Ducer Architecture & API Reference (v1.0.0-alpha.1)

## Table of Contents

1. [Overview](#1-overview)
2. [Core Concepts](#2-core-concepts)
3. [Architecture & Design](#3-architecture--design)
4. [API & Interface Reference](#4-api--interface-reference)
5. [CLI Subcommands](#5-cli-subcommands)
6. [Background Processing (Daemon)](#6-background-processing-daemon)
7. [Troubleshooting](#7-troubleshooting)
8. [Maintenance Notes](#8-maintenance-notes)

---

## 1. Overview

Ducer is a detached orchestration layer for the Gemini CLI, specifically
designed for professional audio production environments. It provides a modular
infrastructure to bridge LLM reasoning with Digital Audio Workstations (DAWs),
starting with REAPER. It is used by technical producers and audio engineers to
automate complex sessions, perform multimodal audio analysis, and manage
production metadata directly from the terminal.

## 2. Core Concepts

- **DawBridge**: A universal abstraction layer that decouples Ducer's logic from
  any specific DAW API.
- **Maintenance Shield**: A runtime validation utility (`CompatibilityShield`)
  that checks for upstream API breaking changes and Node.js requirements.
- **Job Queue & Daemon**: A persistence layer for long-running tasks (like stem
  separation or batch normalization) that allows Ducer to handle heavy
  processing in the background.
- **Anti-Hallucination Loop**: A verification flow where Ducer validates
  hallucinated DAW Command IDs against a local semantic registry before falling
  back to search.

## 3. Architecture & Design

Ducer follows a "Detached Plugin" architecture. Instead of modifying the core
Gemini CLI logic, it injects itself as an external command router, maintaining
full portability.

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
      | (Orchestrator)            | (Actions)                 |
      v                           v                           v
[ Job Queue ]               [ Audio Analyzer ]          [ REAPER Bridge ]
```

## 4. API & Interface Reference

### `DawBridge` Interface

Located in `src/bridge_interface.ts`. All new DAW integrations must implement
this interface.

| Method              | Parameters             | Return Type                       | Description                                       |
| :------------------ | :--------------------- | :-------------------------------- | :------------------------------------------------ |
| `executeAction`     | `id: string \| number` | `Promise<string>`                 | Triggers a DAW internal command.                  |
| `validateAction`    | `id: string \| number` | `Promise<ActionValidationResult>` | Checks existence of ID to prevent hallucinations. |
| `getStatus`         | `-`                    | `Promise<DawStatus \| null>`      | Retrieves playhead, tracks, and version info.     |
| `executeScript`     | `code: string`         | `Promise<string>`                 | (Optional) Executes Lua/Python/JS in the DAW.     |
| `isBridgeAvailable` | `-`                    | `boolean`                         | Checks if the IPC channel is reachable.           |

### `DucerCore` Orchestrator

The main logic engine. Key public methods include:

- `getInsight(query, context, config, mode)`: Primary NL entry point.
- `analyzeFile(filePath, mode, config)`: Single file analysis.
- `separateStems(filePath, options)`: AI-powered stem separation (Demucs/UVR).
- `normalizeAudio(filePath, outputDir)`: EBU R128 / Peak normalization.
- `convertAudio(filePath, format, options)`: Format conversion (WAV, MP3, FLAC,
  etc.).
- `analyzeStemsDirectory(dirPath, mode, config)`: Multi-track folder analysis.

### Tool Schemas (Sensory Input)

Ducer declares tools for Gemini via `tools_manager.ts`:

- `visualize_audio_features`: Generates spectrograms, mel-graphs, and
  chroma-plots.
- `execute_reaper_action`: The primary I/O for project control.
- `execute_lua_script`: Run dynamic Lua for complex DAW automation.
- `search_actions`: Semantic search against the DAW action registry.
- `learn_workflow_macro`: Map friendly names to complex action IDs.
- `get_reaper_status`: Retrieve real-time project telemetry.

## 5. CLI Subcommands

Ducer extends the CLI with the following subcommands:

| Subcommand        | Description                                                                   |
| :---------------- | :---------------------------------------------------------------------------- |
| `do`              | The primary entry point for natural language DAW control.                     |
| `analyze`         | Analyzes audio/MIDI files or directories. Supports `--advanced` and `--lite`. |
| `separate`        | Splits audio into stems (vocals, drums, bass, other).                         |
| `batch-normalize` | Normalizes all files in a directory to a target LUFS.                         |
| `batch-convert`   | Mass format conversion for sample libraries.                                  |
| `service`         | Active listening mode for REAPER-triggered commands.                          |
| `daemon`          | Background worker that processes the `Job Queue`.                             |
| `jobs`            | Lists, cancels, or clears background processing jobs.                         |

## 6. Background Processing (Daemon)

Heavy tasks like **Stem Separation** are automatically offloaded to the
`Job Queue`. To process these jobs, you must run the daemon in a separate
terminal:

```bash
ducer daemon
```

The daemon monitors `~/.ducer/_jobs.json` and executes tasks sequentially,
updating their status and storing results (e.g., paths to generated stems).

---

## 7. Troubleshooting

- **Error: GH007 (Push Rejected)**: Fix: Set local config to
  `julesklord@users.noreply.github.com`.
- **Error: Sensor tool timeout**: Check if REAPER is open and the
  `reaper_bridge_client` is reaching the `reaper-control` directory.
- **Permission Denied (npm)**: On Windows, if `npm run pre-commit` fails due to
  path issues, the hook now calls `node` directly to bypass shell escaping bugs.

## 8. Maintenance Notes

- **Upstream Sync**: Always pull from `upstream/main` into `main`, then merge
  `main` into `ducer`.
- **Testing**: Run `npm run test:music` to validate the production layer in
  isolation.
- **Registry**: The semantic registry is stored in
  `ducer-skills/reaper-control/knowledge/db/actions.json`.

---

- **Last updated**: 2026-04-28
- **Maintainer**: @julesklord
- **Current Version**: v1.0.0-alpha.1
