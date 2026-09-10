# SPEC-0022 — Persistent Demo Development Workflow

## Design

**Level B — Sol Design → Luna Build → Luna Verify.** This is local tooling over existing Vite, Fastify, SQLite, migration, bootstrap, and seed contracts. It adds no schema, production integration, product API/UI, or sensitive boundary, so Terra review is not justified. Build must stop and reclassify Level C if any such change or arbitrary deletion becomes necessary.

## Behaviour and scope

Root `pnpm dev:demo` starts the API on `127.0.0.1:3199` and Vite on `127.0.0.1:5173`. The browser uses `http://localhost:5173`, matching API origin enforcement. Vite retains HMR and proxies `/api` to `http://127.0.0.1:3199`; the existing `apps/api/package.json` `tsx watch src/server.ts` command restarts changed backend source.

Missing inherited values default to: `NODE_ENV=development`, `DATABASE_URL=/home/ubuntu/.local/share/eclipsegames-demo/review-m2.sqlite`, `API_HOST=127.0.0.1`, `API_PORT=3199`, `APP_ORIGIN=http://localhost:5173`, `API_ORIGIN=http://127.0.0.1:3199`, `BOOTSTRAP_TEACHER_EMAIL=teacher@example.test`, and `BOOTSTRAP_TEACHER_PASSWORD=change-me-in-development`. Explicit development values win; `NODE_ENV=production` is refused before side effects. The script neither reads nor rewrites `.env`.

Startup checks both effective ports, completes existing root `pnpm migrate`, then spawns the API watcher and Vite with `--host 127.0.0.1 --port 5173 --strictPort`. It never bootstraps, seeds, or resets. `openDatabase` retains its idempotent migration check; the SQLite file and changes survive restarts.

`pnpm demo:reset` is explicit destructive preparation. It refuses production or occupied demo ports and requires resolved `DATABASE_URL` to equal the canonical path. It refuses symlinks, removes only that SQLite file and exact `-wal`/`-shm` sidecars, then runs existing `migrate`, `bootstrap`, and `seed:demo` sequentially. Failure stops the chain. Wildcards, directory removal, alternate paths, and fallback deletion are forbidden.

**In:** root commands, one Node-standard-library script, focused tests, and a local/demo section in `docs/SDD-WORKFLOW.md`. **Out:** deployment, systemd, Docker, database architecture, product UI, M3, Windows/SSH, and generic process management.

## Ownership and process contract

| Owner | Contract |
|---|---|
| `scripts/demo-workflow.mjs` | Owns defaults, guards, preparation order, supervision, and diagnostics. No dependency is added. |
| Root `package.json` | Exposes only `dev:demo` and `demo:reset`; existing generic commands remain unchanged. |
| API/Vite | Existing watcher owns restart; Vite CLI owns bind/strict port and existing `API_ORIGIN` proxy owns `/api`; HMR remains direct. |

Each long-running command gets a POSIX process group. Signal, spawn failure, or either child exit terminates both groups: `SIGTERM`, bounded wait, then `SIGKILL`; exits are awaited. Propagate the causal non-zero status; unexpected zero server exit is failure. A second signal forces cleanup. Port preflight names the occupied endpoint; strict Vite/Fastify binds cover the check/start race.

## Data, API, UI, privacy, and failure boundaries

No schema, DTO, route, UI, auth, projection, or production configuration changes. Logs omit passwords and rows. Migration/bootstrap/seed errors block the operation. Existing migration transactions and seed transaction/collision/production guards remain authoritative. C-01 still blocks real-data production use.

## Tests and acceptance

- Node tests cover defaults/precedence, pre-side-effect production refusal, exact-path/symlink guards, no arbitrary deletion, migration/reset order, occupied-port diagnostics, failure propagation, signals/escalation, and no surviving descendants.
- Runtime checks prove fixed binds, strict-port failure, `/api` target, HMR, API watcher restart, and persistence without reseed.
- Acceptance requires one terminal to serve health/API and the browser on the specified defaults, source reload on both sides, persistence across stop/start, intentional canonical reset to the seeded baseline, clean Ctrl+C, no orphan, and unchanged generic/production workflows.

## Threat matrix

| Boundary | Applicability | Safe/failure behaviour and RED test |
|---|---|---|
| Process integration | Applicable | Argument-vector spawn only; signals/failures close both process groups; tests cover injection-like env text, exits, escalation, and descendants. |
| Documentation-like paths | N/A | No path classification or execution. |
| Git repository selection | N/A | No Git/VCS command. |
| Commit state | N/A | No commit/index handling. |
| Push state | N/A | No push handling. |
| PR commands | N/A | No PR handling. |

## Rollout

No migration, backfill, flag, or dependency. Land script, tests, package scripts, and documentation together. Rollback removes those local entry points; the demo database is intentionally left intact.

## Simplicity Check

One small Node script reuses pnpm, `tsx watch`, Vite, and existing data commands. No process-manager package, shell command composition, new configuration system, product abstraction, or production coupling is introduced; safety complexity is limited to the explicitly required lifecycle and exact-path reset boundary.
