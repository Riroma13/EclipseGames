# SPEC-0005 Apply Progress

## Status

Corrective Apply implementation and evidence are complete for the approved task list: 17/17 approved Tasks are checked in the canonical `TASKS.md`. The workspace selection race was corrected without broadening scope; all phase gates now pass and Verify is next.

## Work Units

### Unit 1 — Domain and contracts

- Planned: RED-first coin rules and named DTO contracts.
- Actual: Complete.
- Evidence: `packages/domain/test/coins.test.ts`; focused Vitest passed (4 tests); `pnpm typecheck` passed.
- Rollback boundary: `packages/domain/src/coins/`, `packages/domain/test/coins.test.ts`, `packages/contracts/src/index.ts`.
- Runtime harness: N/A; pure domain and contract parsing.

### Unit 2 — SQLite foundation

- Planned: migration, Drizzle mirror, foreign-key/partial-unique/rollback evidence.
- Actual: Complete for schema foundation.
- Evidence: `apps/api/test/integration/coins-schema.test.ts` and migration regression passed; test explicitly enables `PRAGMA foreign_keys=ON`.
- Rollback boundary: `apps/api/drizzle/0005_coins_assessment_advantages.sql`, DB schema/migration files, focused integration tests.
- Runtime harness: N/A; in-memory SQLite integration.

### Unit 3 — Initial ledger/API seam

- Planned: entitlement reconciliation, ledger/allocation lifecycle, authenticated routes and workspace evidence.
- Actual: Complete. Added repository/service/reconciler, authenticated routes, DTO mapper and web API seam; later units added the C-02/C-03 tests and workspace integration.
- Evidence: final `pnpm test` passed (24 files, 78 tests); `pnpm typecheck` passed.
- Rollback boundary: `apps/api/src/coins/`, `apps/api/src/server.ts`, `apps/web/src/workspace/workspace-api.ts`.
- Runtime harness: Playwright evidence recorded in Unit 5 and final evidence.

### Unit 4 — Reconciliation and allocation lifecycle

- Planned: C-02 full cursorless replay and C-03 allocation/reversal invariants.
- Actual: Complete. Added deterministic replay test for allocation-triggering REVOKE, duplicate refund/compensation prevention, released allocation reuse, exact cost selection/assertion, idempotent reversal, changed-body 409, and rollback through transaction boundaries.
- Evidence: `apps/api/test/integration/coins-reconciliation.test.ts`, `apps/api/test/integration/coins-lifecycle.test.ts`; focused tests passed (3 tests).
- Rollback boundary: `apps/api/src/coins/{repository,service,entitlement-reconciler}.ts`, migration/schema, focused integration tests.
- Runtime harness: N/A; SQLite integration.

### Unit 5 — Workspace coin actions

- Planned: private balance/reward selection and safe redemption feedback.
- Actual: Complete for the approved web seam. Added private coin/context API types, context loading, reward selection, pending/failure/success feedback, and no allocation internals in the panel.
- Evidence: `apps/web/src/workspace/workspace-api.test.ts`; web typecheck passed.
- Rollback boundary: `apps/web/src/workspace/workspace-api.ts`, `apps/web/src/workspace/StudentPanel.tsx`.
- Runtime harness: Playwright suite passed 18/18 after guarding selection invalidation until the requested group is loaded.

## Acceptance Evidence

- [x] Domain fixed costs, allow-list, non-negative balance and finite correction predicates.
- [x] C-04 explicit SQLite foreign-key enablement and migration rollback evidence.
- [x] C-02 exact allocation-triggering REVOKE replay and repeated GRANT/REVOKE/REINSTATE evidence.
- [x] C-03 exact active allocation counts for costs 2 and 3.
- [x] 17/17 approved Tasks complete; full AC-01–13 API/workspace/Playwright coverage; Playwright passed 18/18 tests.

## Final Verification Evidence

- `pnpm test`: 24 files / 78 tests passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm exec playwright test`: 18 tests passed.

## Unexpected Files and Dependencies

- Unexpected files: None beyond the approved SPEC-0005 Working Set.
- Dependencies: None added.

## Privacy and Security

Allocation internals are kept in persistence/repository code and are not included in the public DTO mapper or web API types. Routes remain behind the existing authenticated session hook. No grades or projection fields were added.

## Corrective Apply — Failed Verify Checkpoint

### Root causes corrected

- Prior C-03 evidence exercised service allocation but did not inspect active allocation rows for exact cost-2 and cost-3 counts or distinct grant identities.
- Prior C-04 evidence enabled SQLite foreign keys but did not execute FK rejection, active-allocation uniqueness, released-grant reuse, or one-active-advantage constraints.
- `POST /api/v1/assessment-contexts` and manual coin-grant writes bypassed authoritative archive checks.
- Prior API, workspace, and browser evidence did not exercise the SPEC-0005 authenticated teacher redemption journey.

### Corrective work units

#### Unit 6 — Runtime persistence and service guards

- Actual: Complete. Added direct SQLite assertions for exact active allocation counts, distinct grants, refund ineligibility, FK failure, active partial-unique failure, released allocation reuse, context uniqueness, and rollback. Moved manual grant and assessment-context creation through service-owned archive guards.
- Evidence: `apps/api/test/integration/coins-schema.test.ts`, `apps/api/test/integration/coins-reconciliation.test.ts`, `apps/api/test/integration/coins-lifecycle.test.ts`.
- Rollback boundary: `apps/api/src/coins/routes.ts`, `apps/api/src/coins/service.ts`, focused coin integration tests.
- Runtime harness: In-memory SQLite and Fastify inject; all focused tests passed.

#### Unit 7 — Workspace redemption lifecycle

- Actual: Complete. Added real workspace redemption, duplicate-active rejection without debit, reversal/undo balance restoration, pending/disabled duplicate-submission protection, fixed reward/context rendering, and preserved selected student/group teaching context.
- Evidence: `apps/web/src/workspace/StudentPanel.tsx`, `apps/web/e2e/teacher-workspace.spec.ts`, workspace API/state tests.
- Rollback boundary: workspace coin action component and SPEC-0005 browser test.
- Runtime harness: Authenticated Playwright against the real Fastify API and seeded roster; SPEC-0005 flow passed.

### Corrective validation receipt

| Command | Exit | Result |
|---|---:|---|
| `pnpm exec vitest run apps/api/test/integration/coins-schema.test.ts apps/api/test/integration/coins-lifecycle.test.ts apps/api/test/integration/coins-reconciliation.test.ts` | 0 | 3 files / 8 tests passed |
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts apps/web/src/workspace/workspace-state.test.ts` | 0 | 2 files / 11 tests passed |
| `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "SPEC-0005 real teacher redemption flow"` | 0 | 1 SPEC-0005 browser test passed |
| `pnpm test` | 0 | 24 files / 81 tests passed |
| `pnpm typecheck` | 0 | API and web checks passed |
| `pnpm build` | 0 | Recursive web/API build passed |
| `pnpm exec playwright test` | 0 | 19 Chromium tests passed |
| `git diff --check` | 0 | No whitespace errors |

### Corrective acceptance mapping

- [x] C-02 replay preserved and re-run: one refund, one revocation compensation, no active allocation resurrection, identical replay state.
- [x] C-03: cost 2 creates exactly 2 distinct active grant allocations; cost 3 creates exactly 3; released grants are reusable and refund rows are ineligible.
- [x] C-04: explicit `PRAGMA foreign_keys=ON`, FK rejection, active allocation uniqueness, released reuse, one active student/context advantage, and rollback evidence.
- [x] Archived student, academic year, and assessment-context writes reject through service-owned guards while historical reads remain available.
- [x] Authenticated workspace flow covers balance, fixed rewards, context requirement, success/failure, no duplicate submission, reversal, and teaching-context continuity.

### Corrective scope and risks

- Unexpected files: None beyond the existing SPEC-0005 working set.
- Dependencies: None added.
- Privacy/security: Allocation internals remain persistence-only; routes retain session authentication; no grades, XP, RT, rubric, or projection fields are changed.
- Remaining risk: Verify must independently inspect this fresh evidence and decide the SPEC verdict. C-01 remains production-only.

## Corrective Apply — Evidence-Only Revision 2

### Unit 8 — Complete replay-state, API failure, and workspace privacy evidence

- Actual: Complete. The allocation-triggering REVOKE test now snapshots the complete relevant durable state: scoped ledger rows/counts, refunds, revocation compensation, redemption reversal, every allocation row with active/released state, eligibility, and authoritative balance. It compares the first successful reconciliation with an exact replay and asserts one refund, one compensation, zero active allocations, released-allocation non-resurrection, stable eligibility, and unchanged balance.
- Actual: Complete. Fastify API failure coverage now proves ownership mismatch `404`, invalid body `422`, insufficient funds typed `409 CONFLICT`, and mismatched student/context `404`, with before/after authoritative balance and ledger snapshots proving zero redemption/debit/ledger mutation. Existing idempotency, duplicate-conflict, archive, and generic-correction coverage was retained without duplication.
- Actual: Complete. The smallest approved API guard now rejects a context from a different student group with the existing ownership-safe `404` failure; same-year cross-group context previously reached debit validation and did not satisfy the approved mismatch contract.
- Actual: Complete. The real teacher workspace E2E now proves disabled pending submission, actionable failed redemption, retry after failure, unchanged balance after failure, retained workspace/context, teacher-private coin rendering, URL exclusion of private coin/reward/balance payloads, and no academic data in the coin action region.
- Evidence: `apps/api/test/integration/coins-reconciliation.test.ts`, `apps/api/test/integration/coins-lifecycle.test.ts`, `apps/api/src/coins/service.ts`, and `apps/web/e2e/teacher-workspace.spec.ts`.
- Rollback boundary: The two focused API tests plus the single group-context guard and the SPEC-0005 workspace E2E test.
- Runtime harness: SQLite reconciliation, Fastify inject, and authenticated Playwright against the real API.

### Revision 2 validation receipt

| Command | Exit | Result |
|---|---:|---|
| `pnpm exec vitest run apps/api/test/integration/coins-reconciliation.test.ts apps/api/test/integration/coins-lifecycle.test.ts` | 0 | 2 files / 6 tests passed |
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts apps/web/src/workspace/workspace-state.test.ts` | 0 | 2 files / 11 tests passed |
| `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "SPEC-0005"` | 0 | 2 Chromium tests passed |
| `pnpm test` | 0 | 24 files / 82 tests passed |
| `pnpm typecheck` | 0 | API and web checks passed |
| `pnpm build` | 0 | Recursive web/API build passed |
| `pnpm exec playwright test` | 0 | 20 Chromium tests passed |
| `git diff --check` | 0 | No whitespace errors |

### Revision 2 acceptance mapping

- [x] C-02 complete durable allocation/redemption replay snapshot and exact-transition equality.
- [x] API failed mutations cover all remaining Verify gaps with authoritative zero-mutation assertions.
- [x] Workspace pending/failure/retry, stable teaching context, privacy URL boundary, and explicit no-academic-data assertion.
- [x] No Design, Tasks, Verify report, schema, dependency, projection, or academic-field changes.

### Revision 2 conclusion

All three requested failed-Verify evidence gaps are covered by passing focused and full validation. Verify remains the next phase; this Apply run does not edit or claim Verify success. C-01 remains production-only.

## Corrective Apply — API-Evidence-Only Revision 3

### Unit 9 — Complete API authoritative zero-mutation evidence

- Actual: Complete. Added one canonical `authoritativeSnapshot` helper in `apps/api/test/integration/coins-lifecycle.test.ts` for each student/academic-year scope. It deterministically orders complete ledger, redemption, allocation, assessment-context, entitlement-transition, count, and derived-balance state while retaining authoritative IDs and timestamps.
- Actual: Complete. Fastify inject coverage now snapshots immediately before and after every required failed request: ownership mismatch `404`, invalid body `422`, insufficient-funds typed `409`, mismatched assessment context `404`, duplicate advantage `409`, changed-body idempotency conflict `409`, archived student write `422`, archived academic-year write `422`, and archived assessment-context redemption `422`.
- Actual: Complete. Duplicate and idempotency cases snapshot after the original successful redemption and prove the rejected follow-up preserves the legitimate redemption, debit, allocations, balance, context state, and reconciliation side effects. Archived cases snapshot historical state after archive setup and prove no additional mutation.
- Evidence: `apps/api/test/integration/coins-lifecycle.test.ts`.
- Rollback boundary: the API integration test only; no product source, schema, migration, route, Design, Tasks, or Verify report changes.
- Runtime harness: Fastify inject against a real file-backed SQLite database plus a read-only inspection connection.

### Revision 3 validation receipt

| Command | Exit | Result |
|---|---:|---|
| `pnpm exec vitest run apps/api/test/integration/coins-schema.test.ts apps/api/test/integration/coins-lifecycle.test.ts apps/api/test/integration/coins-reconciliation.test.ts apps/api/test/integration/migrations.test.ts` | 0 | 4 files / 13 tests passed |
| `pnpm test` | 0 | 24 files / 83 tests passed |
| `pnpm typecheck` | 0 | API and web checks passed |
| `pnpm build` | 0 | Recursive web/API build passed |
| `pnpm exec playwright test` | 0 | 20 Chromium tests passed |
| `git diff --check` | 0 | No whitespace errors |

### Revision 3 acceptance mapping

- [x] All nine required failed API cases have complete authoritative before/after equality proof.
- [x] Snapshot shape includes ledger/redemption/allocation rows and counts, allocation release state/reason/timestamps, derived balance, assessment-context state, and entitlement-transition side effects.
- [x] No product behavior was changed; no Design, Tasks, Verify report, schema, migration, dependency, UI, or VCS action was performed.

### Revision 3 conclusion

API-evidence-only Apply is complete. All nine cases have passing zero-mutation proof; Verify is the next phase. C-01 remains production-only.
