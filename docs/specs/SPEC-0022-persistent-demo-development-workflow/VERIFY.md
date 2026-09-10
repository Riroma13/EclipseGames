# SPEC-0022 — Verification

## Verdict

**PASS WITH CONDITIONS.** The approved Level B local workflow is implemented and
the focused/full automated checks pass. Safe runtime checks prove the requested
binds, API health, Vite proxy, HMR client, migration-before-start, persistence
boundary, signal cleanup, and occupied-port diagnostics. The canonical demo DB
was not reset. Direct source-edit watcher restart and a forced child-spawn
failure were not exercised; the implementation/configuration evidence is
consistent with those contracts, so they remain residual verification risk.

## Scope and boundaries

- Compared `DESIGN.md`, `TASKS.md`, the implementation, package scripts, API
  and Vite configuration, migration/bootstrap/seed entrypoints, and
  `docs/SDD-WORKFLOW.md`.
- No Terra, legacy orchestration, Git/VCS, or Ship was invoked.
- No implementation, production/Docker/systemd/product/API/schema/privacy
  file was changed.
- Only this `VERIFY.md` was created/refreshed.
- `pnpm demo:reset` was not run; the real canonical demo database was not
  intentionally destroyed.

## Commands and results

| Command/check | Result |
|---|---|
| `pnpm test:demo-workflow` | PASS — 4/4 Node tests. |
| `pnpm test` | PASS — 40 files, 172 tests. |
| `pnpm typecheck` | PASS — web and API TypeScript checks. |
| `pnpm build` | PASS — Vite web build and API TypeScript build. |
| `env -u NODE_ENV -u DATABASE_URL -u API_HOST -u API_PORT -u APP_ORIGIN -u API_ORIGIN -u BOOTSTRAP_TEACHER_EMAIL -u BOOTSTRAP_TEACHER_PASSWORD node --input-type=module -e "import { effectiveEnvironment } from './scripts/demo-workflow.mjs'; console.log(JSON.stringify(effectiveEnvironment(), null, 2));"` | PASS — exact approved development defaults: `development`, canonical `/home/ubuntu/.local/share/eclipsegames-demo/review-m2.sqlite`, `127.0.0.1`, `3199`, `http://localhost:5173`, `http://127.0.0.1:3199`, `teacher@example.test`, and `change-me-in-development`. |
| `env -u DATABASE_URL pnpm dev:demo` safe runtime check, then `curl -fsS http://127.0.0.1:3199/health`, `curl -fsS http://127.0.0.1:5173/api/v1/health`, and `curl -fsS http://127.0.0.1:5173/@vite/client` | PASS — migration ran first; API bound `127.0.0.1:3199`; Vite bound `127.0.0.1:5173`; health and proxied health returned `{"status":"ok"}`; HMR client served. Stopped with terminal-like `SIGINT`/`SIGTERM` checks and no listeners remained. |
| `env -u DATABASE_URL setsid pnpm dev:demo` followed by `kill -INT -- -<leader-pid>` | PASS — exit status `130`; both detached child process groups were cleaned and `ss` showed no listeners on 3199/5173. |
| `python3` listener on `127.0.0.1:3199`; `env -u DATABASE_URL pnpm dev:demo` | PASS — exit status `1`, clear `Port 3199 on 127.0.0.1 is occupied or unavailable.`, no Vite listener. |
| `python3` listener on `127.0.0.1:5173`; `env -u DATABASE_URL pnpm dev:demo` | PASS — exit status `1`, clear `Port 5173 on 127.0.0.1 is occupied or unavailable.`, no API listener. |
| `DATABASE_URL=/tmp/spec-0022-direct.sqlite node scripts/demo-workflow.mjs start`, health check, stop, listener check | PASS — migration completed before startup, API health returned OK, database remained available across stop; no reset/bootstrap/seed was invoked. |

## Acceptance mapping

| Acceptance criterion | Evidence | Status |
|---|---|---|
| Exact development defaults; explicit values win; production is refused before side effects; production config unchanged | `DEFAULTS`, `effectiveEnvironment`, `assertDevelopment`, focused test, exact-default command; no production files/scripts changed | PASS |
| API `127.0.0.1:3199`; Vite `127.0.0.1:5173`; strict port; HMR and `/api` proxy | `server.ts`, Vite CLI args in `demo-workflow.mjs`, `vite.config.ts`, live health/proxy/HMR checks | PASS |
| Backend watcher restarts changed source | Existing `apps/api/package.json` command is `tsx watch src/server.ts`; supervisor invokes that exact watcher | PASS WITH CONDITION — source-edit restart was not directly exercised in this verification run |
| Pending migrations precede startup; startup does not seed/reset; persistent DB survives restart | Root `migrate` is awaited before `supervise`; `openDatabase` retains idempotent migration; live logs show migration first and no seed/reset; temp DB survives stop | PASS |
| Reset is exact-path/symlink/sidecar guarded and ordered `migrate`, `bootstrap`, `seed:demo` | `guardResetPath`, exact unlink list, sequential command loop, and focused guard tests; no destructive reset run | PASS WITH CONDITION — destructive order was verified by source/tests, not by deleting the canonical DB |
| Signals/failures clean both process groups, report occupied ports, leave no orphan | detached child groups, bounded TERM/KILL cleanup, terminal-like signal runtime check, occupied API/Vite checks | PASS WITH CONDITION — forced spawn-error path was not separately induced |
| Docs accurate | `docs/SDD-WORKFLOW.md` local demo section matches commands, defaults, persistence, reset order, and production refusal | PASS |
| No production/Docker/systemd/product/schema/privacy scope changed | Design scope, changed implementation boundaries, package scripts, and full tests reviewed | PASS |

## Design/task coherence

- `TASKS.md` has all five tasks checked and its recorded test/typecheck/build
  results were reproduced.
- Root `package.json` exposes only the approved `dev:demo` and `demo:reset`
  additions; existing generic commands remain unchanged.
- `scripts/demo-workflow.mjs` uses Node standard library only, argument-vector
  spawning, exact canonical deletion guards, existing migration/bootstrap/seed
  commands, and detached process groups as designed.
- API, Vite, migration, bootstrap, seed, product routes, DTOs, schema, and
  privacy boundaries remain outside the change.

## Findings and residual risk

### Warnings

1. The runtime run intentionally exercised the canonical default startup and
   migration check but did not execute destructive reset. This is appropriate
   for verification safety; reset deletion remains covered by source inspection
   and focused guard tests.
2. A real backend source edit was not made solely to trigger `tsx watch`; the
   exact existing watcher command and supervisor wiring were inspected.
3. The child spawn-error branch was not forced because doing so would require
   altering or replacing an approved executable during the runtime check.

### Residual risk

The remaining risk is limited to unexercised runtime branches above. No
acceptance failure, privacy exposure, unsafe migration, production coupling, or
unapproved scope was found. The canonical demo database remains intact.
