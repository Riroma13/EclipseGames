# SPEC-0026 Verification

## Verdict

**PASS WITH WARNINGS**

The approved Level A implementation satisfies the stale teacher-context race
requirements. No source correction was required during verification. The final
focused, relevant, and full suites are green; one transient route assertion
failure occurred during the first repeated focused run and was not reproduced
by the isolated case, a second repeated run, or the full browser suite.

## Scope Checked

- `DESIGN.md` was read and not modified.
- `TASKS.md` was updated only with verification evidence.
- `apps/web/src/app/teacher-context.tsx` was compared with the approved Design.
- Relevant browser coverage reviewed: `stale-context-load.spec.ts`,
  `routing.spec.ts`, `auth-projection.spec.ts`, and the relevant
  `teacher-workspace.spec.ts` journeys.
- No API, server, schema, database, domain, authentication, router, or product
  contract files were changed.

## Acceptance Mapping

| Acceptance | Evidence | Result |
|---|---|---|
| Latest-generation-wins for years and groups | Separate monotonic `yearGeneration` and `groupGeneration` refs; request snapshots and live URL/context checks guard fallback, success, error, and finally continuations. | PASS |
| AbortController retained but not authoritative | Both effects create controllers and abort in cleanup; generation/context checks independently suppress stale completions. | PASS |
| Immediate dependent clearing | `selectYear` increments group generation, clears `groups` and `groupId`, clears the URL group, and starts loading the selected year. Invalid year state also clears groups/selection. | PASS |
| Canonical context and hash | Focused tests prove new year/group selection, delayed old group suppression, delayed old year suppression, canonical hash replacement, and route preservation. | PASS |
| Auth, historical, ownership, navigation, privacy preserved | Full routing, auth/projection, teacher workspace, API Vitest, and privacy tests passed; no boundary files changed. | PASS |
| No retries, sleeps, timeout changes, serialization, or weakened assertions | Source change is limited to guards/clearing; focused tests use controlled route responses and existing assertions. No new retry/sleep/serialization or assertion weakening was introduced. | PASS |

## Runtime Evidence

| Command | Result |
|---|---|
| `pnpm exec playwright test apps/web/e2e/stale-context-load.spec.ts --workers=1 --repeat-each=5` | Final run PASS, 20/20. Initial run: 19/20, one transient failure where the delayed-year case retained the correct year/group but observed `#/workspace` instead of `#/events`; no source change followed. |
| `pnpm exec playwright test apps/web/e2e/stale-context-load.spec.ts -g "delayed old academic-year response" --workers=1 --repeat-each=10` | PASS, 10/10. |
| `pnpm exec playwright test` | PASS, 49/49 with normal 2 workers. |
| `pnpm exec vitest run apps/web/src` | PASS, 10 files / 51 tests. |
| `pnpm test` | PASS, 41 files / 182 tests. |
| `pnpm typecheck` | PASS, web and API. |
| `pnpm build` | PASS, web and API. |

## Findings

### Warning

The first 5x isolated stale-context run exposed one non-reproducible route
assertion failure in the delayed academic-year test. The same test passed 10/10
when isolated, passed in the subsequent 5x four-test run, and passed in the
full 49-test run. This remains a test-environment flake signal, not a proven
implementation defect.

## Residual Risk

- The browser suite still has ordinary timing sensitivity in the existing test
  harness; verification did not add sleeps, retries, or timeout changes.
- No new unit-level hook harness exists for React effect continuations; runtime
  controlled-response browser coverage is the authoritative proof for this
  Level A change.
- Production use remains subject to the repository's existing privacy and
  recoverability conditions; SPEC-0026 does not alter them.
