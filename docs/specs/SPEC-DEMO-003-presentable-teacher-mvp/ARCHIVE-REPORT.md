# Archive Report: SPEC-DEMO-003 — Presentable Teacher MVP

## Final outcome

**Archived:** 2026-08-30  
**Result:** `PASS WITH WARNINGS` — archive eligible under the repository-native EclipseGames workflow.  
**Repository Ready:** Pending Health Report.  
**VCS handoff:** None. No commit, push, merge, release, tag, branch switch, or Git handoff occurred.

The change is closed as a completed documentation and implementation cycle. The repository-native archive is this report in the change folder; no `openspec/` tree was created and no `docs/specs` folder was moved.

## Scope and deliverables

The completed scope made the authenticated teacher journey coherent around real data: context → roster → student detail → XP feedback/undo → Eclipse Points assessment advantage/reversal → safe Projection handoff. It also added factual bounded activity, create-only classroom setup using existing roster contracts, responsive/accessibility evidence, and the approved varied synthetic deterministic seed.

No new domain, BFF, endpoint, schema, migration, dependency, ranking, dashboard, grade inference, or Projection allowlist was introduced. The clearly labelled `/` Projection remains a separate fixture-backed preview and is not synchronized with the selected teacher group.

| Artifact | Result |
|---|---|
| Proposal, exploration, Design, SPEC | Preserved; Design lifecycle marker normalized to archived/verified |
| Architecture Review, Tasks Review | Preserved; review gates passed |
| Tasks, Apply Progress, Apply Summary | Preserved; all implementation tasks checked |
| Verify Report | Preserved; canonical result is `PASS WITH WARNINGS` |

## Completion and verification evidence

| Measure | Result |
|---|---:|
| Requirements | 8/8 passed |
| Scenarios | 9/9 passed |
| Implementation tasks | 13/13 checked |
| Default Playwright | 30 passed |
| Vitest | 24 files / 97 tests passed |
| Typecheck | Passed |
| Build | Passed |
| Focused Playwright | 5 passed |
| Focused Vitest | 6 files / 37 tests passed |
| `git diff --check` | Passed |

Fresh Verify command evidence is retained in `VERIFY-REPORT.md`, including output hashes for `pnpm test`, `pnpm typecheck`, `pnpm build`, default Playwright, and focused suites.

## Changed-file and rollback summary

The audited implementation change set is:

- API seed: `apps/api/src/demo/seed-service.ts`, `apps/api/test/integration/seed-demo.test.ts`.
- Workspace/UI: `apps/web/src/workspace/{ClassroomSetup.tsx,StudentPanel.tsx,WorkspaceApp.tsx,WorkspaceShell.tsx,workspace-api.ts,workspace-api.test.ts,demo-presentation.test.ts}`, `apps/web/src/styles.css`.
- Browser evidence: `apps/web/e2e/{auth-projection.spec.ts,teacher-workspace.spec.ts}`.

Archive itself modified only `ARCHIVE-REPORT.md`, this change's `DESIGN.md` lifecycle marker, and `.ai/context/{SESSION.md,ROADMAP.md}`. No application code, tests, seed, package, dependency, configuration, schema, migration, or VCS state was altered by Archive. Rollback is a revert of this SPEC's UI/evidence and seed changes; no persistence or migration rollback is required.

## Warnings and conditions preserved

1. `DESIGN.md` was Draft at Verify; its lifecycle marker is now archived/verified solely as a documentation lifecycle update.
2. Hybrid Apply mirrors are substantively aligned but not byte-identical: repository Apply Progress/Summary contain richer addenda than concise Engram mirrors, and Units 1–2 rollback boundaries remain aggregated. This provenance warning is retained and no historical Apply/Verify evidence was rewritten.
3. C-01 remains production-only. Encrypted restic execution and production recoverability were not demonstrated; real student data and production use remain blocked by the existing issue and SPEC-0014/0016 work.

## Privacy, security, and durable decisions

Privacy boundaries remain intact: no private teacher fields enter Projection, URLs, browser storage, or the fixture handoff; ownership, archive/read-only, correction-lock, idempotency, and reversal rules remain authoritative. XP remains evidence rather than a grade, and Eclipse Points remains presentation terminology over internal `coin` contracts.

The archive preserves the approved separate fixture-backed `/` Projection decision and the varied synthetic deterministic seed decision: 16 fictional students, Levels 1–3, multiple badge states, 0/1/2/3 balances, fixed identities/sources, preflight, transactional fail-closed writes, replay idempotency, production refusal, and DEC-014's Camille grants. No selected-group synchronization or private payload was introduced. No new durable stable-context decision was required; `DECISIONS.md` and `KNOWN_ISSUES.md` were intentionally unchanged.

## Engram traceability

All corresponding artifact mirrors were read before archiving. Primary observation IDs and topic keys:

| Artifact | Observation ID | Topic key |
|---|---:|---|
| Proposal | #2483 | `sdd/spec-demo-003-presentable-teacher-mvp/proposal` |
| Exploration | #2477 | `sdd/spec-demo-003-presentable-teacher-mvp/explore` |
| Design | #2488 | `sdd/spec-demo-003-presentable-teacher-mvp/design` |
| Specification | #2504 | `sdd/spec-demo-003-presentable-teacher-mvp/spec` |
| Architecture Review | #2497 | `sdd/spec-demo-003-presentable-teacher-mvp/architecture-review` |
| Tasks | #2509 | `sdd/spec-demo-003-presentable-teacher-mvp/tasks` |
| Tasks Review | #2511 | `sdd/spec-demo-003-presentable-teacher-mvp/tasks-review` |
| Apply Progress | #2517 | `sdd/spec-demo-003-presentable-teacher-mvp/apply-progress` |
| Apply Summary | #2545 | `sdd/spec-demo-003-presentable-teacher-mvp/apply-summary` |
| Verify Report | #2549 | `sdd/spec-demo-003-presentable-teacher-mvp/verify-report` |

Additional latest validation evidence read: #2558 (`Validate SPEC-DEMO-003 post-401 Apply contract`) and #2562 (latest Verify session summary). The Engram archive report is persisted at `sdd/spec-demo-003-presentable-teacher-mvp/archive-report` and is verified readable after save.

## Stable-context updates

- `.ai/context/SESSION.md`: SPEC-DEMO-003 archived after `PASS WITH WARNINGS`; Repository Ready pending Health; exact next step is `sdd-health`, with no Git action yet.
- `.ai/context/ROADMAP.md`: SPEC-DEMO-003 marked archived on 2026-08-30 with result, C-01 condition, and next Health Report.
- `.ai/context/DECISIONS.md`: unchanged; no genuinely durable decision needed beyond existing settled records.
- `.ai/context/KNOWN_ISSUES.md`: unchanged; C-01 and existing issues remain authoritative.

## Exact next route

Run **`sdd-health`** for the lightweight repository Health Report. Do not begin Git handoff in this phase; after Health, evaluate the repository-native Repository Ready gate separately.
