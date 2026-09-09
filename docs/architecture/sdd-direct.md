---
classification: EXECUTION ADAPTER
semantic_authority: false
workflow_semantics: docs/SDD-WORKFLOW.md
persistence: hybrid
---

# Portable Direct Execution Adapter

This document defines the local wiring only. It does not redefine lifecycle
meaning or gate semantics; those belong exclusively to `docs/SDD-WORKFLOW.md`.

## Execution Boundary

`/sdd-direct` is the canonical entry point. `sdd-direct-orchestrator` owns one
runtime transition at a time through `scripts/sdd-runtime.mjs`. The runtime
stores exact state, trace, recovery locks, and checkpoint metadata below the
selected SPEC's `.sdd-runtime/` directory. Product requirements remain in the
normal SPEC artifacts, not in runtime metadata.

The profile in `.opencode/sdd-model-map.json` is the project adapter. It maps
the repository's `docs/specs/<SPEC>` authority and historical uppercase artifact
names onto the generic Portable runtime. The adapter does not create
`openspec/specs/`, copy product artifacts, or move historical SPEC directories.

## Executor Outcome Contract

Every phase executor returns exactly one packet with these top-level keys:

```yaml
change: <SPEC directory name>
action: <canonical lifecycle action>
role: SOL | HIGH | MID | LOW | HUMAN
status: PASS | BLOCKED | FAILED
checkpointArtifact: <profile artifact basename>
artifacts: [<checkpointArtifact and auxiliary evidence strings>]
evidence: [<string>]
next: <canonical next action>
blocker:
  class: <runtime blocker class>
  human_required: <boolean matching the class policy>
  reason: <non-empty string>
  resume_phase: null | <canonical action>
```

`blocker` is absent for `PASS` and required for `BLOCKED` or `FAILED`.
`checkpointArtifact` must equal the profile mapping and must appear in
`artifacts`; auxiliary evidence never selects a checkpoint.

## Native Dispatch Contract

The Luna `sdd-direct-orchestrator` is the only dispatcher. It reconciles the
selected on-disk SPEC and runtime state, resolves the single next phase, and
looks up `phase_executors[phase]` in `.opencode/sdd-model-map.json`. It then
invokes the OpenCode-native Task tool exactly once with
`subagent_type: <named phase executor>` and receives one outcome packet. The
orchestrator validates and persists that packet through
`scripts/sdd-runtime.mjs`; the child never persists state or trace, selects a
later phase, invokes another lifecycle Task, or performs Git/VCS work.

Bounded manual smoke procedure (not part of the offline test suite): invoke
`/sdd-direct <active-SPEC-directory>` in OpenCode with trace logging enabled,
then inspect the parent and child session metadata. The parent must be
`sdd-direct-orchestrator` / `openai/gpt-5.6-luna`; the child must be the exact
phase executor from `phase_executors` and its configured role model (for
example Architecture Review → `sdd-direct-architecture-review` /
`openai/gpt-5.6-terra`). Confirm one child outcome packet and one runtime trace
transition, with no child-authored `.sdd-runtime/state.json` or trace write.

## Persistence And Recovery

The orchestrator validates project identity, artifact path containment,
profile/configuration fingerprints, and outcome provenance before atomic state
publication. Trace events are append-only and hash chained. A recovery lock is
exclusive and removed only after the bounded recovery operation completes.

Resume reconciles an event-first interruption and authoritative phase artifacts
before dispatch. A corrupt or ambiguous record stops rather than guessing.

## Terminal Boundary

Repository Ready is the terminal SDD checkpoint. The adapter can prepare a
human-readable handoff report, but it cannot invoke Git add/commit/push, pull
request creation, CI waiting, merge, release, or tag operations. `gitMutationBarrier`
rejects those operations even when requested by a phase outcome.
