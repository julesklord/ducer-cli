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

## Gemini CLI Core

Ducer is built on top of the Gemini CLI. Below is the standard information for the core engine.

### Releases

New preview releases will be published each week at UTC 23:59 on Tuesdays. These
releases will not have been fully vetted and may contain regressions or other
outstanding issues. Please help us test and install with `preview` tag.

```bash
npm install -g @google/gemini-cli@preview
```

### Stable

- New stable releases will be published each week at UTC 20:00 on Tuesdays, this
  will be the full promotion of last week's `preview` release + any bug fixes
  and validations. Use `latest` tag.

```bash
npm install -g @google/gemini-cli@latest
```

### Nightly

- New releases will be published each day at UTC 00:00. This will be all changes
  from the main branch as represented at time of release. It should be assumed
  there are pending validations and issues. Use `nightly` tag.

```bash
npm install -g @google/gemini-cli@nightly
```

## 📋 Key Features

### Code Understanding & Generation

- Query and edit large codebases
- Generate new apps from PDFs, images, or sketches using multimodal capabilities
- Debug issues and troubleshoot with natural language

### Automation & Integration

- Automate operational tasks like querying pull requests or handling complex
  rebases
- Use MCP servers to connect new capabilities, including
  [media generation with Imagen, Veo or Lyria](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia)
- Run non-interactively in scripts for workflow automation

### Advanced Capabilities

- Ground your queries with built-in
  [Google Search](https://ai.google.dev/gemini-api/docs/grounding) for real-time
  information
- Conversation checkpointing to save and resume complex sessions
- Custom context files (GEMINI.md) to tailor behavior for your projects

### GitHub Integration

Integrate Gemini CLI directly into your GitHub workflows with
[**Gemini CLI GitHub Action**](https://github.com/google-github-actions/run-gemini-cli):

- **Pull Request Reviews**: Automated code review with contextual feedback and
  suggestions
- **Issue Triage**: Automated labeling and prioritization of GitHub issues based
  on content analysis
- **On-demand Assistance**: Mention `@gemini-cli` in issues and pull requests
  for help with debugging, explanations, or task delegation
- **Custom Workflows**: Build automated, scheduled and on-demand workflows
  tailored to your team's needs

## 🔐 Authentication Options

Choose the authentication method that best fits your needs:

### Option 1: Sign in with Google (OAuth login using your Google Account)

**✨ Best for:** Individual developers as well as anyone who has a Gemini Code
Assist License. (see
[quota limits and terms of service](https://cloud.google.com/gemini/docs/quotas)
for details)

**Benefits:**

- **Free tier**: 60 requests/min and 1,000 requests/day
- **Gemini 3 models** with 1M token context window
- **No API key management** - just sign in with your Google account
- **Automatic updates** to latest models

#### Start Gemini CLI, then choose _Sign in with Google_ and follow the browser authentication flow when prompted

```bash
gemini
```

#### If you are using a paid Code Assist License from your organization, remember to set the Google Cloud Project

```bash
# Set your Google Cloud Project
export GOOGLE_CLOUD_PROJECT="YOUR_PROJECT_ID"
gemini
```

### Option 2: Gemini API Key

**✨ Best for:** Developers who need specific model control or paid tier access

**Benefits:**

- **Free tier**: 1000 requests/day with Gemini 3 (mix of flash and pro)
- **Model selection**: Choose specific Gemini models
- **Usage-based billing**: Upgrade for higher limits when needed

```bash
# Get your key from https://aistudio.google.com/apikey
export GEMINI_API_KEY="YOUR_API_KEY"
gemini
```

### Option 3: Vertex AI

**✨ Best for:** Enterprise teams and production workloads

**Benefits:**

- **Enterprise features**: Advanced security and compliance
- **Scalable**: Higher rate limits with billing account
- **Integration**: Works with existing Google Cloud infrastructure

```bash
# Get your key from Google Cloud Console
export GOOGLE_API_KEY="YOUR_API_KEY"
export GOOGLE_GENAI_USE_VERTEXAI=true
gemini
```

For Google Workspace accounts and other authentication methods, see the
[authentication guide](https://www.geminicli.com/docs/get-started/authentication).

## 🚀 Getting Started

### Basic Usage

#### Start in current directory

```bash
gemini
```

#### Include multiple directories

```bash
gemini --include-directories ../lib,../docs
```

#### Use specific model

```bash
gemini -m gemini-2.5-flash
```

#### Non-interactive mode for scripts

Get a simple text response:

```bash
gemini -p "Explain the architecture of this codebase"
```

For more advanced scripting, including how to parse JSON and handle errors, use
the `--output-format json` flag to get structured output:

```bash
gemini -p "Explain the architecture of this codebase" --output-format json
```

For real-time event streaming (useful for monitoring long-running operations),
use `--output-format stream-json` to get newline-delimited JSON events:

```bash
gemini -p "Run tests and deploy" --output-format stream-json
```

### Quick Examples

#### Start a new project

```bash
cd new-project/
gemini
> Write me a Discord bot that answers questions using a FAQ.md file I will provide
```

#### Analyze existing code

```bash
git clone https://github.com/google-gemini/gemini-cli
cd gemini-cli
gemini
> Give me a summary of all of the changes that went in yesterday
```

## 📚 Documentation

### Getting Started

- [**Quickstart Guide**](https://www.geminicli.com/docs/get-started) - Get up
  and running quickly.
- [**Authentication Setup**](https://www.geminicli.com/docs/get-started/authentication) -
  Detailed auth configuration.
- [**Configuration Guide**](https://www.geminicli.com/docs/reference/configuration) -
  Settings and customization.
- [**Keyboard Shortcuts**](https://www.geminicli.com/docs/reference/keyboard-shortcuts) -
  Productivity tips.

### Core Features

- [**Commands Reference**](https://www.geminicli.com/docs/reference/commands) -
  All slash commands (`/help`, `/chat`, etc).
- [**Custom Commands**](https://www.geminicli.com/docs/cli/custom-commands) -
  Create your own reusable commands.
- [**Context Files (GEMINI.md)**](https://www.geminicli.com/docs/cli/gemini-md) -
  Provide persistent context to Gemini CLI.
- [**Checkpointing**](https://www.geminicli.com/docs/cli/checkpointing) - Save
  and resume conversations.
- [**Token Caching**](https://www.geminicli.com/docs/cli/token-caching) -
  Optimize token usage.

### Tools & Extensions

- [**Built-in Tools Overview**](https://www.geminicli.com/docs/reference/tools)
  - [File System Operations](https://www.geminicli.com/docs/tools/file-system)
  - [Shell Commands](https://www.geminicli.com/docs/tools/shell)
  - [Web Fetch & Search](https://www.geminicli.com/docs/tools/web-fetch)
- [**MCP Server Integration**](https://www.geminicli.com/docs/tools/mcp-server) -
  Extend with custom tools.
- [**Custom Extensions**](https://geminicli.com/docs/extensions/writing-extensions) -
  Build and share your own commands.

### Advanced Topics

- [**Headless Mode (Scripting)**](https://www.geminicli.com/docs/cli/headless) -
  Use Gemini CLI in automated workflows.
- [**IDE Integration**](https://www.geminicli.com/docs/ide-integration) - VS
  Code companion.
- [**Sandboxing & Security**](https://www.geminicli.com/docs/cli/sandbox) - Safe
  execution environments.
- [**Trusted Folders**](https://www.geminicli.com/docs/cli/trusted-folders) -
  Control execution policies by folder.
- [**Enterprise Guide**](https://www.geminicli.com/docs/cli/enterprise) - Deploy
  and manage in a corporate environment.
- [**Telemetry & Monitoring**](https://www.geminicli.com/docs/cli/telemetry) -
  Usage tracking.
- [**Tools reference**](https://www.geminicli.com/docs/reference/tools) -
  Built-in tools overview.
- [**Local development**](https://www.geminicli.com/docs/local-development) -
  Local development tooling.

### Troubleshooting & Support

- [**Troubleshooting Guide**](https://www.geminicli.com/docs/resources/troubleshooting) -
  Common issues and solutions.
- [**FAQ**](https://www.geminicli.com/docs/resources/faq) - Frequently asked
  questions.
- Use `/bug` command to report issues directly from the CLI.

### Using MCP Servers

Configure MCP servers in `~/.gemini/settings.json` to extend Gemini CLI with
custom tools:

```text
> @github List my open pull requests
> @slack Send a summary of today's commits to #dev channel
> @database Run a query to find inactive users
```

See the
[MCP Server Integration guide](https://www.geminicli.com/docs/tools/mcp-server)
for setup instructions.

## 🤝 Contributing

We welcome contributions! Gemini CLI is fully open source (Apache 2.0), and we
encourage the community to:

- Report bugs and suggest features.
- Improve documentation.
- Submit code improvements.
- Share your MCP servers and extensions.

See our [Contributing Guide](./CONTRIBUTING.md) for development setup, coding
standards, and how to submit pull requests.

Check our [Official Roadmap](https://github.com/orgs/google-gemini/projects/11)
for planned features and priorities.

## 📖 Resources

- **[Free Course](https://learn.deeplearning.ai/courses/gemini-cli-code-and-create-with-an-open-source-agent/information)** -
  Learn the basics.
- **[Official Roadmap](./ROADMAP.md)** - See what's coming next.
- **[Changelog](https://www.geminicli.com/docs/changelogs)** - See recent
  notable updates.
- **[NPM Package](https://www.npmjs.com/package/@google/gemini-cli)** - Package
  registry.
- **[GitHub Issues](https://github.com/google-gemini/gemini-cli/issues)** -
  Report bugs or request features.
- **[Security Advisories](https://github.com/google-gemini/gemini-cli/security/advisories)** -
  Security updates.

### Uninstall

See the [Uninstall Guide](https://www.geminicli.com/docs/resources/uninstall)
for removal instructions.

## 📄 Legal

- **License**: [Apache License 2.0](LICENSE)
- **Terms of Service**:
  [Terms & Privacy](https://www.geminicli.com/docs/resources/tos-privacy)
- **Security**: [Security Policy](SECURITY.md)


---

<p align="center">
  Built for producers, by a producer.<br>
  <a href="https://github.com/julesklord/ducer-cli/tree/ducer">ducer branch</a> ·
  <a href="./plugins_music/README.md">API Reference</a> ·
  <a href="./ROADMAP.md">Roadmap</a>
</p>
