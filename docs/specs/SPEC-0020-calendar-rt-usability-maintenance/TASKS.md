# SPEC-0020 — Implementation and Evidence Plan

## Plan

- [x] Update the calendar status DTO with `reason` and calendar DTOs with authoritative `canReplace`.
- [x] Replace the single-slot CalendarControls draft with hydrated, labelled ISO weekday multi-period editing, preserving holidays and other groups; add pre-session Edit/Save/Cancel and read-only locking.
- [x] Preserve the active/ended session handoff and render ended RT through the existing private GET as an explicitly read-only grid.
- [x] Add focused domain/API/component coverage and update the dedicated UI-driven Playwright journey without direct calendar PUT.
- [x] Run focused tests, typecheck, build, and the dedicated browser journey; record evidence and residual risk here.

## Evidence

### Focused evidence

- `pnpm exec vitest run apps/api/src/calendar apps/api/src/rt apps/web/src/workspace/calendar-controls.test.ts apps/web/src/workspace/workspace-api.test.ts` — PASS, 9 files / 32 tests.
- `pnpm exec playwright test apps/web/e2e/calendar-sessions.spec.ts` — PASS, 1 browser journey.
- `pnpm test` — PASS, 39 files / 164 tests.
- `pnpm typecheck` — PASS, web and API TypeScript checks.
- `pnpm build` — PASS, web Vite build and API TypeScript build.

The first browser attempt expected `201` for the existing roster batch contract, which returns `200`; the journey assertion was corrected without changing application code, then the journey passed.

## Residual risk

- The dedicated browser journey depends on the local API/database fixture and a clock whose current local time must be inside the configured UI-selected period.
- C-01 remains a production-only privacy/recoverability gate as required by the repository context.
- Formal verification is recorded in `VERIFY.md`; the remaining full-suite warning
  and C-01 production condition are documented there.
