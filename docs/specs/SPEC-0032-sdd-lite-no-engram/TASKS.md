# SPEC-0032 — Implementation Tasks

Plain implementation plan; tasks are not lifecycle state.

## One bounded Luna slice

- [x] Document targeted `.ai/context` reads, normal SPEC artifact working
      memory, historical-context exception, and the no-automatic-Engram
      boundary in project `AGENTS.md`.
- [x] Add cheap static/config governance assertions covering the policy,
      command/agent Engram independence, and no runtime memory/state subsystem.
- [x] Record focused test evidence and the remaining OpenCode behavioral risk
      in `VERIFY.md`.

## Expected Change Surface

| Area | Files | Notes |
|---|---|---|
| Policy | `AGENTS.md` | Project-local SDD Lite guidance only. |
| Tests | `scripts/sdd-lite.test.mjs` | Static/config assertions; no product tests. |
| Evidence | `docs/specs/SPEC-0032-sdd-lite-no-engram/{DESIGN,TASKS,VERIFY}.md` | This SPEC only. |

Reduction is free. Expansion beyond this surface is gated by Design and must
not be inferred from a failing assertion.

## Work unit evidence

- Focused command: `pnpm test:sdd-lite`.
- Runtime harness: fresh OpenCode behavioral validation completed successfully;
  zero `engram_mem_*` calls and zero automatic reads of the five context files.
- Rollback boundary: revert only the four listed paths plus this SPEC's three
  artifacts; no product or global configuration behavior changes.

**Critical Terra Verification Gate: NOT REQUIRED.**
