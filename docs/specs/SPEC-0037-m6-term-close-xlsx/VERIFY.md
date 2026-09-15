# VERIFY — SPEC-0037 M6 Term Close and XLSX Export

## Scope and route

Luna-only final verification of the active `DESIGN.md`, `TASKS.md`, TASKS Read
Order, Expected Change Surface, completed-slice evidence, current API/web code
and tests, privacy boundaries, and acceptance criteria. `TASKS.md` does not
contain the exact gate `Critical Terra Verification Gate: REQUIRED`; its Level C
line explicitly says Terra is not routed. Terra, Sol, Ship, Engram, Playwright,
and Git/VCS operations were not invoked.

All five implementation slices are checked complete. No bounded Build
correction was required by the current evidence.

## Commands executed

| Exact command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/term-close/domain.test.ts apps/api/src/term-close/mapper.test.ts apps/api/src/term-close/service.test.ts apps/api/src/term-close/xlsx.test.ts apps/api/src/term-close/routes.integration.test.ts apps/api/test/integration/migrations.test.ts apps/api/test/integration/term-close-persistence.test.ts apps/api/test/privacy/term-close-boundary.test.ts apps/api/test/privacy/projection.test.ts` | **PASS**, exit 0; 9 files, 34 tests. Includes rollback after workbook generation, competing writers, idempotent replay, stale revision, migration constraints, XLSX load/headers/types/order/blank cells/byte stability, ownership/authentication, and projection privacy. |
| `pnpm exec vitest run apps/web/src/workspace/TermClosePanel.test.tsx apps/web/src/workspace/TermClosePanel.download.test.tsx apps/web/src/workspace/workspace-api.test.ts apps/web/src/workspace/WorkspaceApp.integration.test.tsx apps/web/src/workspace/term-close-privacy.test.ts` | **PASS**, exit 0; 5 files, 24 tests. Covers Spanish readiness/filter/next/close/reopen/recovery states, server filename use, workspace reload/context behaviour, and browser-storage/opaque-URL privacy. Emits an existing missing-`act` warning in the download test; assertions pass. |
| `pnpm --filter @eclipse/api typecheck && pnpm --filter @eclipse/web typecheck` | **PASS**, exit 0. |
| `pnpm --filter @eclipse/api build && pnpm --filter @eclipse/web build` | **PASS**, exit 0; API TypeScript build and Vite production build completed; Vite transformed 71 modules. |

## Design, task, and code comparison

| Area | Evidence and finding | Status |
|---|---|---|
| Expected Change Surface / task completion | Migration `0016`, typed schema/registration, cohesive `term-close` API modules/tests, `TermClosePanel`, workspace coordination, and privacy tests are present. Slices 1–5 are checked complete in `TASKS.md`. | PASS |
| Persistence and lineage | Migration runtime tests pass for ordering, six tables, no backfill, FKs, checks, uniqueness, and version ordering. Snapshots persist cohort/name, M5 evaluation/version/grade, RT basis, actor/time, prior version, XLSX bytes/hash/length. | PASS |
| Transaction/concurrency correction | `close()` builds XLSX before `runImmediateTransaction`; there is no `await` while `BEGIN IMMEDIATE` is held. The transaction rechecks ownership/policy/revision/readiness and a deterministic prepared-data fingerprint before persisting. Runtime tests prove rollback after generation and one competing writer wins while the stale writer receives 409. | PASS |
| Domain and stale protection | Runtime tests cover active cohort readiness, M5 closed snapshots, RT `10/5/0`, `ABSENT` exclusion, null/no-RT semantics, deterministic ordering, reopen/reclose version lineage, and stale revision/idempotency behaviour. | PASS |
| XLSX and API | ExcelJS `4.4.0` is pinned. Runtime workbook inspection proves one `T1` sheet, exactly three canonical headers, numeric grade/RT cells, blank no-RT cells, number format, deterministic bytes, and safe filename. Routes implement cookie auth, ownership-safe misses, private download headers, exact stored bytes, and versioned exports. | PASS |
| Spanish web workflow | Focused web runtime tests pass for the 30-student readiness representation, pending filter/next action, controls, disabled explanation, recovery/session handling, archived read-only state, reload/context coordination, and server-provided filename. | PASS |
| Privacy and boundaries | Projection allowlist and term-close privacy tests pass. Names, grades, RT, sources, snapshots, and XLSX bytes are absent from projection/log-style DTO assertions, URLs, browser storage, and public cache paths. B-01 and C-01 evidence remains explicit. | PASS |

## Acceptance criteria

1. Every active student, missing-rubric blocking, and no-RT non-blocking semantics: **PASS**.
2. Atomic immutable cohort/M5/RT/XLSX snapshot lineage and byte/hash persistence: **PASS**; workbook generation occurs before, not asynchronously inside, the SQLite write lock, while all persisted effects remain atomic.
3. Valid deterministic XLSX, exact three columns, blank RT semantics, and safe response filename/headers: **PASS** by focused runtime/source evidence.
4. Reopen/reclose, staleness, idempotency, revision, deterministic competing writes, rollback, ownership, archive, privacy, B-01, and C-01 contracts: **PASS** by focused runtime tests and source comparison.
5. Spanish workflow, applicable baseline states, and unchanged projection: **PASS** by focused web/API/privacy tests.

## Findings

### CRITICAL

None.

### WARNING

1. The successful API download test does not independently assert every
   successful response header (`Content-Length`, MIME, `Content-Disposition`,
   `nosniff`, `private, no-store`, and `ETag`); implementation inspection and
   the web filename test cover the behaviour, but a dedicated successful-route
   assertion would reduce this residual risk.
2. The download web test emits a React missing-`act` warning. It does not fail
   and does not change the verified assertion.

## Unrun checks and residual risk

- The Design-requested 30-student Playwright journey was not run. Playwright is
  non-default, and no critical unresolved workflow remained after the focused
  API/web runtime suites; the focused web test exercises the relevant panel and
  filename behaviour.
- No production retention/deletion, backup-expiry, or encrypted-restic restore
  evidence was run. This is the explicit C-01 rollout limitation and remains
  outside this SPEC.
- No Git/VCS operation was performed.

## Verdict

**PASS WITH WARNINGS** — implementation, focused runtime checks, transaction /
concurrency correction, privacy boundaries, typechecks, and builds pass; the
remaining risk is limited to successful-route-header test specificity, a test
warning, and the explicitly unrun browser/C-01 evidence.
