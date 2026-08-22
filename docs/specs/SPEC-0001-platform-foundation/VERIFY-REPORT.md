# SPEC-0001 Verification Report

## Final outcome: PASS WITH CONDITIONS

The scoped Verify rerun resolves the prior CRITICAL test-discovery failure. `pnpm exec vitest run` now passes, while the focused Vitest suite, Playwright projection E2E, build, and typecheck all remain green. The only remaining condition is the already-approved C-01 production gate; it does not block foundation completion or Archive.

## Scope and resolution

| Item | Result | Evidence |
|---|---|---|
| Prior Verify root cause | RESOLVED | Root Vitest discovered the Playwright-owned `apps/web/e2e/auth-projection.spec.ts` and failed because Playwright `test()` ran under Vitest. |
| Exact correction | PASS | `vitest.config.ts` explicitly includes `apps/api/test/**/*.test.ts` and `packages/domain/test/**/*.test.ts`, and excludes `apps/web/e2e/**`. |
| Playwright ownership | PRESERVED | `playwright.config.ts` still sets `testDir: './apps/web/e2e'`; `apps/web/e2e/auth-projection.spec.ts` remains a Playwright test. No test was renamed or relocated. |
| Unrelated drift | NONE OBSERVED | The correction is a deterministic runner-discovery boundary. No Design, product behavior, API, privacy boundary, Task checkbox, Playwright config, or E2E test changed for this correction. Git shows repository files as untracked, so this is based on direct artifact inspection and the prior Apply/Verify evidence, not a Git historical diff. |

## Artifact and task status

| Item | Result | Evidence |
|---|---|---|
| Approved Design | PASS | `DESIGN.md` remains `Status: Approved`. |
| Tasks complete | PASS | Tasks 1.1 through 5.4 remain checked. |
| Apply complete | PASS | `APPLY-SUMMARY.md` records cumulative completion and the focused discovery-boundary correction. |
| Git historical comparison | LIMITATION | All implementation/spec files are untracked; Git cannot independently prove historical equality of `DESIGN.md`. This is non-blocking because no acceptance criterion requires Git history and the current approved Design was inspected directly. |

## Acceptance-criteria matrix

| Criterion | Result | Evidence |
|---|---|---|
| AC-1 — one-service workspace | PASS | Prior Verify evidence remains applicable: the pnpm React/Vite + Fastify workspace, single Docker `app` service, private volume, and `docker compose config` validation are unchanged. Current `pnpm build` passes. The corrected root Vitest command now passes 8 files / 20 tests. |
| AC-2 — auth, migrations, errors, diagnostics | PASS | Prior Verify evidence remains applicable and unchanged: Argon2id bootstrap, opaque revocable sessions, origin/rate-limit/cookie controls, ordered transactional fail-closed migrations, typed `{ code, message, requestId }` errors, payload-free audit, and URL-shaped `DATABASE_URL` rejection before filesystem/SQLite access. Current root and focused Vitest both pass 20/20. |
| AC-3 — projection/privacy boundary | PASS | Prior Verify evidence remains applicable and unchanged: server-side separate teacher/projection DTOs; the nine-field projection allowlist; Show Student adds only `behaviourState`; negative privacy, anonymous/revoked, and payload-free-log tests passed previously. Current root/focused Vitest include and pass `projection.test.ts` (5 tests); Playwright passes the classroom-safe rendering test (1/1). |
| AC-4 — domain non-interference | PASS | Prior Verify evidence remains applicable and unchanged: pure representative domain module and tests prove `NOT_EVALUATED` exclusion and that RED_CODE behavior does not alter observation grade, XP evidence, or RT. Current root/focused Vitest include and pass `foundation.test.ts` (2 tests). |
| AC-5 — production gate | PASS WITH CONDITION | C-01 remains explicitly carried by Design sections 6/8/9, Task 5.3, Apply Summary, and backup documentation. Production and real student data remain blocked until SPEC-0014/0016 define retention/deletion ownership and process, implement deletion including backup expiry, and record a successful quarterly encrypted-restic restore verification. |

## Current validation evidence

| Command | Result | Exit | Counts / evidence | Output SHA-256 |
|---|---|---:|---|---|
| `pnpm exec vitest run` | PASS | 0 | 8 files / 20 tests passed; only API/domain Vitest suites were discovered | `c0b851fe86af4b8d848b206fd9b0508193bd46bc0e50f0e3d75dae597a1bfe39` |
| `pnpm exec vitest run apps/api/test packages/domain/test` | PASS | 0 | 8 files / 20 tests passed | `db99de1ec9415f5fdc268f66812cc740c28e48f416577e41ec171ab8e14cc570` |
| `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts` | PASS | 0 | Chromium: 1 passed | `76fb8e848cb3b8e00badd577f62c8b6cdcd636802c82415678fbbd3cdeb382ba` |
| `pnpm build` | PASS | 0 | Web Vite build and API TypeScript build passed | `09eb77f47e2457a11cf968dfacea9590fcdee952fbf6e9ac90dad7cb775d774d` |
| `pnpm typecheck` | PASS | 0 | Web and API TypeScript checks passed | `2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c3244` |

### Strict runtime envelope

```yaml
test_command: pnpm exec vitest run
test_exit_code: 0
test_output_hash: sha256:c0b851fe86af4b8d848b206fd9b0508193bd46bc0e50f0e3d75dae597a1bfe39
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:09eb77f47e2457a11cf968dfacea9590fcdee952fbf6e9ac90dad7cb775d774d
```

## Retained privacy, security, and DATABASE_URL evidence

- Projection remains an API/server allowlist, never a browser-filtered teacher DTO. Private real name, exact RT, rubric, grades, XP breakdown, comments, incidents, Red Codes, disciplinary reports, and detailed history remain excluded by negative tests.
- Projection and Show Student remain teacher-authenticated; the prior runtime check returned `401 AUTH_REQUIRED` for anonymous and revoked callers on both routes (4/4).
- `apps/api/test/integration/database-path.test.ts` passes in both current Vitest runs. The retained prior live-entrypoint evidence shows the non-secret `postgresql://placeholder.invalid:5432/database` value is rejected before filesystem/SQLite access by configure, migrate, bootstrap, and server startup. The URL-derived artifact tree remains absent.
- No privacy, security, database-path, or API behavior was changed by the Vitest discovery correction.

## Remaining findings

### CONDITION

- **C-01 — production privacy and recoverability gate:** host `restic` is unavailable (`restic: command not found`), so encrypted restic backup/restore execution has **not** been demonstrated. The passed `ops/backup/local-restore-drill.sh` is a separate local fixture restore check and must not be treated as encrypted-restic proof. Before real student data or production use, complete the approved SPEC-0014/0016 retention/deletion, backup-expiry, and quarterly encrypted restore-verification work.

### NON-BLOCKING

- Git cannot independently establish historical `DESIGN.md` equality because the relevant files are untracked. Direct current-artifact inspection found an approved Design and no Design change; this is not an acceptance-criterion failure.
- Deferred avatar strategy, Energy thresholds, school-year rollover, assessment context, and narrative media remain outside this foundation change.

## Exact files changed

- Correction under verification: `vitest.config.ts`
- This scoped Verify rerun: `docs/specs/SPEC-0001-platform-foundation/VERIFY-REPORT.md`
- Verify handoff: `.ai/context/SESSION.md`

## Exact next SDD step

`Archive SPEC-0001.`
