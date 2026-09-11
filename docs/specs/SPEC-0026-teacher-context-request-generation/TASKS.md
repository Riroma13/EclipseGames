# SPEC-0026 Tasks

## Build

- [x] Add authoritative monotonic generation and request-context guards to academic-year and group loads, including fallback, success, error, and finally continuations.
- [x] Preserve AbortController cancellation while clearing dependent groups and selection immediately on year changes.
- [x] Preserve canonical URL reconciliation, authentication, historical read-only, ownership, navigation, and privacy behaviour.
- [x] Add controlled delayed-response E2E coverage for rapid switching, delayed year responses, deterministic new context selection, canonical hashes, and section navigation.

## Evidence

- Focused web Vitest: `pnpm exec vitest run apps/web/src` -> PASS, 10 files / 51 tests.
- Full Vitest: `pnpm test` -> PASS, 41 files / 182 tests.
- Isolated stale-context E2E: `pnpm exec playwright test apps/web/e2e/stale-context-load.spec.ts --workers=1 --repeat-each=5` -> PASS, 20/20 on the final run; the initial run had one transient route assertion failure in repetition 1/5 and 19/20 passed.
- Isolated delayed-year E2E: `pnpm exec playwright test apps/web/e2e/stale-context-load.spec.ts -g "delayed old academic-year response" --workers=1 --repeat-each=10` -> PASS, 10/10.
- Full browser command: `pnpm exec playwright test` -> PASS, 49 tests / 49 passed with normal 2 workers.
- Type/build commands: `pnpm typecheck` -> PASS (`apps/web`, `apps/api`); `pnpm build` -> PASS (`apps/web`, `apps/api`).

## Rollback Boundary

Revert `apps/web/src/app/teacher-context.tsx` and the SPEC-0026-owned delayed-response tests; no API, server, schema, domain, or persisted-data changes are involved.
