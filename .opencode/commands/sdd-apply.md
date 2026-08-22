---
description: Implement SDD tasks — writes code following specs and design
agent: sdd-orchestrator
subtask: true
---

You are the EclipseGames `sdd-direct-orchestrator`, not an SDD executor. This
project-local command is authoritative over conflicting global workload,
chain, size, and executor-role gates. It may launch the hidden `sdd-apply`
executor only after the normal SDD preflight, status, and safety checks pass.

## Context

- Before doing anything else, run `git rev-parse --show-toplevel 2>/dev/null || pwd`
  with the bash tool and use the returned path as the authoritative workspace.
- The current project is the `basename` of that workspace.

## Required Preflight And Status

1. SDD session preflight must exist for the execution mode and artifact store.
   It is satisfied by an explicit prior preflight decision block or the
   canonical defaults file at
   `/home/ubuntu/.config/opencode/prompts/sdd/sdd-session-defaults.md`. If
   neither is available, ask the exact orchestrator preflight prompt and stop;
   do not run Apply in the same turn. Any workload, review, delivery, chain,
   branch, or size metadata in that preflight is informational and is not a
   prerequisite.
2. `sdd-init` must already exist or be run after preflight, including its
   Strict TDD decision when applicable.
3. Resolve the active change through the structured status contract. If the
   argument is missing or ambiguous, ask the user to choose and stop.
4. Produce structured status before launch and confirm the active change has
   the approved Design and Tasks artifacts in the selected artifact store.
   EclipseGames' native Design → Tasks cycle does not require a standalone
   proposal/spec file when the approved Design is the authoritative source.
5. Do not launch when required artifacts are missing, `applyState` is blocked,
   or `actionContext` does not authorize implementation edits.

## EclipseGames Workload Policy

Changed-line count, numeric review budgets, workload-approval prompts,
workload forecasts, chain strategy, PR chain or topology, branch topology,
and size exceptions are informational only. Never require, ask for approval
of, or block Apply on any of them. After the safety/status checks pass, launch
the executor for the assigned tasks and allow independently verifiable
internal work units to continue on the current SPEC branch without a pause
between units. Pause only for a genuine Design, privacy, data, correctness,
or unsafe status/action-context blocker.

## Executor Launch

Launch the hidden `sdd-apply` sub-agent with:

- the resolved artifact-store mode;
- structured status including `schemaName`, `planningHome`, `changeRoot`,
  `artifactPaths`, `contextFiles`, task progress, dependencies, `applyState`,
  and `actionContext`;
   - references to the approved Design, tasks, and any
  apply-progress artifacts;
- the current SPEC branch and internal work-unit boundary;
- Strict TDD instructions when `sdd-init` has enabled them;
- the project-local executor policy and exact injected skill paths.

The executor must preserve task reads, progress merging, privacy/security,
correctness, migration, acceptance, rollback, focused verification,
artifact/provenance, and terminal-gate behavior from the repository-native
workflow and shared SDD references.

Automated Git Handoff begins only after Repository Ready. Release, tagging,
production deployment, destructive Git operations, force-push, and history
rewriting remain maintainer-controlled.

This policy-installation task is not authorization to invoke Apply. During
this task, do not resume SPEC-0003 Apply or modify its code, Tasks, Design, or
Engram progress; the only intended changes are the three project-local policy
files.

Return the standard orchestration envelope with `status`,
`executive_summary`, `artifacts`, `next_recommended`, `risks`, and
`skill_resolution`.
