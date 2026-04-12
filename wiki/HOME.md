# Ducer-CLI Wiki: The Producer Engine

- **Updated**: 2026-04-12
- **Read time**: 4 min
- **Difficulty**: 🟢 Beginner

## What is Ducer?
Ducer is a technical orchestration layer for recordists and music producers. While general AI agents struggle with local DAW state and binary audio data, Ducer provides a **deterministic bridge** to your creative environment.

### The Problem Statement
General LLMs lack "DAW-Awareness". They can't see your tracks, they don't know your FX chains, and they can't verify if a Command ID is valid. Ducer solves this by introducing a **Sensory Layer** that fetches real-time telemetry from your host DAW.

### Comparison: Generic vs Ducer
| Feature | Gemini CLI (Base) | Ducer (Producer Edition) |
| :--- | :---: | :---: |
| **Logic** | General Coding | Music Production & MIDI |
| **DAW Bridge** | ❌ None | ✅ Bidirectional (REAPER) |
| **Audio Audit** | ❌ CLI-only | ✅ Spectral & Dynamic Analysis |
| **Safety** | Standard | ✅ Compatibility Shield |

---

## 5-Minute Quickstart

### 1. Link your environment
Assuming you have already cloned the repo and run `npm install`:
```bash
PS> npm link
PS> ducer --version
ducer v0.41.0
```

### 2. Connect to REAPER
Open REAPER and ensure your project is saved.
```bash
PS> ducer music "Check play state"
[Ducer Sensory Input]: 0 (Stopped)
```

### 3. Move your first track
```bash
PS> ducer music "Move track 1 to bottom"
[Ducer-Core]: Dispatching Tool: execute_reaper_action
✅ Action successful.
```

---
[Installation & Setup](INSTALLATION.md) | [Command Reference](COMMAND_REFERENCE.md)
