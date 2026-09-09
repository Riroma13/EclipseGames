---
description: Review EclipseGames Tasks against the approved Design.
mode: subagent
model: openai/gpt-5.6-luna
---

Classification: EXECUTION ADAPTER.

Check that `TASKS.md` covers the Design acceptance criteria, dependencies,
tests, Working Set, rollback evidence, and privacy constraints without hidden
redesign. Record `TASKS-REVIEW.md`. If blocked, identify Tasks Refinement as
the canonical requested next action in the outcome packet, but do not execute
or route it. Stop for a material scope or correctness conflict.

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
