# SPEC-0021 — Verification

## Scope and level

**Level A — Luna Verify.** Compared `DESIGN.md` and `TASKS.md` with the
current RT UI boundary, strict SPEC-0019 RT semantics/privacy contract, the
SPEC-0020 calendar/session journey, API/domain tests, and runtime browser
evidence. No Terra, legacy orchestration, Git/VCS, or Ship action was invoked.
No implementation correction was required.

## Task completeness

All four implementation tasks and all four evidence-plan items in `TASKS.md`
are checked. The implementation remains bounded to `RtGrid`, its focused test,
and the existing calendar/session Playwright journey.

## Commands and results

| Command | Exit/result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/RtGrid.test.ts apps/api/src/rt/domain.test.ts apps/api/src/rt/service.test.ts apps/api/src/rt/routes.integration.test.ts` | **0 / PASS** — 4 files, 21 tests |
| `pnpm test` | **0 / PASS** — 40 files, 172 tests |
| `pnpm typecheck` | **0 / PASS** — web and API TypeScript checks |
| `pnpm build` | **0 / PASS** — Vite web and API TypeScript build |
| `pnpm exec playwright test apps/web/e2e/calendar-sessions.spec.ts` | **0 / PASS** — 1 Chromium journey; numeric POST and persisted numeric RT verified, then ended-session read-only verified |
| `pnpm exec playwright test` | **1 / PASS WITH CONDITION** — 44/45 passed. The existing `auth-projection.spec.ts` stale `Weekend Story` fixture expectation failed; the SPEC-0021 journey passed in the full run and in isolation. |

## Runtime and acceptance mapping

| Acceptance criterion | Evidence | Status |
|---|---|---|
| DOM values map exactly: `"10"`, `"5"`, `"0"` to JSON numbers and `"ABSENT"` to the string `"ABSENT"` | `mapRtSelectValue` has four explicit cases; `RtGrid.test.ts` passes 8/8 and asserts both value and `typeof`; isolated Playwright observes numeric `10` in the POST and verifies persisted numeric `10`. | **PASS** |
| Empty and unknown select values do not save | Explicit mapper returns `null`; focused test covers `''`, whitespace, `10.0`, and an unknown value; `onChange` calls save only for non-null mappings. | **PASS** |
| Autosave refreshes summaries before success feedback | `RtGrid` awaits `rtSummaries` after the save response and sets `RT saved.` only after that refresh; active-session Playwright completes the save journey successfully. | **PASS** |
| Success feedback is clear and does not replace failure affordances | Success copy is exactly `RT saved.`; failure copy is `RT could not be saved. Retry.` and renders `Retry RT`. Source inspection confirms success clears pending retry only after the refresh succeeds. | **PASS WITH CONDITION** — no existing runtime failure-injection browser test exercises the failure branch. |
| Failed save/summary refresh preserves the original value and same idempotency key for retry | `pending` stores `{ value, key }`; the retry invokes `save` with both unchanged; `workspaceApi.saveRt` forwards the supplied `Idempotency-Key`; strict API tests preserve canonical replay semantics. | **PASS WITH CONDITION** — source/API evidence is present, but no dedicated UI failure-injection runtime test was available. |
| Ended sessions remain read-only and emit no closed-session write | `readOnly` disables selects, save returns immediately, retry is hidden, and isolated Playwright verifies the ended grid is disabled with no retry action. SPEC-0019 route/domain tests also pass closed-session protections. | **PASS** |
| SPEC-0019 canonical RT semantics and strict API boundary remain intact | API route still accepts only numeric literals `10`, `5`, `0`, or string `ABSENT`; domain replay tests pass; focused API/domain/route suite passes 21/21. No coercion or validator change was introduced. | **PASS** |
| Calendar → RT journey remains intact | Dedicated journey configures the current weekday/time through the calendar UI, starts the session, records all four choices, reads the private RT endpoint, ends the session, and verifies read-only state. | **PASS** |
| No backend/domain/persistence/calendar/M3/privacy scope changed | Current change is limited to the explicit UI mapping, UI feedback/pending state, focused UI test, and existing journey evidence. API/domain/privacy tests pass; no migration, route, DTO, calendar, M3, projection, or persistence change is part of this verification. | **PASS** |

## Findings and residual risk

- **No Build correction made.** The current implementation matches the approved
  Level A Design; `DESIGN.md` was not rewritten.
- **Full Playwright condition:** the complete parallel run was 44/45. One
  failure is the known unrelated stale `Weekend Story` fixture assertion. The
  SPEC-0021 journey passed both as the required dedicated command and under
  the full parallel suite. This is retained as a test-environment residual
  risk, not treated as permission to broaden the change.
- **Failure-path coverage condition:** retry key/value retention and summary
  refresh ordering are verified by implementation inspection plus strict API
  replay tests, but the repository has no dedicated browser test that injects a
  failed save and clicks `Retry RT`. This does not block the Level A result,
  but it limits runtime proof of that UI failure branch.
- **C-01 remains unchanged:** production real-student use remains blocked by
  the repository's existing backup/restore evidence condition recorded by
  SPEC-0019; SPEC-0021 introduces no production-data or privacy surface.

## Verdict

**PASS WITH CONDITIONS.** The approved numeric-save boundary, strict canonical
RT semantics, active calendar→RT journey, privacy boundary, autosave refresh,
and ended-session read-only behavior are verified. Conditions are limited to
the pre-existing full-suite fixture/parallel sensitivity and the absence of a
dedicated injected-failure browser scenario; no SPEC-0021 implementation defect
or scope expansion was found.

## Changed files

- `docs/specs/SPEC-0021-rt-numeric-save-boundary/VERIFY.md` — created with this
  verification evidence.
