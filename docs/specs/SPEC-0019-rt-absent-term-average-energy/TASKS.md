# SPEC-0019 — Build Plan

## Plan

- Add the 0012 SQLite migration and Drizzle declarations for RT roster snapshots,
  entries, requests, and revisioned streak Emerald entitlements.
- Add pure RT replay/average/Energy/streak rules and focused domain tests first.
- Add private RT repository/service/entitlement port and authenticated routes,
  using the owned session context and the existing transaction boundary.
- Register the API module and add the shared contract types without exposing RT
  through teacher roster or projection DTOs.
- Add the compact workspace RT grid, session-aware loading/save/correction flow,
  and focused API/UI coverage.
- Run focused migration, domain, API/privacy, typecheck, and build checks; record
  exact evidence and any residual risk below.

## Scope self-check

This plan is limited to the current DESIGN.md contract. It does not convert
NOT_EVALUATED, add attendance, projection/export/rubric/close/behaviour/narrative
features, write coin or gem currency, or introduce lifecycle state, checkpoints,
traces, fingerprints, runtime markers, or completion markers.

## Evidence

- Planning evidence: repository inspection found SPEC-0019 is the sole evident
  incomplete product SPEC: it has DESIGN.md but no TASKS.md or VERIFY.md; prior
  SPEC artifacts contain completed plans/evidence. Existing code has only the
  SPEC-0018 session/calendar foundation and no RT module.

## Implementation evidence

- Added `0012_rt_absent_term_energy` with four RT tables, lineage constraints,
  request uniqueness, ordered-entry indexes, and revisioned entitlement state;
  updated Drizzle declarations and migration coverage.
- Added pure replay rules and tests for `ABSENT`, null averages, unrounded
  Energy bands, display-independent streak replay, and fourth-complete
  entitlements.
- Added teacher-owned RT routes for entry reads, bulk create/replacement with
  UUID-v4 idempotency, and term summaries; session context and roster locking
  remain server-owned. Added the future M3 reconciliation port without any
  currency write path.
- Added the workspace `10/5/0/Ausente` session grid and qualitative term summary
  display using the private roster aliases. RT is not added to roster or
  projection DTOs.
- Defect fixed during implementation: SQLite returns RT numeric values as text;
  service reads now decode persisted `10`, `5`, and `0` before replay so average,
  Energy, streak, and entitlement calculations use the canonical domain values.

### Command results

- `pnpm exec vitest run apps/api/src/rt/*.test.ts apps/api/test/integration/migrations.test.ts` — PASS, 3 files / 14 tests.
- `pnpm exec vitest run apps/api/src/rt/*.test.ts apps/api/src/calendar/*.test.ts apps/api/test/integration/migrations.test.ts` — PASS, 7 files / 23 tests.
- `pnpm exec vitest run` — PASS, 37 files / 158 tests.
- `pnpm typecheck` — PASS, web and API TypeScript checks.
- `pnpm build` — PASS, web Vite build and API TypeScript build.
- Runtime harness: Fastify route-specific RT harness is not separately present;
  service tests exercise the available SQLite transaction boundary. Playwright
  is not configured in this workspace.
- Rollback boundary: revert `apps/api/src/rt/`, migration `0012`, the calendar
  session-context addition, server/contracts/schema/migration-test changes, and
  the workspace RT component/API/styles changes; preserve unrelated worktree
  changes.

## Residual risk

- The RT route has focused service and migration coverage but no dedicated
  authenticated Fastify integration test or browser journey yet.
- C-01 remains a production-only privacy/recoverability gate.
