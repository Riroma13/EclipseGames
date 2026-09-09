# SPEC-0018 — Verification

## Scope and level

**Level C.** Direct Terra verification against `DESIGN.md`, `TASKS.md`, implementation, contracts, migration, and runtime evidence.

## Commands and results

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/test/integration/migrations.test.ts apps/api/src/calendar/*.test.ts` | PASS — 5 files, 13 tests |
| `pnpm typecheck` | PASS — API and web TypeScript checks |
| `pnpm test` | PASS — 35 files, 148 tests |
| `pnpm build` | PASS — Vite web and API builds |
| `pnpm exec playwright test apps/web/e2e/calendar-sessions.spec.ts` | PASS — 1 Chromium test |
| `pnpm exec playwright test` | WARNING — 44/45 passed; unrelated `apps/web/e2e/auth-projection.spec.ts` expectation for stale seed text `Weekend Story` failed |

Playwright and its application-server harness are available and were exercised; they are not unavailable in this workspace.

## Acceptance coverage

| Design acceptance | Evidence | Status |
|---|---|---|
| Owner-only atomic `T1`–`T3` calendar setup; unconfigured years cannot start | Calendar service/API tests require all three terms, validate ownership/configuration, and exercise migration lineage. | PASS |
| Eligible session snapshots and replay/race protection | Fixed-clock service tests; concurrent Fastify `Promise.all` duplicate start/end requests return one `201` and one `200`; migration partial unique indexes inspected. | PASS |
| Year range/archive lifecycle protection | Fastify test proves `PATCH` outside configured calendar range returns `422`, active archive returns `409`, and closed-calendar history remains readable. | PASS |
| Owner-only replay-safe end after expiry; no student/projection leak | End replay and UUID-v4 validation pass; mapper/session DTO inspection and API test show no student fields; no projection route/mapper was added. | PASS |
| Private workspace setup/status and lifecycle controls | Focused Chromium test covers three-term setup, private status, start, end, and closed-slot ineligibility. | PASS |

## Bounded Build corrections

- Enforced exactly `T1`, `T2`, and `T3` at route, contract, service, and workspace setup boundaries.
- Enforced owned-group status/start access and UUID-v4 keys on both lifecycle operations.
- Added the approved `getOwnedRealClassSessionContext` verified-lineage seam.
- Made status fail closed after a session already occupies the slot/local-date and retained UI retry keys.
- Added focused lifecycle, concurrent replay, and Playwright coverage.

## Privacy and architecture assessment

Calendar/session routes are cookie-authenticated, resolve teacher ownership before group status/start, return private DTOs without student fields, and do not add projection contracts or client-side privacy filtering. The migration preserves composite lineage and `RESTRICT` foreign keys. Academic, behaviour, gamification, and narrative domains remain untouched.

## Findings and residual risk

- **C-01 — production-only residual risk:** encrypted-restic backup/restore, retention/deletion, and backup-expiry evidence remain absent. This blocks real student data and production use, but does not block this local verification.
- The full Playwright suite has one pre-existing, reproducible non-SPEC failure: the shared `/tmp/eclipse-playwright.sqlite` harness retains accumulated seed-dependent records, so `auth-projection.spec.ts` cannot find `Weekend Story`. The targeted SPEC-0018 Playwright flow passes. This is a suite-isolation warning, not evidence of a calendar/session defect.

## Verdict

**PASS WITH WARNINGS.** SPEC-0018 meets its approved Level C Design and acceptance criteria with runtime coverage. C-01 and the unrelated full-suite fixture-isolation failure remain recorded residual risks.
