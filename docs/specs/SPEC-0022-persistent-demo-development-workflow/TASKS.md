# SPEC-0022 - Build Tasks and Evidence

Plain implementation plan derived from `DESIGN.md`.

## Plan

- [x] Implement canonical development defaults, namespaced validated overrides,
  production refusal, exact reset-path guards, and safe port preflight.
- [x] Implement per-user atomic ownership metadata with PID start identity,
  process-group identity, command arguments, independently proven API/Vite
  recovery, absent-component endpoint checks, fail-closed unrelated-occupant
  handling, and token-checked cleanup.
- [x] Implement direct API/Vite process-group supervision, bounded HTTP
  readiness, causal spawn/exit failure handling, signal escalation, and
  descendant cleanup while preserving migration/reset order.
- [x] Add focused Node regression tests for precedence, validation, production
  refusal, reset guards, occupied ports, atomic ownership, API-only, Vite-only,
  partially stale, absent-component safety, and stale records.
- [x] Document precedence, readiness, ownership/recovery, persistence, privacy,
  and explicit reset boundaries in `docs/SDD-WORKFLOW.md`.
- [x] Run focused tests, full tests, typecheck, build, and a bounded runtime
  lifecycle check; record exact results below.

## Evidence

## Build evidence

- `pnpm test:demo-workflow` - PASS, 12/12 Node tests, including API-only,
  Vite-only, partially stale, and occupied absent-component recovery fixtures.
- `pnpm test` - PASS, 41 files and 182 tests.
- `pnpm typecheck` - PASS, API and web typechecks.
- `pnpm build` - PASS, web Vite build and API TypeScript build.
- Bounded runtime checks - PASS: canonical startup/migration with generic
  `DATABASE_URL`, `API_PORT`, `APP_ORIGIN`, and `API_ORIGIN` removed; API/Vite
  readiness and proxy, SIGTERM/SIGINT cleanup, unrelated occupancy on both
  canonical ports, and clean subsequent startup all passed. Direct process
  termination reported the expected signal (`SIGTERM`/`SIGINT`) rather than a
  shell-normalized `143`/`130`; both listeners were absent after each stop.
  The canonical database was not reset.
- No reset was run: the destructive command remains explicit and the canonical
  demo database must remain intact during Build.

Formal verification is recorded in `VERIFY.md`; direct child-process failure
and reset execution branches remain focused-test/runtime-harness follow-up for
Verify where the repository harness can safely exercise them.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `pnpm test:demo-workflow` - PASS, 12 tests |
| Runtime harnesses | Canonical and disposable-override direct signal harnesses: startup/readiness, API/Vite proxy, HMR, watcher restart, SIGTERM/SIGINT, unrelated occupied-port safety, and clean subsequent startup PASS |
| Rollback boundary | Revert only `scripts/demo-workflow.mjs`, `scripts/demo-workflow.test.mjs`, `docs/SDD-WORKFLOW.md`, and this task evidence; no database reset or product changes |
