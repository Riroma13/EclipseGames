---
name: sdd-apply
description: "Implement SDD tasks from specs and design. Trigger: orchestrator launches apply for one or more change tasks."
disable-model-invocation: true
user-invocable: false
license: MIT
metadata:
  author: gentleman-programming
  version: "3.0"
  delegate_only: true
---

# EclipseGames Apply Policy

This project-local skill is the authoritative EclipseGames executor policy.
It replaces only the global executor-role and workload/chain/size gates. It
does not weaken the repository-native Design, SDD workflow, safety, testing,
privacy, correctness, migration, acceptance, rollback, or terminal Git rules.

## Executor Role

Run as the delegated `sdd-apply` executor. Do not act as an orchestrator, call
`skill()`, delegate, or launch another sub-agent. Execute only assigned tasks
from the resolved approved change.

## Authority And Preflight

Use the approved Design and `docs/SDD-WORKFLOW.md` as authoritative, followed
by the repository-native Tasks/apply-progress artifacts and current
implementation evidence. EclipseGames uses an approved Design → Tasks native
cycle; do not block on an absent standalone proposal or spec file when the
approved Design, Tasks, status, action context, and apply-progress artifacts
are present. Before editing:

1. Consume or build the structured SDD status and require `applyState: ready`.
2. Require a safe `actionContext` and edit roots; stop for missing or unsafe
   status, missing required artifacts, ambiguous change selection, or a real
   Design/privacy/data/correctness blocker.
3. If `applyState: all_done`, do not edit; return the standard completion
   envelope with the appropriate next phase. If it is `ready`, read no more
   than three focused files at a time and keep edits minimal and localized.
4. Read the injected skill paths, applicable specs, approved Design, tasks,
   referenced implementation files, and project configuration.
5. Retrieve any existing apply-progress artifact in full and merge its
   completed tasks and evidence before recording new progress.
6. Resolve the artifact-store mode from status and preserve its canonical
   task and progress updates.

Use these shared references unchanged for skill loading, artifact retrieval,
persistence, status, rollback, and safety mechanics. The generic workload
guard in `sdd-phase-common.md` Section E is superseded for EclipseGames
Apply by the policy in this file; Sections A-D remain applicable.

- `/home/ubuntu/.config/opencode/skills/_shared/sdd-phase-common.md`
- `/home/ubuntu/.config/opencode/skills/_shared/sdd-status-contract.md`
- `/home/ubuntu/.config/opencode/skills/_shared/persistence-contract.md`
- `/home/ubuntu/.config/opencode/skills/_shared/openspec-convention.md`

## Apply Execution

Execute approved tasks in independently verifiable internal work units on the
current SPEC branch. Changed-line count, review-budget metadata, workload
forecasts, delivery decisions, chain or branch strategy, PR topology, and
size-exception metadata are informational only and can never gate Apply. Do
not request approval for, pause on, or require any of those values between
internal work units.

Every unit keeps an explicit rollback boundary, focused verification result,
runtime-harness result or justified `N/A`, and task/artifact provenance. Mark
tasks complete only in the canonical artifact store, merge prior progress, and
re-read the persisted tasks artifact before reporting completion.

## Mandatory Safeguards

- If `sdd-init` reports active Strict TDD and a runner exists, load and follow
  `/home/ubuntu/.config/opencode/skills/sdd-apply/strict-tdd.md`; preserve
  RED-first, GREEN, triangulation, refactor, and TDD evidence requirements.
- Preserve privacy/security boundaries, correctness checks, migration safety,
  acceptance-criteria coverage, task completeness, rollback evidence,
  apply-progress merge semantics, and artifact/provenance checks.
- Do not silently redesign an approved Design or widen the Working Set.
- Keep the executor return envelope aligned with the shared SDD status contract.

Automated Git Handoff remains after Repository Ready only. Release, tagging,
production deployment, destructive Git operations, force-push, and history
rewriting remain maintainer-controlled.

The policy-installation task that creates these definitions is not an Apply
invocation: it must not resume SPEC-0003 Apply or change its code, Tasks,
Design, or Engram progress.
