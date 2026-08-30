# Tasks Review: SPEC-DEMO-003 — Presentable Teacher MVP

**Workflow outcome: APPROVED**

## status

`APPROVED`

## executive_summary

The narrow refinement resolves all six prior conditions without redesign. `TASKS.md` now provides explicit RED-before-GREEN evidence, concrete ownership/XP/setup/privacy mappings, complete stacked boundaries, and the required high-risk forecast. It is ready for Apply slice 1.

## artifacts

- Re-read `PROPOSAL.md`, `exploration.md`, `DESIGN.md`, `SPEC.md`, `ARCHITECTURE-REVIEW.md`, `TASKS.md`, this prior report, `docs/SDD-WORKFLOW.md`, Engram mirrors, and named source/test paths.
- Verified named implementation paths, including `WorkspaceApp.tsx`, `ClassroomSetup.tsx`, workspace tests, roster integration/core tests, seed integration tests, projection privacy tests, and both relevant Playwright specs.
- Refreshed only `docs/specs/SPEC-DEMO-003-presentable-teacher-mvp/TASKS-REVIEW.md`; no application, test, seed, package/config, archived artifact, branch, or VCS state was changed.

## review outcome

### Confirmed

- The unchanged seed approval gate is recorded, current maintainer approval is explicit, and task 4.1 is RED before task 4.2 GREEN. It names fixed identities/sources, exact L1/L2/L3, badges, 0/1/2/3 balances, DEC-014 Camille grants, collision preflight, fail-closed/no-partial-write, transaction, replay, and production refusal.
- Setup evidence explicitly names `apps/api/test/integration/roster.test.ts` and `roster-core.test.ts` for ownership, archive/read-only, alias, 1–30 limits/atomicity, and correction locks.
- XP evidence names the exact `GET /api/v1/students/:studentId/xp-evidence?academicYearId=...&limit=3` contract, required value mapping, and comment/grade exclusion.
- Private failure→unavailable/retry, 30-record scanning, focus, reduced motion, projector sizing, and overflow evidence map to `demo-presentation.test.ts` and `teacher-workspace.spec.ts`.
- Every stacked unit states start/end, dependency, follow-up/out-of-scope, focused command, runtime scenario, rollback boundary, and PR1→PR2→PR3→PR4 dependency.
- Full proposal/spec/design coverage and dependency order are present. No unsupported endpoint, domain, schema, migration, dependency, fake data, projection widening, ranking, or hidden redesign is introduced.
- Exact guard lines are present: `Decision needed before apply: No`, `Chained PRs recommended: Yes`, `Chain strategy: stacked-to-main`, `400-line budget risk: High`.

## remaining_conditions

None. Apply must still execute the recorded seed gate as an acceptance constraint; this is not an outstanding Tasks Review condition.

## risks

- The seed remains conditional and must not be implemented if maintainer approval is withdrawn.
- The fixture-backed `/` Projection must remain clearly labelled and separate from the selected teacher group.
- C-01 remains outside this change and production-only.

## next_recommended

Proceed with `sdd-apply` slice 1 on the stacked-to-main chain. Preserve the approved boundaries and run each unit’s focused command and runtime scenario before advancing.

## skill_resolution

`paths-injected`: shared SDD guidance, `sdd-tasks`, `chained-pr`, `work-unit-commits`, and `cognitive-doc-design` were loaded. No dedicated `sdd-tasks-review` skill is present; repository workflow and injected guidance were authoritative.
