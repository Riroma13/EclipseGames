# SPEC-0034 Design

## Scope

Make `/sdd-resume` deterministic and keep routine project-local shell work
autonomous for the SDD Lite orchestrator and Luna Build agent.

## State contract

- Missing `DESIGN.md` fails closed toward `/sdd-start`.
- Existing Design without Tasks invokes one Luna planning-only Build child,
  creates `TASKS.md`, returns `TASKS READY`, and stops.
- Existing incomplete Tasks invokes exactly the first incomplete slice.
- Completed Tasks stop toward `/sdd-verify`.

## Safety

The orchestrator retains fail-closed child routing. Non-Ship Git/GitHub and
destructive shell operations remain denied. Terra is not required.

## Expected Change Surface

`.opencode/commands/sdd-resume.md`, `.opencode/agents/sdd-lite-orchestrator.md`,
`.opencode/agents/sdd-lite-build.md`, `opencode.json` only if required by
source configuration, `scripts/sdd-lite.test.mjs`, and this SPEC artifact set.

Critical Terra Verification Gate: NOT REQUIRED
