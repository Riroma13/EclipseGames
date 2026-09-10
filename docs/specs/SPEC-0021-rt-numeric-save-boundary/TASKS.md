# SPEC-0021 — Implementation and Evidence Plan

Design authority: `DESIGN.md`. Scope is limited to the existing `RtGrid`
boundary, its focused UI contract test, and the calendar/session Playwright
journey. Do not change backend/API/domain/persistence contracts or SPEC-0019/
0020 Designs.

## Implementation

- [x] Add one explicit `RtGrid` mapping for the four native-select values;
  return no value for empty or unexpected strings and never request on those
  paths.
- [x] Keep autosave, summary refresh, retry value/key retention, and ended-
  session read-only behavior intact; show `RT saved.` only after save and
  refresh succeed while preserving actionable failure feedback.
- [x] Add focused Vitest runtime-type coverage for numeric `10`, `5`, `0`,
  string `ABSENT`, plus empty/unrecognized local rejection.
- [x] Extend `apps/web/e2e/calendar-sessions.spec.ts` to observe a numeric RT
  POST and verify numeric persistence during the active session, while
  retaining four-choice, ended-session, and privacy assertions.

## Evidence plan

- [x] Focused Vitest UI-boundary test — `pnpm exec vitest run apps/web/src/workspace/RtGrid.test.ts`: 8/8 passed.
- [x] Focused/full Vitest suite — `pnpm test`: 40 files, 172 tests passed.
- [x] Web/API typecheck and production build — `pnpm typecheck && pnpm build`: both passed.
- [x] Dedicated calendar-session Playwright journey — `pnpm exec playwright test apps/web/e2e/calendar-sessions.spec.ts`: 1/1 passed.

Formal verification is recorded in `VERIFY.md`; the full-suite timing/fixture
condition and C-01 production condition are documented there.
