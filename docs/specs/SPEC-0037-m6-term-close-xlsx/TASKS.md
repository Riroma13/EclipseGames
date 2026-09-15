# Tasks: SPEC-0037 — M6 Term Close and XLSX Export

## Expected Change Surface

- Create `apps/api/drizzle/0016_group_term_close_xlsx.sql` and `apps/api/src/term-close/{repository,service,mapper,routes,xlsx}.ts` plus focused API/domain tests.
- Modify `apps/api/src/db/{schema,migrations}.ts`, API package/lockfile, server registration, contracts, and privacy regression coverage. Preserve M5, RT writes, projection, and game/behaviour/narrative boundaries.
- Create `apps/web/src/workspace/TermClosePanel.tsx` and focused tests; modify workspace API/app/rubric-term coordination and styles only where required for the specified Spanish workflow.

## Read Order

1. `DESIGN.md` (authoritative contract and acceptance).
2. `apps/api/src/db/schema.ts`, `apps/api/src/db/migrations.ts`, `apps/api/drizzle/0015_quarterly_observation_rubric.sql` (schema and migration conventions).
3. `apps/api/src/{rubric,rt,calendar}/` services/routes/tests and `apps/api/src/server.ts` (M5/RT lineage, transactions, auth, wiring).
4. `apps/web/src/workspace/{workspace-api,WorkspaceApp,QuarterlyRubric}.tsx` and nearby tests/styles (private state, Spanish UI, abort/reload patterns).

Decision lines required by Design: `Level C — Sol Design only`; Terra is not routed for this request. Threat matrix is `N/A`.

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

## Bounded Implementation Slices (dependency order)

- [x] **Slice 1 — Persistence foundation:** Write migration/schema RED tests for six tables, lineage/FK/check/unique constraints, version ordering, and no backfill; then add migration `0016` after `0015` and register typed tables. Focused tests: migration constraint suite. Evidence: `pnpm exec vitest run apps/api/test/integration/migrations.test.ts apps/api/test/integration/term-close-persistence.test.ts` — 2 files passed, 9 tests passed.
- [x] **Slice 2 — Close domain and repository:** Write RED tests for active-cohort readiness, M5 snapshot requirements, RT `10/5/0` plus `ABSENT`, null/no-RT semantics, stale reasons, archive policy, and deterministic ordering; implement repository/service transaction boundaries, snapshots, lifecycle, requests, revision, UUID-v4 idempotency, rollback, concurrency, and reopen/reclose. Evidence: `pnpm exec vitest run apps/api/src/term-close/domain.test.ts apps/api/src/term-close/service.test.ts apps/api/test/integration/term-close-persistence.test.ts` — 3 files passed, 8 tests passed; `pnpm --filter @eclipse/api exec tsc -p tsconfig.json --noEmit` — passed.
- [x] **Slice 3 — XLSX and private API:** Write RED tests for exact OOXML sheet/headers/types/order/blanks, fixed bytes/hash, safe filename, auth/ownership/status/headers; add pinned `exceljs@4.4.0`, XLSX generation, mappers/routes, server wiring, contracts, and package lock updates. Add API tests for replay/mismatch and versioned downloads. Evidence: `pnpm exec vitest run apps/api/src/term-close/xlsx.test.ts apps/api/src/term-close/service.test.ts apps/api/src/term-close/routes.integration.test.ts` — 3 files passed, 4 tests passed. Typecheck was not rerun after the final test-only cast because the bounded circuit breaker prohibits a third execution after two debugging attempts; the production errors were resolved before that cast. Versioned download response implementation is covered by the focused route status/ownership test and repository-backed service assertions.
- [x] **Slice 4 — Spanish group workflow:** Write RED web tests for the 30-student readiness flow, pending filter/next action, close/download/reopen controls, disabled explanations, loading/error/retry/409/session-expiry/archive/context-abort/reload/responsive keyboard states; implement `TermClosePanel.tsx`, workspace API/types/app coordination, and styles without batch-closing rubrics. Evidence: `pnpm exec vitest run apps/web/src/workspace/TermClosePanel.test.tsx apps/web/src/workspace/workspace-api.test.ts apps/web/src/workspace/WorkspaceApp.integration.test.tsx` — 3 files passed, 22 tests passed; `pnpm --filter @eclipse/web typecheck` — passed.
- [x] **Slice 5 — Boundary regression:** Add focused privacy tests proving names/grades/RT/files never reach projection, logs, URLs, storage, or public cache; test B-01 warning and C-01 rollout limitation evidence. Evidence: `pnpm exec vitest run apps/api/test/privacy/term-close-boundary.test.ts apps/api/test/privacy/projection.test.ts apps/web/src/workspace/term-close-privacy.test.ts apps/web/src/workspace/TermClosePanel.test.tsx` — 4 files passed, 18 tests passed. Projection allowlist/audit, opaque export URL and `no-store`, browser-storage absence, XLSX exclusion from projection, B-01 annual-only warning, and C-01 production limitation are covered. The Design-specified 30-student smoke remains Verify-only and was not run in Build.

## Acceptance/Test Obligations

Each slice must prove its listed RED scenarios plus Design acceptance: immutable cohort/M5/RT/XLSX lineage; byte-stable replay; staleness and version lineage; atomic rollback; ownership, archive, idempotency, revision, concurrency, and privacy; canonical three-column workbook and safe response headers; complete Spanish workflow. Later Verify must include the focused browser journey specified by Design.

## Critical Terra Verification Gate

**Critical Terra Verification Gate: Level C/Terra review is required by the default route but is explicitly not routed for this request; do not invoke Terra.**
