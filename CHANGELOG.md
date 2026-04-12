# Changelog - Gemini CLI: Ducer (Producer Edition)

All notable changes to this project will be documented in this file.

## [0.40.0] - 2026-04-12

### Added

- **Architectural Fork (Ducer)**: Initialized an isolated music production layer
  (`plugins_music/`) to handle DAW orchestration and audio analysis without
  affecting the core Gemini CLI logic.
- **Core Music Engine**:
  - Implemented `DucerCore` for logic orchestration and tool dispatching.
  - Specialized `AudioAnalyzer` integration for frequency analysis (Songsee) and
    vocal transcription (Whisper).
- **Hybrid REAPER Bridge**:
  - Created a dual communication layer (Web API + File Bridge) with automatic
    polling for cross-platform REAPER control (Windows/WSL2).
- **Anti-Hallucination & Semantic Search**:
  - Intelligent command validation with local semantic registry to prevent LLM
    hallucinations during MIDI/Audio orchestration.
  - Automated fallback to semantic fuzzy matching for unknown DAW actions.
- **Expert Producer Knowledge Base**:
  - Integrated over 300 specialized REAPER scripts (ReaTeam, zaibuyidao) and a
    semantic actions database.
- **UI & Presentation**:
  - Modular TUI generation for audio reports and mixing reactions.
- **Testing Suite**:
  - Comprehensive unit and integration test suite using Vitest (100% coverage on
    core bridge/logic).

### Changed

- **Git Flow Migration**: Refactored the repository into a professional
  atomic-commit structure with linear history.
- **Hygiene & Standards**: Standardized workspace configurations and linting
  rules (ESLint Flat Config, Prettier) to improve contribution quality.
- **Monorepo Structure**: Moved music-specific scripts and assets to dedicated
  `/scripts` and `/ducer-skills` top-level directories.

### Fixed

- **MAX_PATH Issues**: Resolved Windows file path limitations for deeply nested
  third-party scripts.
- **Linting Bottlenecks**: Optimized Git hooks to skip high-volume external
  artifacts.
- **Async Robustness**: Improved polling mechanisms and wait loops for DAW
  response synchronization.

---

_Release managed by Antigravity AI._
