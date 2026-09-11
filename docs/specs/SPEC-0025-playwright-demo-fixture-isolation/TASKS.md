# SPEC-0025 - Build Tasks and Evidence

Derived from the approved Level A `DESIGN.md`.

## Plan

- [x] Allocate one unique OS temporary SQLite path at Playwright config evaluation.
- [x] Pass the exact path to `bootstrap`, `seed:demo`, and API startup in the existing ordered setup chain.
- [x] Force `reuseExistingServer: false` without changing worker parallelism, retries, timeouts, or application behavior.
- [x] Reuse the existing canonical Weekend Story coverage and add one focused mutation/archive regression fixture that creates and owns a unique test preset; existing product assertions remain unchanged.
- [x] Run focused parallel, reverse-order, full Playwright, API integration, typecheck, and build evidence and record exact results.

## Build Evidence

- `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts apps/web/e2e/fixture-isolation.spec.ts --workers=2` - PASS, 4/4; repeated twice, canonical auth/projection and test-owned create/mutate/archive ran concurrently.
- `pnpm exec playwright test apps/web/e2e/fixture-isolation.spec.ts apps/web/e2e/auth-projection.spec.ts --workers=2` - PASS, 4/4; repeated twice, reverse file order also passed.
- `pnpm exec playwright test` - WARNING, 46/47 with the configured normal 2 workers; the SPEC-0025 focused tests and canonical Weekend Story coverage passed, while one unrelated routing test failed.
- `pnpm exec vitest run apps/api/test/integration` - PASS, 15 files / 68 tests; includes seed, auth, database-path, content, and API integration coverage.
- `pnpm typecheck` - PASS; API and web typechecks completed.
- `pnpm build` - PASS; web Vite build and API TypeScript build completed.
- The focused harness creates a uniquely named preset through the real API, proves the authenticated teacher owns it, mutates and archives only that preset, proves it is absent from active results but retained by `includeArchived=true`, and proves the canonical `Weekend Story` snapshot remains unchanged. The existing archive endpoint's HTTP 200 response is asserted without changing application/API code.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Both focused file orders PASS 4/4 with 2 workers on two consecutive executions each. Full Playwright: 46/47; one unrelated routing failure. |
| Runtime harness scenarios | PASS: unique test-owned create, ownership/list visibility, mutation, archive cleanup, archived retention, canonical Weekend Story snapshot invariant, concurrent normal workers, reverse order, repeated invocations, and canonical seed behavior. |
| Rollback boundary | Revert `apps/web/e2e/fixture-isolation.spec.ts` and this `TASKS.md`; no application, API, seed, schema, UI, or Playwright config files changed in this resumed build. |

## Scope Check

- `DESIGN.md` unchanged.
- `apps/web/e2e/fixture-isolation.spec.ts` is the focused regression harness for creating, mutating, and archiving a unique test-owned preset; it never changes the canonical seeded preset, seed data, or application code.
- The canonical seed remains product behavior: `Weekend Story` is supplied by the unchanged normal demo seed and is asserted read-only by `auth-projection.spec.ts` and the ownership regression.
- No retries, sleeps, timeout changes, serialization, or weakened assertions were introduced; per-invocation database isolation remains in `playwright.config.ts`.
- No Git/VCS/Ship operation performed.
