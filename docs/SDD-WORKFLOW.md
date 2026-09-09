---
classification: PRIMARY AUTHORITY
semantic_authority: true
sdd_version: portable-v1
status: ACTIVE/STABLE
persistence: hybrid
---

# EclipseGames SDD Workflow

This document is the single semantic authority for the EclipseGames Portable
v1 lifecycle. `AGENTS.md` supplies repository safety and startup rules. The
project profile in `.opencode/sdd-model-map.json` supplies configurable paths,
artifact names, semantic Design topics, role routing, and archive behavior.
No command, agent, runtime state file, or memory record can redefine this
workflow.

## Quick Path

1. Select one active SPEC directory under `docs/specs/`, explicitly or through
   the deterministic resolver.
2. Resume from `.sdd-runtime/state.json` after reconciling trace and artifacts.
3. Execute only the next dependency-ready phase.
4. Stop at Repository Ready for HUMAN Git handoff.

## Authority And Storage

`docs/specs/` is the only product/spec authority. EclipseGames active change
roots are `docs/specs/<SPEC-DIRECTORY>/`; the runtime does not create or use a
second product/spec tree. Runtime metadata is control-plane-only and lives at:

```text
docs/specs/<SPEC-DIRECTORY>/.sdd-runtime/
  state.json
  trace/
  recovery/
  locks/
  checkpoints/
```

The runtime directory contains state, trace, recovery, lock, and checkpoint
metadata only. It must not contain product requirements, acceptance criteria,
domain rules, or implementation decisions.

The profile maps and validates these repository-native artifact names without
renaming historical files:

| Meaning | Canonical artifact |
|---|---|
| Design | `DESIGN.md` |
| Architecture Review | `ARCHITECTURE-REVIEW.md` |
| Tasks | `TASKS.md` |
| Tasks Review | `TASKS-REVIEW.md` |
| Apply progress | `APPLY-PROGRESS.md` |
| Apply Summary | `APPLY-SUMMARY.md` |
| Verify | `VERIFY-REPORT.md` |
| Archive | `ARCHIVE-REPORT.md` |
| Health Report | `HEALTH-REPORT.md` |
| Repository Ready | `REPOSITORY-READY.md` |

Historical records are evidence, not executable instructions. Use explicit
`CURRENT`, `HISTORICAL`, or `SUPERSEDED` markers when reconciling context.
Never manufacture absent historical artifacts, including `SPEC.md`, review
reports, Tasks Review, or Repository Ready files.

## Canonical Lifecycle

```text
Design
  -> Architecture Review
       BLOCKED -> Design Refinement -> Architecture Review
  PASS
  -> Tasks
  -> Tasks Review
       BLOCKED -> Tasks Refinement -> Tasks Review
  PASS
  -> Apply
  -> Apply Summary
  -> Verify
       BLOCKED -> bounded correction -> Verify
  PASS
  -> Archive
  -> Health Report
  -> Repository Ready
  -> STOP
```

Refinement is conditional and returns to its review. Apply Summary is a
separate checkpoint immediately after Apply. There is no Workload Guard phase,
proposal phase, ad-hoc Continue phase, or parallel Apply lifecycle. The retired
`/sdd-apply` route is a STOP-only compatibility shim.

Each transition is legal only when the current checkpoint, artifact, outcome,
and required evidence agree. A malformed, ambiguous, corrupt, or stale record
fails closed. One bounded automatic correction may be attempted where the
approved Design permits it; material architecture, privacy, security, scope,
risk, data-integrity, and recovery decisions are HUMAN-owned.

## Design Semantics

Design validation is profile-driven. The EclipseGames profile declares semantic
topics, heading aliases, review semantics, optional topics, and lifecycle
artifact names. A valid Design must contain non-empty meaning for every
mandatory topic. Heading depth, numbering, and exact wording may vary; a file
that merely contains headings or placeholder text fails. The validator must
accept the existing repository-native Design structures and reject a genuinely
missing mandatory meaning.

The Portable generic validator remains available for projects whose profile
declares the generic numbered Design shape. EclipseGames does not adopt that
shape as a product requirement.

## Active SPEC Discovery

Discovery is evidence-based and deterministic:

| Candidate count | Result |
|---:|---|
| 0 | `STOP` with an explicit `no-active-spec` result |
| 1 | Select that candidate |
| 2 or more | `STOP` with candidate names and no guess |

Runtime state, current lifecycle artifact status, and explicit profile markers
are authoritative. Archived, superseded, historical, Repository Ready, and
stale metadata cannot reactivate a SPEC. The resolver never selects the highest
numbered directory. `/sdd-direct <SPEC-directory>` is the explicit selector;
it must still reject a historical or unsafe path.

## Resume And Recovery

Resume must:

1. identify the EclipseGames project and load the profile;
2. discover active SPEC candidates under `docs/specs/`;
3. read and validate the selected `.sdd-runtime/state.json`;
4. validate identity, fingerprints, locks, and trace continuity;
5. reconcile an event-first interruption with the authoritative artifact files;
6. determine the last completed checkpoint and next dependency-ready phase;
7. continue without repeating completed phases; and
8. stop at Repository Ready without entering Git operations.

Recovery is append-only and lock-protected. It may repair only a proven
runtime interruption through the supported `/sdd-resume` mechanism. It must not
infer a successful phase from a missing or ambiguous artifact.

## Roles And Routing

Logical roles are configured in `.opencode/sdd-model-map.json`:

| Role | Model | Boundary |
|---|---|---|
| SOL | `openai/gpt-5.6-sol` | Design authoring and Design Refinement |
| HIGH | `openai/gpt-5.6-terra` | Architecture Review and Verify |
| MID | `openai/gpt-5.6-luna` | Tasks, orchestration, Apply |
| LOW | `openai/gpt-5.6-luna` | Bounded evidence and mechanical reports only |
| HUMAN | None | Git, merge, release, tag, and material decisions |

LOW is truthful Luna reuse, not an invented low-tier model. Its profile is
explicitly bounded by evidence-only context, a token budget, no architecture
decisions, no scope expansion, and no Git mutation. Provider exhaustion stops
with HUMAN_HANDOFF; routing never crosses logical roles.

## Human Git Boundary

Repository Ready is the terminal SDD boundary. The Portable runtime, commands,
agents, and permissions must not run or authorize:

- `git add`, commit, push, pull request creation, or CI waiting;
- merge, release, tag, reset, checkout, branch switching, or history rewrite;
- production deployment or any destructive VCS operation.

The human maintainer owns the post-Repository-Ready handoff. Older context
claims that described an automated delivery route are historical or superseded
by this rule and must not be treated as executable policy.

## Failure Semantics

Use these classifications consistently:

- `BLOCKER`: continuation risks correctness, privacy, security, data integrity,
  or an impossible acceptance criterion;
- `CONDITION`: non-blocking evidence carried into the next checkpoint;
- `NON-BLOCKING`: recorded improvement or debt outside the acceptance gate.

Do not hide a required test failure as a condition, fabricate missing evidence,
or turn a product rule into runtime metadata.
