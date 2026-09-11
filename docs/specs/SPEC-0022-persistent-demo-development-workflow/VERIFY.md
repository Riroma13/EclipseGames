# SPEC-0022 - Verification

## Verdict

**PASS WITH WARNINGS.** The revised Level B Design is implemented and all six
tasks are checked. Focused tests, the full suite, typecheck, build, canonical
runtime startup, both canonical occupied-port cases, signal cleanup, readiness,
proxying, and clean subsequent startup passed. Warnings are limited to reset
execution against the canonical database and safe live injection of executable
spawn failure, readiness timeout, and second-signal escalation.

## Scope And Boundaries

- Compared the revised `DESIGN.md`, `TASKS.md`, implementation/tests,
  `package.json`, API/Vite configuration, migration entrypoint, and
  `docs/SDD-WORKFLOW.md`.
- No `DESIGN.md` change was made.
- Only `TASKS.md` and this `VERIFY.md` were changed by Verify.
- No production, product, schema, deployment, Docker, systemd, API, or privacy
  boundary file was changed.
- No Git/VCS or Ship operation was performed.
- `pnpm demo:reset` was not run against the canonical database.

## Commands And Exact Results

| Command/check | Result |
|---|---|
| `pnpm test:demo-workflow` | PASS, exit 0: 12/12 Node tests, including generic isolation, validation, pre-side-effect refusal, occupied ports, atomic ownership, API-only, Vite-only, partial recovery, absent-component safety, and reset refusal. |
| `pnpm test` | PASS, exit 0: 41 files and 182 tests. |
| `pnpm typecheck` | PASS, exit 0: recursive web and API TypeScript checks. |
| `pnpm build` | PASS, exit 0: web Vite build and API TypeScript build. |
| `node --input-type=module - <<'NODE' ... NODE` canonical lifecycle harness, with `XDG_RUNTIME_DIR` temporary and generic `DATABASE_URL`, `API_PORT`, `APP_ORIGIN`, and `API_ORIGIN` unset | PASS, exit 0: API `/health`, Vite `/`, and Vite `/api/v1/health` all 200; first group stopped by SIGTERM and second group by SIGINT; both ports clear after each; second startup succeeded. Direct child results were `{code:null,signal:"SIGTERM"}` and `{code:null,signal:"SIGINT"}`. |
| `node --input-type=module - <<'NODE' ... NODE` occupied-port harness | PASS, exit 0: an unrelated listener on 3199 and then 5173 remained alive; each `pnpm dev:demo` exited 1 with the matching `Port ... is occupied` diagnostic. |

The two inline Node commands above were bounded harnesses run from the
repository root. Their temporary ownership directories were removed; the
canonical database was not reset or deleted.

## Acceptance Mapping

| Explicit requirement | Evidence | Status |
|---|---|---|
| Generic inherited `DATABASE_URL`, `API_PORT`, `APP_ORIGIN`, and `API_ORIGIN` cannot override canonical values | `effectiveEnvironment` initializes `DEFAULTS` and reads only `ECLIPSE_DEMO_*`; focused test plus source inspection of `scripts/demo-workflow.mjs:9-19,36-40`; canonical harness unset all four generic variables | PASS |
| Canonical SQLite migration/startup | `startDemo` runs `recoverOwner`, preflight, then `pnpm migrate` before supervision; canonical harness reached API health and did not invoke reset/bootstrap/seed | PASS |
| Unrelated 3199 and 5173 occupants are detected and never killed | Focused occupied-endpoint test; live blockers on both 3199 and 5173 survived failed startup; preflight occurs before migration/children | PASS |
| Stale owned API-only recovery | Focused detached process fixture matched API identity, terminated its group, safely cleared absent web component and record | PASS |
| Stale owned Vite-only recovery | Focused detached process fixture matched web identity, terminated its group, safely cleared absent API component and record | PASS |
| Partially stale stack recovery | Focused fixture recovered the independently matching group and cleared the stale unmatched record; `recoverOwner` evaluates API and web independently and checks endpoints before clearing | PASS |
| Complete readiness | Canonical harness required API `/health` and Vite root 2xx; implementation uses bounded HTTP readiness rather than spawn success | PASS |
| Ctrl+C/SIGTERM cleanup | Canonical harness used both signals and observed zero listeners on 3199/5173 after each process-group stop | PASS |
| Failed child startup cleanup | `supervise` catch path cleans all children already recorded; Vite failure path includes the API child; spawn/exit causal errors are surfaced. No safe live executable replacement was performed | PASS WITH WARNING |
| Clean subsequent startup | Canonical harness started, stopped, and started again successfully without stale ownership or occupied endpoints | PASS |
| Reset remains guarded and non-triggered | Focused production/non-canonical pre-side-effect tests; source verifies exact canonical path, regular-file checks, exact `-wal`/`-shm` targets, and migrate/bootstrap/seed order; reset was not invoked | PASS WITH WARNING |
| Production/generic workflow unaffected | `package.json` retains existing `dev`, test, typecheck, build, `dev:demo`, and `demo:reset`; full suite, typecheck, and build passed; no production/product files changed | PASS |

## Design And Task Coherence

- All six `TASKS.md` plan items are checked.
- `scripts/demo-workflow.mjs` uses canonical defaults, validated namespaced
  overrides, atomic token ownership, PID start/group identity, command and
  endpoint matching, bounded readiness, direct migration/API/Vite spawning,
  process-group cleanup, and guarded reset as designed.
- `scripts/demo-workflow.test.mjs` covers both symmetric stale component shapes,
  partial recovery, occupied absent endpoints, and pre-side-effect guards.
- `docs/SDD-WORKFLOW.md` matches the revised precedence, recovery, readiness,
  persistence, privacy, and reset contracts.

## Findings And Residual Risk

1. No critical failure was found. The canonical database remains intact.
2. Canonical destructive reset was intentionally not executed. Deletion targets,
   symlink/non-file/sidecar refusal, and command order are source-verified and
   bounded by guard/pre-side-effect tests.
3. Forced executable spawn failure, readiness-timeout injection, and second-
   signal escalation were not live-injected because doing so would require
   perturbing approved installed executables or an active workflow. The cleanup
   and escalation paths are source-verified, while normal signal cleanup passed.
4. The focused ownership fixtures use detached synthetic Node processes with
   the expected command shape; they prove identity/group/recovery logic but do
   not independently emulate a real API listener and Vite listener for every
   stale-record shape.
