# SPEC-0001 Apply Summary

Apply is complete for the approved platform foundation. Work Units 1–5 were implemented without changing `DESIGN.md`. Verify and Archive were not run.

## Incident-containment correction

A fresh audit found that inherited URL-shaped database configuration was being passed to SQLite as a filesystem filename. The centralized `validateSqlitePath` guard now rejects URI schemes before `dirname()` or `better-sqlite3` access, while preserving valid relative and absolute local SQLite paths. The guard is used by configure, migrate, bootstrap, server, and database-open entrypoints.

The confirmed generated artifact tree under `apps/api/postgresql:/...` was removed. No other `apps/api` or repository files were deleted, and no credential-bearing value was added to source, documentation, or logs. A regression test uses only a non-secret placeholder URL and proves rejection before file creation.

## Files and scope

### Created or modified

- `Dockerfile`, `.dockerignore`, `compose.yaml`
- `ops/nginx/protocole-eclipse.conf`
- `ops/backup/restic.env.example`
- `ops/backup/backup.sh`
- `ops/backup/restore-drill.sh`
- `ops/backup/local-restore-drill.sh`
- `ops/backup/README.md`
- `apps/api/package.json`, `apps/api/src/server.ts`
- `apps/api/src/db/path.ts`, `apps/api/scripts/configure.ts`, `apps/api/scripts/migrate.ts`, `apps/api/scripts/bootstrap.ts`
- `apps/api/test/integration/database-path.test.ts`
- `pnpm-lock.yaml`
- `docs/specs/SPEC-0001-platform-foundation/TASKS.md`
- `.ai/context/SESSION.md`

Earlier Apply work remains in the cumulative implementation tree and is recorded in Engram observation #1846.

## Working Set

- **Planned:** Docker/Compose topology, private volume, TLS proxy, restic backup policy and restore drill, full validation, Apply Summary, and SESSION handoff.
- **Actual:** Planned set plus `@fastify/static` wiring required for Fastify to serve the built SPA in production.
- **Deviations:** Restic binary was unavailable locally. The executable restic scripts and policy were added, and a deterministic local private-volume restore drill passed. Encrypted restic restore execution remains an environmental condition.

## Dependencies

- `@fastify/static@8.2.0` — serves the built React/Vite SPA from the Fastify production process.
- No cloud SDK, UI kit, message bus, generator, or product-domain dependency added.

## Acceptance criteria

- [x] **AC-1:** Workspace builds; Docker image, Compose topology, private persistent volume, migration-before-start, and Fastify-hosted SPA are implemented and smoke-tested.
- [x] **AC-2:** Existing auth, migration, typed-error, rollback, build, typecheck, Vitest, Docker, and migration-failure validation passed.
- [x] **AC-3:** Existing server-side projection allowlists and Playwright projection smoke passed.
- [x] **AC-4:** Existing representative pure-domain separation and RT tests passed.
- [x] **AC-5:** C-01 is explicitly carried as a production gate; retention/deletion ownership, deletion including backup expiry, and quarterly restore verification remain deferred to SPEC-0014/0016.

## Validation evidence

| Check | Result |
|---|---|
| `pnpm build` | PASS |
| `pnpm typecheck` | PASS |
| Full Vitest regression | PASS — 8 files, 20 tests, including SQLite path containment |
| `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts` | PASS — 1 test; Chromium installed with the approved Playwright command |
| `docker compose config` | PASS |
| `docker build -t eclipse-games:spec-0001 .` | PASS |
| Docker startup smoke | PASS — `/health` returned `{"status":"ok"}` and `/` served the SPA shell |
| Migration failure test | PASS — malformed migration exited 1 with `Migration 0002_auth_projection failed; startup is blocked.` |
| `restic version` | BLOCKED/N/A — `restic: command not found` |
| `ops/backup/local-restore-drill.sh` | PASS — restored non-empty SQLite fixture |
| Placeholder URL configure/migrate/bootstrap checks | PASS — all rejected before file creation |
| Confirmed incident tree removal | PASS — `apps/api/postgresql:` absent |

The migration-failure check used the source runtime because local compiled output does not carry SQL assets automatically; the production Docker image explicitly copies migrations into the compiled runtime path and passed its startup smoke.

The path-containment regression uses `postgresql://placeholder.invalid:5432/database`; the placeholder is non-secret and is not copied into production configuration.

## Post-Apply verification correction

The Verify failure was caused by root Vitest discovery collecting the Playwright-owned `apps/web/e2e/` specification. Added the root `vitest.config.ts` boundary to collect only API/domain Vitest suites and exclude `apps/web/e2e/**`; Playwright configuration and test ownership were unchanged.

| Check | Result |
|---|---|
| `pnpm exec vitest run` | PASS — 8 files, 20 tests |
| `pnpm exec vitest run apps/api/test packages/domain/test` | PASS — 8 files, 20 tests |
| `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts` | PASS — 1 test |
| `pnpm build` | PASS |
| `pnpm typecheck` | PASS |

This was a test-layer discovery-boundary correction only. No Design, product behavior, API, privacy boundary, or task checkbox changed.

## Privacy and security

- SQLite remains on the private Compose volume.
- TLS termination is specified in `ops/nginx/protocole-eclipse.conf` for an EU VPS reverse proxy.
- Projection remains server-allowlisted; the browser never receives or filters teacher DTOs.
- No secrets or student data were added.
- Backup password configuration is host-only and represented only by an example path.
- URL-shaped database configuration is rejected before filesystem or SQLite access.

## C-01 production gate

Before real student data or production use, SPEC-0014/0016 must define the retention/deletion owner and process, implement deletion including backup expiry, and record documented quarterly restore verification. This Apply phase does not implement those controls.

## Conditions and readiness

- Local restic execution remains unavailable until the host installs restic and configures an encrypted repository/password file.
- Playwright passed after installing only Chromium through `pnpm exec playwright install chromium`.
- The Docker startup smoke was rerun after the path correction and passed.
- The confirmed URL-derived artifact tree was removed; no unrelated files were deleted.
- Verify was not started.
- Archive was not run.
- No commit, push, merge, release, tag, or PR was created.

**Next step:** `Verify SPEC-0001.`
