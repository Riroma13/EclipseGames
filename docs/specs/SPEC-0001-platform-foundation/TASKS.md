# Tasks: SPEC-0001 Platform Foundation

### Acceptance-Criterion Traceability

- **AC-1:** Workspace follows the stated paths and builds as one service without external product services.
- **AC-2:** Auth, migration, typed errors, and safe diagnostics meet the stated contracts.
- **AC-3:** Projection/Show Student APIs expose only their explicit allowlists; all listed exclusions have negative tests.
- **AC-4:** Domain tests prove behaviour cannot change academic grade, XP evidence, or RT semantics.
- **AC-5:** Production use is blocked until retention/deletion and documented restore verification conditions pass.

### Suggested Work Units

These are implementation work units ordered by dependency, each with an independently verifiable outcome, focused test command, runtime harness, and rollback boundary. Commit, push, merge, release, tag, and PR strategy remain maintainer-controlled; work units are not mandated PR boundaries.

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Workspace and SQLite foundation | `pnpm exec vitest run apps/api/test/integration/migrations.test.ts` | `pnpm --filter api dev` then `GET /health` | `pnpm-workspace.yaml`, root manifests, `apps/*`, `packages/*`, `apps/api/drizzle/` |
| 2 | Contracts, errors, transactions | `pnpm exec vitest run apps/api/test/integration/errors.test.ts apps/api/test/integration/transactions.test.ts` | `curl -i http://localhost:3000/api/v1/health` | `packages/contracts/src/`, API middleware/services, transaction behavior |
| 3 | Auth, privacy, and projection | `pnpm exec vitest run apps/api/test/privacy/` && `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts` | Playwright sign-in, projection, Show Student, anonymous/revoked rejection | `apps/api/src/auth/`, `apps/api/src/projection/`, related privacy tests and routes |
| 4 | Deployment, backup, and production gate | `docker compose config` && `pnpm exec playwright test apps/web/e2e/smoke.spec.ts` | `docker compose up --build --abort-on-container-exit`; documented encrypted-volume restore drill | `Dockerfile`, `compose.yaml`, backup configuration/runbook, deployment gate behavior |

## Phase 1: Foundation

- [x] 1.1 [AC-1] Create `pnpm-workspace.yaml`, `apps/web`, `apps/api`, `packages/domain`, `packages/contracts`, React/Vite + Fastify shell, and `.env.example`; use only pinned, justified direct dependencies permitted by Design—no unapproved UI kit, bus, cloud SDK, or generator.
- [x] 1.2 [AC-1] Add configure → migrate → bootstrap → dev; add Drizzle schema/ports and forward SQL in `apps/api/drizzle/` for private SQLite.
- [x] 1.3 [AC-2] RED then implement migration tests for ordering/repeatability, fail-closed startup, and transaction rollback.

## Phase 2: Contracts and HTTP

- [x] 2.1 [AC-2] RED tests in `apps/api/test/integration/` for Zod errors, `{code,message,requestId}`, `500`, logs/audit, and rollback.
- [x] 2.2 [AC-1, AC-2] Implement `packages/contracts/src/`, error/request-ID middleware, safe logs, transactions, inward-only services, and `/api/v1`.

## Phase 3: Authentication

- [x] 3.1 [AC-2] RED tests for invalid-login `401 AUTH_INVALID`, `429`, origin rejection, secure/httpOnly/sameSite cookies, and revoked `401 AUTH_REQUIRED`.
- [x] 3.2 [AC-2] Implement teacher Argon2id bootstrap, opaque sessions, origin/rate limits, and least-privilege SQLite in `apps/api/src/auth/`.
- [x] 3.3 [AC-3] RED tests for anonymous/revoked `401`, payload-free logs, real name/RT/rubric/grades/comments/incidents/history exclusions, and no query-selectable Projection/Show Student fallback.
- [x] 3.4 [AC-3] Implement auth, `TeacherStudentDto`/`ProjectionStudentDto` allowlists, teacher-authenticated routes, and `400/403/404` validation in `apps/api/src/projection/`.

## Phase 4: Domain, UI, Tests

- [x] 4.1 [AC-4] Establish only the minimum pure domain-module structure in `packages/domain/src/` and representative RED/green Vitest tests in `packages/domain/test/` for purity, academic calculations, RT exclusion, and behaviour non-interference needed for architectural testability/domain separation; do not implement the full XP, RT, Energy, behaviour, gamification, or quarterly-assessment feature sets assigned to later SPECs.
- [x] 4.2 [AC-1, AC-3] Build authenticated projection rendering in `apps/web/src/`; never filter teacher DTOs in the browser.
- [x] 4.3 [AC-2, AC-3] Add Vitest SQLite/API auth, validation, rollback, DTO tests and Playwright sign-in/projection smoke with no private fields.

## Phase 5: Operations and Gates

- [x] 5.1 [AC-1, AC-2] Add `Dockerfile`, `compose.yaml`, EU VPS/TLS proxy, private volume, migrate-before-start, and smoke verification.
- [x] 5.2 [AC-2] Configure encrypted restic daily-30/monthly-12 backups and document/execute private-volume restore drill.
- [x] 5.3 [AC-5] Carry C-01 gate: SPEC-0014/0016 define retention/deletion owner/process, deletion plus backup expiry, and quarterly restore verification before production; exclude their hardening here.
- [x] 5.4 [AC-1–AC-5] Run build/typecheck, Vitest, Playwright, Docker startup, migration-failure, and restore verification; keep `DESIGN.md` unchanged during Apply unless concrete implementation evidence produces a Design BLOCKER, and update `.ai/context/SESSION.md` as required by the canonical SDD workflow.
