---
description: Resume one authoritative EclipseGames Portable SDD SPEC.
agent: sdd-direct-orchestrator
---

Classification: EXECUTION ADAPTER.

Resume is the supported recovery mechanism for Portable Direct. It is read-only
until the canonical orchestrator accepts the resolved next action:

1. Identify the project from `.opencode/sdd-model-map.json`.
2. Discover active SPEC directories under `docs/specs/` using runtime state and
   lifecycle evidence, never the highest directory number.
3. Return `STOP` for zero candidates, multiple candidates, corrupt state, or a
   historical/superseded candidate. An explicit `/sdd-direct <SPEC-directory>`
   selector remains available for a maintainer-chosen new or existing active
   SPEC.
4. Read `.sdd-runtime/state.json`, validate its identity, reconcile any trace
   event published before an interruption, and compare the state with the
   authoritative lifecycle artifact names from the profile.
5. Continue from the last completed checkpoint and dispatch only the next
   dependency-ready phase. Completed phases are never repeated.

The result must stop at `Repository Ready`. It never invokes a Git/VCS handoff,
`/sdd-continue`, the retired `/sdd-apply` route, or any ad-hoc continuation
implementation. Use `node scripts/sdd-resume.mjs` for the deterministic resolver
and `--resolve-direct` for its machine-readable form.
