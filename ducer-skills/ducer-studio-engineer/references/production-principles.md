# Production Principles

## Goal

Turn Ducer into a tool a producer or engineer can trust during real session work.

## What that means

- Favor repeatable workflows over one-off demos.
- Prefer transparent system behavior over cleverness.
- Design around session reality: long-running jobs, external binaries, DAW state, missing files, partial failures, and iterative experimentation.

## Implementation bias

- Put orchestration in TypeScript, heavy media work in proven external tools.
- Keep subprocess contracts explicit: inputs, outputs, progress, failure mode.
- Expose presets and sensible defaults, but allow expert override for model, device, paths, and output locations.

## Product bias

- A feature is incomplete if the user cannot see status, understand errors, or find the output artifact.
- A feature is weak if it cannot batch, resume, or at least fail cleanly.
- A roadmap item matters when it shortens real creative work: auditioning, organizing, separating, analyzing, routing, exporting, comparing.

## Collaboration bias

- When code and plan disagree, trust code first and update the plan.
- When upstream constraints fight the product vision, isolate repo-local behavior behind plugin boundaries.
- When external tooling is unstable, improve detection and diagnostics before adding more features on top.
