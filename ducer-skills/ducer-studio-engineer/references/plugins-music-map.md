# plugins_music Map

## Main runtime surfaces

- `router.ts`
  CLI entry point for music commands. Owns argument handling, queue handoff, service mode, and daemon mode.

- `ducer_core.ts`
  Main domain orchestrator. Best place for feature behavior, tool dispatch, batch summaries, and cross-tool production flows.

- `tools_manager.ts`
  Gemini tool declarations. Update this when adding or reshaping the tool contract exposed to the model.

- `pipeline_orchestrator.ts`
  Higher-level intent pipelines. Useful when a workflow spans multiple atomic tools and should feel like one producer action.

## Integration and I/O

- `reaper_bridge_client.ts`
  REAPER bridge surface. Keep transport, validation, script execution, and status retrieval behind this boundary.

- `reaper_kb_manager.ts`
  Local indexing of REAPER actions and scripts. Important for discoverability and anti-hallucination behavior.

- `job_queue.ts`
  Persistence and state transitions for long-running work. Treat file writes and retries as reliability-critical.

## Media operations

- `stem_separator.ts`
  External-tool wrapper for stem separation providers and progress handling.

- `media_handler.ts`
  Lower-level audio file processing helpers such as conversion and normalization.

- `audio_analyzer.ts`
  Analysis logic and user-facing technical insight generation.

## Tests worth checking first

- `stem_separator.test.ts`
- `ducer_core.test.ts`
- `reaper_bridge_client.test.ts`
- `job_queue.test.ts`
- `media_handler.test.ts`

## Practical rule

If a change affects command behavior, inspect `router.ts` and `ducer_core.ts` together. If it affects tool execution, inspect the relevant provider plus `tools_manager.ts` and any consumer UI.
