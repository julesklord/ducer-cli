# Integration Surfaces

## Critical contracts

### CLI <-> DucerCore

- `router.ts` should stay thin.
- Validation, summaries, and domain-specific branching should usually live in `ducer_core.ts` or dedicated modules.

### DucerCore <-> external media tools

- Keep subprocess arguments explicit and typed.
- Preserve useful failure output from stdout/stderr.
- Expose progress in a stable way that downstream consumers can rely on.

### DucerCore/CLI <-> queue daemon

- Long-running work should move through `job_queue.ts` and the daemon when async behavior matters.
- Job state transitions must be explicit: `pending`, `running`, `completed`, `failed`, `cancelled`.
- Atomic file writes are part of the product, not an implementation detail.

### Backend <-> web-controller

- Check both `web-controller/server.js` and `web-controller/public/index.html` when changing status or progress behavior.
- The current web controller listens for `PROGRESS: <n>%` markers in command output. If backend progress changes to logger events or another channel, update the server contract too.
- Avoid duplicating business logic in the browser when the backend already owns the truth.

### Backend <-> REAPER

- Protect command execution with validation whenever the action ID may be model-generated.
- Keep file-system IPC and Web API assumptions explicit and debuggable.
- Return outputs that support recovery when REAPER is unavailable or partially configured.

## Common failure patterns

- A TypeScript change compiles locally in `plugins_music` but breaks a UI assumption in `web-controller`.
- A progress reporting improvement removes the exact stdout text another layer was parsing.
- A new tool is added in code but not declared in `tools_manager.ts`.
- A queue or daemon change works in the happy path but leaves stale running jobs after interruption.

## Review checklist for cross-surface changes

1. Is the command/tool contract consistent across router, core, and consumer?
2. Is progress/status observable by the layer that needs it?
3. Do errors preserve enough detail for diagnosis?
4. Does async behavior leave behind a stable artifact or job result?
5. Did you run the most relevant build/test target for each touched surface?
