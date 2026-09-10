# SPEC-0022 — Build Tasks and Evidence

Plain implementation plan derived from `DESIGN.md`.

## Plan

- [x] Add one Node standard-library workflow script with effective development
  defaults, production refusal, exact demo-path guards, port preflight, ordered
  reset, and process-group supervision.
- [x] Expose only `dev:demo` and `demo:reset` at the repository root.
- [x] Add focused Node tests for defaults, safety, ordering, ports, failures,
  signals, and cleanup.
- [x] Document the local/demo commands and their persistence/reset boundary in
  `docs/SDD-WORKFLOW.md`.
- [x] Run focused tests, full tests where practical, typecheck, build, and safe
  runtime checks; record results here.

## Evidence

## Build evidence

- `pnpm test:demo-workflow` — PASS, 4/4 Node tests.
- `pnpm test` — PASS, 40 files and 172 tests.
- `pnpm typecheck` — PASS, API and web typechecks.
- `pnpm build` — PASS, web Vite build and API TypeScript build.
- Safe runtime check with `DATABASE_URL` unset — PASS: migration ran, API
  `/health` returned `{"status":"ok"}`, Vite served on `localhost:5173`,
  SIGTERM returned status 143, and no listeners or watcher descendants
  remained. The shell inherited an unrelated PostgreSQL `DATABASE_URL`, so
  the check explicitly removed it to exercise the approved demo default.
- No reset was run: destructive reset is covered by exact-path guards and was
  not needed to prove this non-destructive Build; the canonical demo database
  was left intact.

Formal verification is recorded in `VERIFY.md`; the canonical reset and a few
direct child-process failure branches remain documented residual risks there.
