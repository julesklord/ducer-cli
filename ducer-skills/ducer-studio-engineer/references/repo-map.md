# Repo Map

## High-value areas

- `plugins_music/src`
  Core production layer. Contains `DucerCore`, routers, queue/daemon behavior, REAPER bridge code, stem separation, media handling, and orchestration.

- `web-controller`
  UI and browser-facing control surface. Keep it aligned with backend job semantics and progress reporting.

- `ducer-skills/reaper-control`
  REAPER-facing skill assets and knowledge base. Important when command lookup, semantic registry behavior, or DAW-side automation is involved.

- `.plans`
  Working design notes and roadmap material. Useful for intent, but always verify against current code before implementing.

- `packages/*`
  Upstream Gemini CLI workspaces. Touch these carefully; many failures here are unrelated to the music plugin.

## Typical entry points

- CLI/music command routing: `plugins_music/src/router.ts`
- Domain orchestration: `plugins_music/src/ducer_core.ts`
- Pipeline logic: `plugins_music/src/pipeline_orchestrator.ts`
- REAPER integration: `plugins_music/src/reaper_bridge_client.ts`, `plugins_music/src/reaper_kb_manager.ts`
- Stem separation: `plugins_music/src/stem_separator.ts`

## Build and validation habits

- Validate music plugin changes with:
  `npm run build --workspace @google/gemini-cli-plugin-music`

- Run the root build only when the change plausibly affects shared workspaces, and be ready to distinguish repo-wide environment failures from your actual change.
