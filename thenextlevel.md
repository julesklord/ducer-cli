# Ducer-CLI: Execution Handoff and Next-Level Roadmap

**Status**: Active implementation handoff  
**Audience**: Gemini CLI or any follow-up coding agent  
**Goal**: Continue Ducer step by step without losing scope or re-opening already
solved work  
**Rule**: Do not jump to speculative features before finishing the stabilization
items listed here

---

## 1. What Was Completed

### 1.1 Tool Surface Cleanup

Completed: Removed unimplemented tool declarations from
`plugins_music/src/tools_manager.ts`.

### 1.2 DucerCore Tool Loop Hardening

Completed: Standardized orchestration cycle and introduced
`runToolAwareLoop(...)`.

### 1.3 Audio Analyzer Test Alignment

Completed: Updated tests to match real implementation (mocking `execFile`).

### 1.4 Local Heavy-Processing Validation

Completed: Added high ceilings for local processing in `media_handler.ts`.

### 1.5 Stem Separation Architecture

Completed: Clean backend abstraction for `demucs` and `uvr` in
`stem_separator.ts`.

### 1.6 Stem Separation Integration

Completed: First-class workflows in `ducer_core.ts` and `router.ts`.

### 1.7 Atomic File IPC (P0)

Completed:

1. REAPER bridge writes use atomic temp-write + rename.
2. Queue persistence uses atomic temp-write + rename.
3. Claims are atomic via `running` status transition.

### 1.8 Harden Daemon / Job Queue (P1)

Completed:

1. Respects `queue_file` from upstream config.
2. `resetStaleJobs()` recovers interrupted tasks on startup.
3. Added `attempts` tracking with a limit of 3 to prevent poison-pill loops.

### 1.9 Analyze Stems Pipeline (P2)

Completed:

1. Integrated `--dir` mode into `ducer analyze`.
2. Automatic directory scanning for audio files.
3. `generateComparativeReport()` creates an aggregated mixing audit for the
   whole folder.
4. Fully queue-compatible for asynchronous large-scale analysis.

### 1.10 Structured Logging (P3)

Completed:

1. Centralized `DucerLogger` in `logger.ts`.
2. Structured `.jsonl` output in `~/.ducer/logs/`.
3. Tracked events: analysis starts/completes, separation starts/completes, job
   lifecycle, and REAPER commands.

---

## 2. Current Reality of the Codebase

- **Production Ready**: The music layer is now stable, auditable, and capable of
  heavy asynchronous batch work.
- **TUI Integration**: The interactive mode is stable on Windows and loads the
  Ducer identity by default.
- **Reliability**: IPC and Queueing race conditions have been surgically
  eliminated.

---

## 3. Highest-Priority Remaining Work

### P4. Batch Audio Utility Tools

**Status**: not implemented  
**Priority**: medium

Why:

- Practical production value for cleaning up large stem folders.
- No AI logic needed; just robust subprocess execution.

Target tools:

1. `batch_convert`: (e.g., WAV -> FLAC/MP3)
2. `normalize_stems`: Standardize gain across a directory.

---

## 4. Features That Should Wait

Do not prioritize these until P4 is done:

- web/terminal dashboards
- marketplace integrations
- AI master bus simulation
- multi-DAW support

---

## 5. Suggested Next Exact Task

### Task: Implement `ducer batch normalize`

1. Add `normalize_audio` to `media_handler.ts` (using ffmpeg or specialized
   CLI).
2. Wire it into `DucerCore` for directory processing.
3. Add it to the Job Queue.
4. Expose via CLI: `ducer batch-normalize --dir <path>`.

---

## 6. Files Added or Modified in This Phase

- `plugins_music/src/logger.ts` (NEW)
- `plugins_music/src/job_queue.ts`
- `plugins_music/src/router.ts`
- `plugins_music/src/ducer_core.ts`
- `plugins_music/src/reaper_bridge_client.ts`
- `packages/cli/src/commands/ducer.ts`
- `packages/cli/src/config/config.ts`

---

## 7. Guardrails

- English only for code/docs.
- No fake tools.
- Favor deterministic local workflows.
- Validate with `npm run build` after any config change.

---

## 8. Release History

- **v1.0.0-alpha.1**: First public alpha release. stabilization phase completed.

---

## 9. Bottom Line

Stabilization phase is **COMPLETED**. Ducer is now a robust, auditable engine.
The next mission is **Batch Utility expansion**.
