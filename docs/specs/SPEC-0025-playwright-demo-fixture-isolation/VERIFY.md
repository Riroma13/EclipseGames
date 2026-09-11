# SPEC-0025 - Verification

```yaml
schema: gentle-ai.verify-result/v1
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 5/5
scenarios: 4/4
test_command: pnpm exec playwright test
test_exit_code: 1
build_command: pnpm build
build_exit_code: 0
```

## Verdict

**PASS WITH WARNINGS for SPEC-0025 acceptance.** The fixture isolation change
passes the focused mutation/archive, canonical-seed, repeated-invocation,
normal-worker, API integration, typecheck, and build evidence. Full Playwright
is not clean because one unrelated routing E2E fails; no application, API,
seed, schema, UI, or production defect was found in this SPEC.

## Scope and Evidence

| Check | Result |
|---|---|
| Design/Tasks comparison | PASS: implementation follows the revised approved Level A Design and all 5 tasks are checked. |
| `playwright.config.ts` | PASS: one `randomUUID()` temp path is evaluated once, then passed identically to bootstrap, `seed:demo`, and API startup. `reuseExistingServer: false`. |
| Worker and workaround audit | PASS: no retries, sleeps, timeout changes, serial mode, rename workaround, assertion weakening, or global fixture serialization was added. Normal execution reports 2 workers. |
| Focused parallel regression, original order | PASS: `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts apps/web/e2e/fixture-isolation.spec.ts --workers=2`, 4/4; repeated twice. |
| Focused parallel regression, reverse order | PASS: `pnpm exec playwright test apps/web/e2e/fixture-isolation.spec.ts apps/web/e2e/auth-projection.spec.ts --workers=2`, 4/4; repeated twice. |
| Canonical auth/projection and seed | PASS: auth/projection scenarios passed in every focused invocation; canonical `Weekend Story` remained unchanged. |
| Full Playwright | WARNING: 46/47 using normal 2 workers; the only failure is unrelated routing fallback event visibility. |
| API integration | PASS: `pnpm exec vitest run apps/api/test/integration`, 15 files and 68 tests. |
| Typecheck | PASS: `pnpm typecheck`. |
| Build | PASS: `pnpm build`. |

## Acceptance Mapping

| Design acceptance | Runtime proof | Status |
|---|---|---|
| Fresh invocation displays canonical `Weekend Story` | Auth/projection passed in all 4 focused invocations; every setup log shows bootstrap then seed | PASS |
| Mutating regression owns a unique non-canonical entity and leaves canonical seed unchanged | `fixture-isolation.spec.ts` passed 4 times; UUID title, ownership visibility, update/archive, active cleanup, archived retention, and canonical snapshot assertions | PASS |
| Focused tests run concurrently without contamination or order dependence | Original and reverse file orders, 2 workers, repeated twice each | PASS |
| Repeated invocations seed independently | Four fresh invocations passed; each used mandatory setup and a unique database path | PASS |
| No product or production behaviour changes | Config and E2E fixture only; API seed/integration, typecheck, and build remain green | PASS |

## Exact Commands and Results

```text
pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts apps/web/e2e/fixture-isolation.spec.ts --workers=2
PASS, 4/4; Running 4 tests using 2 workers. Repeated twice.

pnpm exec playwright test apps/web/e2e/fixture-isolation.spec.ts apps/web/e2e/auth-projection.spec.ts --workers=2
PASS, 4/4; Running 4 tests using 2 workers. Repeated twice.

pnpm exec playwright test
FAIL, 46 passed / 1 failed; Running 47 tests using normal 2 workers. Failure: `apps/web/e2e/routing.spec.ts:117`, timed out waiting for heading `Events`.

pnpm exec vitest run apps/api/test/integration
PASS, 15 files / 68 tests.

pnpm typecheck
PASS, apps/web and apps/api typechecks.

pnpm build
PASS, web Vite build and API TypeScript build.
```

## Failure and Residual Risk

The unrelated routing journey fails in the full suite at
`apps/web/e2e/routing.spec.ts:117`: after fallback navigation, the expected
`Events` heading is absent within the existing assertion window. This is not a
SPEC-0025 fixture failure; all focused SPEC-0025 tests pass in both orders and
all other full-suite tests pass. It is not fixed here because verification is
restricted to the approved fixture/config boundary and no timeout or retry
workaround is permitted.

The exact stale `Weekend Story` contamination is fixed at its source: each
Playwright invocation receives a new OS temporary database, setup is mandatory,
and no existing server is adopted. The real demo seed constants and seed
semantics are unchanged, so `Weekend Story` remains normal product seed
behavior. The mutating regression owns a UUID-named preset and never mutates or
archives the canonical record. Seed integration proves fixed content, collision
failure, replay idempotency, rollback, and production refusal.

No Git/VCS/Ship operation was performed.
