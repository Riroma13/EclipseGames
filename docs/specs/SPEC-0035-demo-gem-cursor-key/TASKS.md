# SPEC-0035 Tasks

## Expected Change Surface

- `scripts/demo-workflow.mjs`: deterministic default, namespaced override, and minimal safe validation.
- `scripts/demo-workflow.test.mjs`: default, override, generic isolation, and safety-boundary coverage.
- `DESIGN.md`, `VERIFY.md`: this bounded implementation evidence.

## Read Order

1. `DESIGN.md`
2. `scripts/demo-workflow.mjs`
3. `scripts/demo-workflow.test.mjs`
4. `apps/api/src/gems/cursor.ts` and `apps/api/src/server.ts`

## Bounded Task Slices

- [x] Add deterministic demo-only cursor-key default and `ECLIPSE_DEMO_*` override.
- [x] Validate override grammar minimally while retaining server fail-closed behavior.
- [x] Extend focused Node tests for precedence and safety boundaries.

## Critical Terra Verification Gate

Not run for this Level A Luna-only maintenance fix. Coordinator may perform any
separate runtime smoke; no Playwright or long-running demo smoke is required here.
