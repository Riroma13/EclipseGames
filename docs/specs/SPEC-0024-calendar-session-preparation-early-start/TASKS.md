# SPEC-0024 — Build plan and evidence

This is a plain implementation plan derived from the approved `DESIGN.md`.
Only C-01 remains production-only; no migration, production seed, or product
redesign is in scope.

## Plan

- [x] 1. Add host-independent calendar wall-time conversion and a pure,
  instant-driven resolver covering status/start/next-class precedence,
  half-open early windows, used occurrences, archived/no-class states, and
  DST gap/fold behaviour.
- [x] 2. Refactor calendar service and API to use the resolver, capture one
  transaction-local start instant, persist it unchanged, and expose additive
  Spanish status/occurrence/next-class DTO fields while preserving ownership,
  idempotency, lineage, uniqueness, and RT seams.
- [x] 3. Separate calendar editing from preparation UI; implement loading,
  empty, error/retry, disabled, next-class, active-other-group suppression,
  save/cancel/recovery, and reload-safe Spanish presentation.
- [x] 4. Add focused resolver, service, API/privacy, component, and dedicated
  Playwright teacher-journey coverage, then run focused/full tests, typecheck,
  build, and browser checks.

## Evidence

Evidence was recorded here during Build; formal verification is recorded in
`VERIFY.md`.

| Scope | Command / scenario | Result |
|---|---|---|
| Resolver | `pnpm exec vitest run apps/api/src/calendar/resolver.test.ts apps/api/src/calendar/clock.test.ts` | PASS — 7 tests |
| Service/API | `pnpm exec vitest run apps/api/src/calendar` | PASS — 17 tests |
| Web/component | `pnpm exec vitest run apps/web/src/workspace/calendar-controls.test.ts` | PASS — 2 tests |
| Full suite/typecheck/build | `pnpm test`; `pnpm typecheck`; `pnpm build` | PASS — 41 files / 177 tests; both recursive checks passed |
| Playwright teacher journey | `pnpm exec playwright test apps/web/e2e/calendar-sessions.spec.ts` | PASS — 1 journey |

## Build findings and corrections

- Preserved the existing `localParts` public shape while adding a detailed
  seconds-aware helper, so exact boundary comparisons do not break callers.
- Optimized wall-time conversion to test timezone offsets and both fold sides
  without host-local date parsing; Paris DST gap/fold tests pass.
- Retained an ended selected-group session in the UI after End so SPEC-0019 RT
  remains visible and read-only; foreign active sessions never reach RT.
- The pre-change browser run exposed stale English selectors and the ended RT
  handoff; the journey and UI were corrected and the final browser run passed.

## Scope self-check

- No changes to SPEC-0018, SPEC-0019, or SPEC-0020 Designs.
- No schema migration, RT/Energy/M3 change, projection change, lifecycle
  state, legacy orchestration, Git/VCS operation, or Ship.
- Rollback boundary is the files changed for this SPEC; existing session rows
  remain valid because only derived selection and `startedAt` behaviour change.
