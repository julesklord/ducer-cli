# Ducer-CLI Roadmap: Identity & Professional DAW Integration

This document outlines the vision for evolving the Ducer-CLI (Producer Edition)
from a Gemini-based tool into a standalone professional audio production
assistant.

## Phase 1: Identity & Rebranding (Q2 2026)

- [x] Create `ducer` global alias.
- [x] Implement Ducer-specific system prompts (Producer/Engineer persona).
- [ ] **Custom Splash Screen**: Replace generic startup with a professional
      ASCII DAW interface.
- [ ] **Unified Persona**: Ensure all model responses refer to the entity as
      "Ducer".
- [ ] **Branded Artifacts**: Complete the transition of all report themes to the
      high-contrast Ducer aesthetics.

## Phase 2: REAPER Deep Integration (Current)

- [x] Static indexing of `db.ReaperKeyMap`.
- [x] Bidirectional file-based bridge (OpenClaw).
- [x] Interactive project context scanning (Tracks, Play state).
- [ ] **Complex Routing Lua Generator**: Train the model context to generate
      advanced routing scripts (Sidechaining, Stem-bussing).
- [ ] **Live Telemetry**: Real-time monitoring of REAPER CPU and peak levels
      from the CLI.

## Phase 3: Audiovisual & Multimodal (Q3 2026)

- [ ] **Video Analysis**: Support for frame-by-frame analysis for film scoring.
- [ ] **MIDI Export**: Allow Ducer to generate and pipe `.mid` files directly
      into REAPER.
- [ ] **Multitrack Stemming**: Integration with AI stemming libraries to split
      files before analysis.

## Phase 4: Hardware & Ecosystem (Long Term)

- [ ] **MIDI Controller Bridge**: Mapping Ducer commands to physical buttons.
- [ ] **Voice Control**: Native STT (Speech-to-Text) for "hands-free" DAW
      control.
- [ ] **Plugin Wrapper**: A VST/CLAP version of Ducer that hosts the CLI logic
      inside the DAW.
