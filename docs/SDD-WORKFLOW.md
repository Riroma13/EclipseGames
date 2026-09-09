---
classification: PRIMARY AUTHORITY
semantic_authority: true
sdd_version: lite
status: ACTIVE/STABLE
---

# EclipseGames SDD Lite

`docs/architecture/sdd-lite.md` is the detailed contract. This document keeps
the repository's operational authority short and explicit.

## Workflow

```text
DESIGN -> BUILD -> VERIFY -> SHIP
```

`DESIGN.md` is the primary contract. `TASKS.md` is a plain implementation plan.
`VERIFY.md` records evidence and residual risk. `REVIEW.md` is optional for
work where review adds value. No other lifecycle artifact or state store is
authoritative.

## Levels

- Level A: small/local work; Luna throughout.
- Level B: normal feature; Sol Design, Luna Build, Luna Verify.
- Level C: architecture, migration, privacy/security, or significant
  cross-domain work; Sol Design, optional Terra review, Luna Build, Terra
  Verify when delicate.

Terra is a justified reviewer, not a routine lifecycle gate.

## Stage contracts

### Design

Define behaviour, scope, ownership, data/API/UI effects, migration and rollout,
privacy/failure boundaries, tests, acceptance, and simplicity. Build cannot
silently change scope or architecture.

### Build

Derive or update `TASKS.md`, implement the approved Design, test, fix, and
document continuously. Return to Design for material decisions. Build never
Ships and never performs Git/VCS actions.

### Verify

Compare Design, Tasks, code, tests, privacy, and acceptance. Run sufficient
checks and write `VERIFY.md`. Defects return to Build. Completion is based on
semantic evidence, never parser markers.

### Ship

The `/sdd-ship` invocation itself is explicit maintainer authorization. It may
perform final verification, intended-diff staging, commit, push, PR, CI wait,
and green merge. With no SPEC argument, Ship infers the sole obvious verified
candidate from the current branch, relevant SPEC/VERIFY.md evidence, and
working tree. It asks only when multiple plausible candidates remain. It must
preserve unrelated work and never force, reset, rewrite history, switch
branches, tag, release, deploy, or act on ambiguous scope.

## Commands

- `/sdd-start <change>` creates or refines Design and enters Build.
- `/sdd-resume [SPEC]` continues evident incomplete work from repository
  artifacts and implementation evidence.
- `/sdd-verify [SPEC]` creates or refreshes `VERIFY.md` without Git/VCS work.
- `/sdd-ship [SPEC]` is the sole explicit Git/VCS handoff; `[SPEC]` is optional
  when repository evidence identifies one obvious verified change.

Resume never reactivates completed work, guesses between ambiguous SPECs, or
uses hidden runtime state. Start and Resume stop for material ambiguity.

## Privacy and safety

Student names require protected access, retention, and backups. Projection DTOs
remain server-side allowlists. Stop for meaningful privacy/security exposure,
unsafe migration, contradictory requirements, major unapproved scope, or
unresolved essential failures.

## SPEC-0017 cutover

SPEC-0017 is closed under SDD Lite by preserving `DESIGN.md`, `TASKS.md`, useful
historical `ARCHITECTURE-REVIEW.md`, and approved M0 context changes, then
creating `VERIFY.md`. Portable Apply, Apply Summary, runtime state, traces,
recovery, and related checkpoint artifacts are obsolete and are not completed.
