# Ducer

> Terminal-first AI agent for professional music production and DAW orchestration.  
> A hard fork of [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) — extended with a native production layer.

[![CI](https://github.com/julesklord/ducer-cli/actions/workflows/ci.yml/badge.svg?branch=ducer)](https://github.com/julesklord/ducer-cli/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-v0.41.0-blue)](https://github.com/julesklord/ducer-cli)
[![License](https://img.shields.io/badge/license-Apache--2.0-green)](./LICENSE)
[![Branch](https://img.shields.io/badge/branch-ducer-purple)](https://github.com/julesklord/ducer-cli/tree/ducer)

---

Ducer is what happens when a producer who actually engineers audio decides to build the tool they needed to exist. Not a chatbot wrapper. Not a plugin GUI. A proper terminal agent that speaks REAPER's language natively, can analyze audio multimodally via Gemini 1.5 Pro's 1M token context window, generates and executes Lua scripts on demand, and validates every action ID before it touches your session.

The `main` branch tracks Google's upstream verbatim. The `ducer` branch is where the production layer lives — decoupled by design, so upstream merges don't break your workflow.

---

## How it works

```typescript
User Prompt
    │
    ▼
Gemini CLI Host  ──── Jump Hook ────►  Ducer Plugin Layer
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        │                     │                     │
                   DucerCore           Sensory Tools           DawBridge
                  (Orchestrator)      (Audio / Media)         (I/O Layer)
                        │                     │                     │
                   Local DB            AudioAnalyzer         ReaperBridgeClient
                  (Action Registry)    (Waveform/Spec)       (Web API + File IPC)
```

The "Jump Hook" is a passive router injected into the CLI — it intercepts music subcommands and delegates them to `DucerCore` without modifying any upstream code. This means `git merge upstream/main` stays clean.

---

## Installation

**Requirements:** Node.js >= 20.0.0, REAPER with Web Control enabled (port 8080 default)

```bash
# Clone the production branch
git clone -b ducer https://github.com/julesklord/ducer-cli.git
cd ducer-cli

# Install and build
npm install
npm run build

# Make it global
npm link
```

**Environment variables (optional):**

```bash
export REAPER_IP=127.0.0.1   # default
export REAPER_PORT=8080       # default — must match REAPER Web Control config
```

---

## Usage

```bash
# Interactive producer mode (REAPER linked)
ducer

# Natural language command to REAPER
ducer do --query "Sidechain route Track 1 to Track 2, add compressor"

# Audio file analysis (standard)
ducer analyze --file /path/to/mix.wav

# Advanced analysis — generates HTML report and opens in browser
ducer analyze --file /path/to/mix.wav --advanced

# Lightweight technical summary
ducer analyze --file /path/to/mix.wav --lite

# Service mode — persistent IPC loop, listens for REAPER-triggered commands
ducer service
```

---

## Architecture

### DawBridge Interface

All DAW integrations implement a single interface defined in `plugins_music/src/bridge_interface.ts`. Adding a new DAW means implementing five methods — nothing else changes.

| Method | Description |
|---|---|
| `executeAction(id)` | Triggers a DAW command by numeric or named ID |
| `executeScript(code)` | Executes Lua (or other scripting language) directly |
| `validateAction(id)` | Verifies the action exists — **anti-hallucination** |
| `getStatus()` | Returns playhead position, play state, project path, version |
| `isBridgeAvailable()` | Checks if the IPC channel is reachable |

### ReaperBridgeClient

The REAPER implementation uses a two-tier transport:

**Tier 1 — Web Control API** (fast path)  
Hits REAPER's native HTTP endpoint directly for action execution and status. 1 second timeout, fails fast.

**Tier 2 — File IPC** (fallback)  
Writes commands to `%APPDATA%/REAPER/Scripts/ducer_commands.txt`, polls `ducer_response.txt` for the result. 100ms polling interval, 5 second timeout.

### Anti-Hallucination Loop

Before any action ID reaches REAPER, `validateAction()` runs `ReverseNamedCommandLookup` via Lua and stores the result in REAPER's `ExtState`. If the ID doesn't map to a real action, Ducer runs `semanticSearchFallback` against the local action registry and suggests the correct ID.

```
User: "Run action PLAY_ID_999"
  → validateAction("PLAY_ID_999")
    → Lua: ReverseNamedCommandLookup → "INVALID"
      → semanticSearchFallback → suggests action 40001 (Transport: Play)
        → executeAction(40001) ✓
```

### DucerCore

The orchestrator. Composes system prompts modularly based on the requested analysis depth and delegates to the bridge, audio analyzer, and tools manager.

```typescript
getInsight(query, context, config, mode: 'command' | 'advanced' | 'lite')
analyzeFile(filePath, mode, config)
```

### Service Mode

A persistent IPC loop that watches `ducer_commands.txt` every 200ms. Intended for REAPER-triggered automation — a Lua script in REAPER writes a command, Ducer processes it via Gemini, writes the response back. Full bidirectional DAW↔LLM communication without leaving your session.

---

## Plugin structure

```typescript
plugins_music/
├── src/
│   ├── bridge_interface.ts     # Universal DawBridge contract
│   ├── compatibility_check.ts  # CompatibilityShield — upstream regression guard
│   ├── ducer_core.ts           # Main orchestrator
│   ├── audio_analyzer.ts       # Waveform / spectral analysis
│   ├── media_handler.ts        # File ingestion pipeline
│   ├── prompts.ts              # Modular system prompts (Core / DAW / Advanced / Lite)
│   ├── reaper_bridge_client.ts # REAPER implementation of DawBridge
│   ├── reaper_kb_manager.ts    # Action registry + semantic search
│   ├── router.ts               # CLI entry point + subcommand dispatcher
│   ├── tools_manager.ts        # Gemini tool schemas (Sensory Tools)
│   └── ui_generator.ts         # HTML report generator (Advanced mode)
ducer-skills/
│   └── reaper-control/
│       └── knowledge/db/       # Local action registry (actions.json)
scripts/lua/
│   └── Ducer/                  # Native Lua scripts for REAPER-side IPC
reactions_db/                   # Session reaction/feedback persistence
```

---

## Adding a new DAW bridge

1. Create `plugins_music/src/your_daw_bridge_client.ts`
2. Implement the `DawBridge` interface
3. Register it in `router.ts` alongside `ReaperBridgeClient`
4. Add any DAW-side scripts to `scripts/`

`DucerCore` doesn't know or care which DAW is behind the bridge.

---

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Mirror of `google-gemini/gemini-cli` upstream. Never modify directly. |
| `ducer` | Production layer. All Ducer-specific code lives here. |

Upstream sync workflow:

```bash
git fetch upstream
git checkout main && git merge upstream/main
git checkout ducer && git merge main
# resolve conflicts in plugins_music/ only (if any)
```

---

## Roadmap

- [x] DawBridge interface + REAPER implementation
- [x] Web Control API + File IPC dual transport
- [x] Anti-Hallucination loop via action registry
- [x] Audio analysis (standard / advanced / lite modes)
- [x] HTML report generation
- [x] Service mode (persistent IPC loop)
- [ ] Atomic file IPC (rename-based, eliminates race condition)
- [ ] EEL2 / Python script support in `executeScript`
- [ ] Multi-project orchestration (Phase 3)
- [ ] Ableton Live bridge
- [ ] Logic Pro bridge (macOS)
- [ ] Whisper local transcription integration
- [ ] Spectrogram / chromagram terminal rendering

---

## Contributing

This project sits at an unusual intersection: audio engineering, Lua scripting, TypeScript, and LLM orchestration. If you work in any of those areas, there's something here for you.

See [`plugins_music/README.md`](./plugins_music/README.md) for the full API reference and bridge development guide.

---

<p align="center">
  Built for producers, by a producer.<br>
  <a href="https://github.com/julesklord/ducer-cli/tree/ducer">ducer branch</a> ·
  <a href="./plugins_music/README.md">API Reference</a> ·
  <a href="./ROADMAP.md">Roadmap</a>
</p>
