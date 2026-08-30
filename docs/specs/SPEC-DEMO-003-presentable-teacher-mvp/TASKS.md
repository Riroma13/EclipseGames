# Tasks: SPEC-DEMO-003 — Presentable Teacher MVP

## Review Workload Forecast

Estimated changed lines: 900–1,200 authored lines. Suggested split: PR 1 shell/data → PR 2 actions/setup → PR 3 projection → PR 4 seed/evidence. Delivery: force-chained; each PR targets `main` in order.

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Boundaries; dependency; follow-up/out-of-scope | Focused command | Runtime scenario | Rollback; chain |
|---|---|---|---|---|
| PR 1 | Start existing tests; end context/summary/activity wrappers; prior: archived APIs; follow-up PR2; out: actions/setup. | `pnpm vitest apps/web/src/workspace/workspace-api.test.ts apps/web/src/workspace/demo-presentation.test.ts` | Authenticated workspace loads context/activity. | Workspace files; PR1→PR2. |
| PR 2 | Start PR1; end XP/Points/setup UI/evidence; prior: PR1; follow-up PR3; out: projection/seed. | `pnpm vitest apps/web/src/workspace/demo-presentation.test.ts apps/api/test/integration/roster.test.ts` | Award/undo, redeem/reverse, create roster data. | Panel/setup files; PR2→PR3. |
| PR 3 | Start PR2; end labelled no-payload projection/journey; prior: PR2; follow-up PR4; out: seed. | `pnpm vitest apps/api/test/privacy/projection.test.ts` | Playwright opens separately labelled `/`. | `main.tsx` and projection tests; PR3→PR4. |
| PR 4 | Start PR3; end approved seed/evidence; prior: PR3; follow-up Verify; out: new APIs/schema/config. | `pnpm vitest apps/api/test/integration/seed-demo.test.ts` | `pnpm seed:demo` plus seeded Playwright. | Seed/tests only; PR4 final. |

## Phase 1: RED Contracts and Foundation

- [x] 1.1 RED `workspace-api.test.ts`: assert `GET /api/v1/students/:studentId/xp-evidence?academicYearId=...&limit=3`, mapping category/base/bonus/effective/reversal/time, and exclusion of comments/grades.
- [x] 1.2 RED `demo-presentation.test.ts`: summary/activity zero versus failure→unavailable/retry; preserve opaque hash-only IDs.
- [x] 1.3 GREEN wrappers/state in `workspace-api.ts`, `workspace-state.ts`, `WorkspaceApp.tsx`; no BFF/domain/schema.

## Phase 2: Teacher Journey and Setup

- [x] 2.1 Refine `WorkspaceApp.tsx`, `WorkspaceShell.tsx`, `StudentRoster.tsx`, `StudentCard.tsx` for context, identity, progression, badges, ≤30 scan, no ranking.
- [x] 2.2 Refine `StudentPanel.tsx`, `FastActionShell.tsx`, `UndoBanner.tsx` for XP/Points feedback, duplicate locks, redemption/reversal; no grade inference.
- [x] 2.3 Create `ClassroomSetup.tsx`; RED/evidence in `apps/api/test/integration/roster.test.ts` and/or `roster-core.test.ts` for ownership, archive/read-only, alias, 1–30 batch limits/atomicity, correction lock; then wire existing create APIs.
- [x] 2.4 Update `styles.css`; named `teacher-workspace.spec.ts` evidence covers 30-record scan, 320px/800px/projector, focus, reduced motion, overflow/accessibility.

## Phase 3: Projection and Journey

- [x] 3.1 RED `apps/web/e2e/auth-projection.spec.ts` and existing `apps/api/test/privacy/projection.test.ts` evidence: `/` has no query/hash/private payload or storage; failure is safe error, never teacher fallback.
- [x] 3.2 Implement labelled separate fixture handoff in the existing workspace shell; never widen `apps/api/src/projection/mapper.ts`.
- [x] 3.3 RED then extend `apps/web/e2e/teacher-workspace.spec.ts` for context→search/select→XP→undo→Points→Projection, private URL/storage, setup and a11y.

## Phase 4: Conditional Seed and Verification

- [x] 4.1 RED first in `apps/api/test/integration/seed-demo.test.ts`: unchanged approval gate is recorded; maintainer currently approves varied deterministic states, but omit seed work if withdrawn. Assert collision/no-partial-write and production refusal.
- [x] 4.2 GREEN `apps/api/src/demo/seed-service.ts` with fixed plan identity/source for exact L1/L2/L3, badges, 0/1/2/3 balances, DEC-014 Camille grants; preflight all identities, fail closed, transaction, replay-idempotent, synthetic-only.
- [x] 4.3 Extend seed tests for exact results, Camille compatibility, transaction/replay, then run `pnpm test`, `pnpm typecheck`, `pnpm build`, Playwright and record `APPLY-SUMMARY.md`.

Retain the approved journey/privacy boundary and no dashboards, fake activity, rankings, admin navigation, new BFF/domain/schema/migrations/dependencies/endpoints, grade inference, or archived SPEC changes. C-01 remains production-only.
