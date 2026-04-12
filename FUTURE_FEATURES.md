# Ducer-CLI Roadmap: Identity & Professional DAW Integration

This document outlines the vision for evolving the Ducer-CLI (Producer Edition)
from a Gemini-based tool into a standalone professional audio production
assistant.

## Phase 1: Identity & Resilience (Q2 2026) - **STABLE**

- [x] Create `ducer` global alias.
- [x] Implement Ducer-specific high-density system prompts.
- [x] **Compatibility Shield**: Protect Ducer from upstream Gemini CLI breaking
      changes.
- [x] **Token-Wise Optimization**: Condensed Technical English logic for cost
      efficiency.
- [x] **Unified Persona**: Ensure all model responses refer to the entity as
      "Ducer".
- [x] **Professional Identity**: High-impact README and AI-generated branding.
- [ ] **Custom Splash Screen**: Replace generic startup with a professional
      ASCII DAW interface.

## Phase 2: REAPER Deep Integration (Current) - **STABLE**

- [x] Static indexing of `db.ReaperKeyMap`.
- [x] Bidirectional file-based bridge (`ReaperBridgeClient`).
- [x] Interactive project context scanning (Tracks, Play state).
- [x] **Complex Routing Lua Generator**: Logic for advanced automation (Stem
      bussing, FX chains).
- [ ] **Live Telemetry**: Real-time monitoring of REAPER CPU and peak levels
      from the CLI.

## Phase 3: Audiovisual & Multimodal (Q3 2026)

- [x] **Multimodal Audio Analysis Engine**: High-fidelity analysis of frequency
      and dynamics.
- [ ] **Video Analysis**: Support for frame-by-frame analysis for film scoring.
- [ ] **MIDI Export**: Allow Ducer to generate and pipe `.mid` files directly
      into REAPER.
- [ ] **Multitrack Stemming**: AI-based file splitting before deep analysis.

## Phase 4: Portability & Hardware (Long Term)

- [x] **DawBridge Abstraction**: Core decoupled from REAPER, ready for new
      integrations.
- [ ] **Multi-DAW Expansion**: Support for Ableton Live and Logic Pro.
- [ ] **MIDI Controller Bridge**: Mapping Ducer commands to physical buttons.
- [ ] **Voice Control**: Native STT (Speech-to-Text) for "hands-free" DAW
      control.
- [ ] **Plugin Wrapper**: VST/CLAP version of Ducer acting as a bridge host
      inside the DAW.

---
*Ducer v0.41.0: Professional, Reliable, and Prototyped.*
