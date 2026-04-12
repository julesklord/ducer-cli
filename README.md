# Ducer - The Gemini Producer Edition 🎹🔥

[![Ducer Integrity](https://img.shields.io/badge/Ducer-v0.41.0--stable-blue)](https://github.com/julesklord/ducer-cli)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini_Core-purple)](https://github.com/google-gemini/gemini-cli)

**Ducer** is an advanced, terminal-first AI agent for music production and DAW orchestration. Built on the powerful foundation of Google's Gemini CLI, Ducer is specifically engineered for musicians, sound designers, and technical producers who live in the terminal and create in the DAW.

## 🚀 Why Ducer?

- **🌉 DAW Orchestration (REAPER)**: Control your sessions via the `ducer` command. Move tracks, normalize items, or complex FX routing via natural language.
- **🧠 Multimodal Audio Analysis**: Upload tracks for frequency audits, transient analysis, and tonal balance reports powered by Gemini and Songsee.
- **🎸 Music Theory Intelligence**: Ask for chord progressions, harmonic variations, or scale translations with an agent that speaks "Staff Engineer".
- **🛡️ Maintenance Shield**: Built-in compatibility layer that protects your workflow from breaking during upstream Gemini CLI updates.
- **🏗️ Portable Bridge**: Decoupled architecture ready to integrate with any DAW (Coming soon: Ableton, FL Studio).

## 📦 Installation

Ducer is a "Producer Edition" fork of Gemini CLI.

```bash
# Clone the Producer Edition
git clone -b ducer https://github.com/julesklord/ducer-cli.git
cd ducer-cli

# Install and Build
npm install
npm run build
```

### Usage
Start the Ducer engine directly:
```bash
./bundle/gemini.js music
```
Or use the global shortcut if installed:
```bash
ducer music
```

## 📋 Core Capabilities

### 1. DAW Control
Ducer knows REAPER. It communicates via the **Ducer-Bridge** protocol to execute actions, scripts, and analyze project state in real-time.

### 2. Audio Auditing
Send audio files for expert analysis:
- **Tone Balance**: Identify masking and clashing frequencies.
- **Dynamic Check**: Evaluate headroom and compression needs.
- **AI Transcription**: Extract lyrics and metadata automatically.

### 3. Workflow Automation
Ducer can learn your personal macros and map them to friendly names, effectively building a "Music Knowledge Base" just for you.

## 🤝 For Gemini CLI Users
Ducer is a hard fork that respects the original core. For standard AI-agent features (chat, file search, MCP), refer to the [Original Gemini CLI Manual](./README_GEMINI.md).

## 📄 License & Credits
- **Ducer Engine**: Created by @julesklord. Apache 2.0.
- **Gemini CLI Core**: Built by Google and the Open Source community.

---
<p align="center">
  Built with ❤️ for Producers by the Antigravity AI Agent
</p>
