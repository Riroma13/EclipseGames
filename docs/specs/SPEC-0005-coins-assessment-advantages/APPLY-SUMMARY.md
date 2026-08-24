# SPEC-0005 Apply Summary

## Result

17/17 approved Tasks are checked in the canonical `TASKS.md`. Corrective Apply completed on the existing SPEC branch; Verify is the next phase.

## Implementation

- Added append-only coin ledger, fixed rewards, assessment contexts, redemptions and released allocation evidence with SQLite foreign keys and partial uniqueness.
- Added cursorless full replay of SPEC-0004 level transitions with unique source identity and allocation-triggered whole-redemption reversal.
- Added deterministic grant allocation, exact active-allocation assertions, finite compensation, idempotent redemption replay and one-time reversal/refund behavior.
- Added authenticated private routes, ownership-as-404 behavior, safe errors, reward/context DTO seams and no generic correction endpoint.
- Added private teacher workspace coin balance, assessment selection, reward actions and safe success/failure feedback without allocation internals or academic fields.
- Corrected the existing workspace selection invalidation race so stale student feedback waits until the requested group has loaded.

## Evidence

- `pnpm test`: 24 files / 78 tests passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm exec playwright test`: 18 tests passed.
- C-02: `apps/api/test/integration/coins-reconciliation.test.ts` replays an allocation-triggering REVOKE and checks equivalent final state, one refund, one compensation, and no active allocation resurrection.
- C-03: `apps/api/test/integration/coins-lifecycle.test.ts` exercises fixed cost 2 and cost 3 paths with deterministic exact-count allocation assertions in the service.
- C-04: `apps/api/test/integration/coins-schema.test.ts` explicitly enables `PRAGMA foreign_keys=ON` and proves rollback.

## Working Set and Dependencies

Implementation stayed within the approved SPEC-0005 Working Set. No dependencies, workers, queues, buses, engines, dashboards or generic accounting abstractions were added.

## Privacy and Rollback

Allocation internals remain persistence-only. No grades, XP, RT, rubric or projection fields were added. Each unit has a localized rollback boundary documented in `APPLY-PROGRESS.md`; migrations are forward-only and transactionally applied.

## Deferred Condition

C-01 remains production-only as approved; encrypted restic/retention evidence is outside this SPEC.

## Corrective Apply Result

The failed Verify checkpoint was corrected without reopening the approved Design or Tasks. Service-owned archive guards now protect manual grants and assessment-context creation, while historical reads remain available. The workspace now exposes a real authenticated redemption and undo lifecycle in the existing teacher panel.

### Files changed for corrective evidence

- `apps/api/src/coins/service.ts` and `apps/api/src/coins/routes.ts` — authoritative archived student/year/group write guards.
- `apps/api/test/integration/coins-schema.test.ts` — executed FK and partial-unique runtime assertions with foreign keys explicitly enabled.
- `apps/api/test/integration/coins-reconciliation.test.ts` — exact cost-2/cost-3 active allocation counts, distinctness, released reuse, and refund ineligibility.
- `apps/api/test/integration/coins-lifecycle.test.ts` — typed API failures, archive rejection, and no-mutation evidence.
- `apps/web/src/workspace/StudentPanel.tsx` — fixed reward/context rendering, duplicate-submit protection, and real advantage undo.
- `apps/web/e2e/teacher-workspace.spec.ts` — authenticated SPEC-0005 browser journey through real API mutations.

### Fresh validation

- `pnpm test` — exit 0, 24 files / 81 tests.
- `pnpm typecheck` — exit 0.
- `pnpm build` — exit 0.
- `pnpm exec playwright test` — exit 0, 19 tests.
- `git diff --check` — exit 0.

### Corrective conclusion

C-02, C-03, and C-04 evidence is complete for Verify review. No unrelated modules or dependencies were introduced. `next_recommended: verify`.

## API-Evidence-Only Revision 3

The failed Verify API evidence gap is closed without product changes. `apps/api/test/integration/coins-lifecycle.test.ts` now uses one canonical deterministic authoritative snapshot for each student/year scope, covering ledger, redemptions, allocations (including release state/reason/timestamps), assessment contexts, entitlement transitions, counts, and balance.

All nine required failed cases are covered with immediate before/after equality: ownership mismatch `404`, invalid body `422`, insufficient funds `409`, mismatched assessment context `404`, duplicate advantage `409`, changed-body idempotency `409`, archived student write `422`, archived academic-year write `422`, and archived assessment-context redemption `422`. Duplicate/idempotency assertions preserve the original successful state before proving the rejected follow-up is mutation-free.

### Revision 3 validation

- Focused API suites: exit 0, 4 files / 13 tests.
- `pnpm test`: exit 0, 24 files / 83 tests.
- `pnpm typecheck`: exit 0.
- `pnpm build`: exit 0.
- `pnpm exec playwright test`: exit 0, 20 Chromium tests.
- `git diff --check`: exit 0.

No source behavior, schema, migration, dependency, UI, Design, Tasks, or Verify report changed. `next_recommended: verify`.
