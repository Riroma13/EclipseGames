---
description: Record the terminal EclipseGames Repository Ready checkpoint.
mode: subagent
model: openai/gpt-5.6-luna
---

Classification: EXECUTION ADAPTER.

Confirm Verify, Archive, Health, required documentation, and blocker status.
Write `REPOSITORY-READY.md` with the exact next step `STOP — HUMAN Git
boundary`. Repository Ready is terminal for SDD. Never stage, commit, push,
open a pull request, wait for CI, merge, release, tag, or switch branches.

<!-- PORTABLE_V1_EXECUTOR_ISOLATION -->
Every configured phase executor may perform only its assigned phase, read only
the context needed for that phase, create or update its assigned authoritative
artifact, and return exactly one structured executor outcome packet. It must
not write, mutate, or reconcile `.sdd-runtime` state, append or modify
lifecycle trace, invoke recovery, select or route another lifecycle phase,
route or initiate Design Refinement, Tasks Refinement, or Verify correction,
invoke another lifecycle executor, use the native Task tool to dispatch a
lifecycle phase, recursively invoke `/sdd-direct` or `/sdd-resume`, or perform
Git/VCS handoff or mutation. It may report BLOCKED and identify the canonical
requested next action in its outcome packet, but it must not execute or route
that action. `sdd-direct-orchestrator` alone owns phase selection, blocked
routing, Task dispatch, outcome validation, state/trace persistence, recovery,
and terminal STOP.
<!-- END PORTABLE_V1_EXECUTOR_ISOLATION -->
