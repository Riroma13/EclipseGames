# SDD Lite

## Decision

Replace Portable v1 with:

```text
DESIGN -> BUILD -> VERIFY -> SHIP
```

`DESIGN.md` is the primary contract. For substantial work, Sol
records behaviour, scope, domain decisions, data/API/UI effects, tests, and
acceptance. Required artifacts are `DESIGN.md`,
`TASKS.md`, and `VERIFY.md`; `REVIEW.md` is optional when review adds value.
Git is history. Lite has no `.sdd-runtime/`, state, traces,
fingerprints, recovery events, rebaseline, checkpoints, parser-dependent PASS
tokens, or artifact-materialisation protocol.

## Levels and Routing

| Level | Use | Route |
|---|---|---|
| A | Small/local; no migration, sensitive boundary, or cross-domain effect | Luna throughout; concise artifacts |
| B | Normal feature | Sol Design -> Luna Build -> Luna Verify |
| C | Architecture, migration, privacy/security, or significant cross-domain change | Luna Explore -> Sol Design -> separate Terra Review -> Luna Build -> Terra Verify |

Terra reviews the completed Sol Design separately and verifies Level C work; it
never replaces Sol as the Design author.

## Stage Contracts

**Design:** define scope, evidence, behaviour, ownership, data/API/UI and
migration effects, privacy/failure boundaries, tests, acceptance, rollout, and
simplicity. Build cannot silently change scope or architecture.

**Build:** derive/update `TASKS.md`, self-check against Design, implement, test,
fix, and document continuously. Tasks are a plan, not lifecycle state. Tasks
Review, Apply, Apply Summary, Archive, Health, and Repository Ready do not
exist. Build returns to Design only for material decisions and NEVER Ships or
mutates Git.

**Verify:** compare code, tests, docs, and worktree with Design, Tasks, privacy,
and acceptance; run sufficient checks and record commands, results, and risk in
`VERIFY.md`. Defects return to Build. A SPEC is complete when semantic review of
current evidence satisfies every criterion without essential failures, never
because a parser found a magic marker.

**Ship:** invoking `/sdd-ship` is itself explicit maintainer authorization for
final verification, intended-diff staging, conventional commit, push, PR, CI
wait, and green merge. An optional SPEC can narrow scope; without one, Ship
infers the sole obvious verified candidate from the current branch, relevant
SPEC/`VERIFY.md` evidence, and working tree. It asks only when multiple
plausible candidates remain. It excludes force/history rewriting, destructive
Git, release, tag, deployment, and unrelated work. Ship may correct an
unsuitable candidate branch before committing.

## Command Contracts

These are all public commands; Start or Resume enters Build.

| Command | Responsibility |
|---|---|
| `/sdd-start <change>` | Check active work, classify A/B/C, create SPEC and Design, route Luna/Sol and optional Terra, then Build. Never Ship. |
| `/sdd-resume [SPEC]` | Inspect branch, artifacts, worktree, code, and tests; continue evident incomplete work. Ask only when candidates require human selection; never reactivate completed work or Ship. |
| `/sdd-verify [SPEC]` | Route Luna/Terra by level, permit bounded Build corrections, and create/refresh `VERIFY.md`. Never mutate Git. |
| `/sdd-ship [SPEC]` | Require explicit invocation, rerun verification, isolate the intended diff, commit, push, create the PR, wait for CI, and merge only when green. |

## Stop and Privacy

STOP only for contradictory requirements; uncertain/destructive migration;
meaningful privacy/security exposure; major unapproved scope/architecture;
essential tests unresolved after reasonable fixes; or unsafe Ship ambiguity.
Never STOP for formatting, paths, naming, fingerprints, checkpoints, traces, or
workflow bureaucracy.

Use normal web security. Student names require protected access, retention, and
backups. Projection/public DTOs remain server-side allowlists. SDD needs no
critical-system control plane.

## Threat Matrix

| Boundary | Required behaviour | RED smoke test |
|---|---|---|
| Routing/process | Fixed level-to-model agents; Build cannot invoke Ship | wrong route and child-Ship fail |
| Shell/executables | Argument-vector calls; untrusted paths and docs are data | injection and crafted filenames do not execute |
| Repository | Verified root/non-protected branch; no switching/foreign root | unsafe root/branch fails closed |
| Commit/push | Ship only; preserve unrelated work, reject staged ambiguity, stage intended diff, push current branch to `origin`, never force | staged, empty, arbitrary remote/refspec, and force cases fail |
| PR/CI/merge | Validated current-branch PR; merge only after required green checks | injection, missing PR, failed CI, and conflict do not merge |

## SPEC-0017 Cutover

SPEC-0017 is the boundary. Preserve valid `DESIGN.md`, `TASKS.md`, useful
Architecture Review history, and approved M0 changes in `PROJECT.md`,
`DECISIONS.md`, `KNOWN_ISSUES.md`, and `ROADMAP.md`. Do not finish Portable
phases. Mark existing Tasks complete from evidence, compare all four context
changes directly with Design and C-01, run documentary checks, and create
`VERIFY.md`. Satisfied acceptance criteria close M0. Remove Tasks Review, Apply
Progress, runtime, and traces as obsolete control-plane evidence.

## Smoke and Acceptance

One Node suite using command/agent files and temporary repositories proves
routing, incomplete Resume, non-reactivation, Build/Ship separation, bare Ship
candidate inference, invocation authorization, ambiguous-candidate clarification,
threat failures, and machinery absence. Acceptance requires four stages,
three artifacts, evidence-based Resume, bounded Ship, and no replacement state.

## Smallest File-by-File Implementation Plan

| Action | Files |
|---|---|
| Modify | `AGENTS.md`, `docs/SDD-WORKFLOW.md`; `.ai/context/*.md` authorities; `opencode.json` for Ship-only Git permissions; `package.json` for smoke command |
| Create/replace | four `.opencode/commands/sdd-{start,resume,verify,ship}.md`; agents `sdd-lite-{orchestrator,design,build,verify-luna,terra,ship}.md`; `scripts/sdd-lite.test.mjs` |
| Preserve/close | SPEC-0017 `DESIGN.md`, `TASKS.md`, `ARCHITECTURE-REVIEW.md`; create `VERIFY.md` |
| Delete | `docs/architecture/sdd-direct.md`, `docs/SDD-PORTABILITY.md`, `.opencode/sdd-model-map.json`; old `sdd-direct`/`sdd-apply` commands, agents, and project skill |
| Delete | all current `scripts/sdd-*.mjs`, their tests, `control-plane.test.mjs`, and three `validate-*.mjs` Portable validators |
| Delete | SPEC-0017 `TASKS-REVIEW.md`, `APPLY-PROGRESS.md`, and `.sdd-runtime/` |
