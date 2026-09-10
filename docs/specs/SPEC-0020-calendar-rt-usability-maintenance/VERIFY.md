# SPEC-0020 — Verification

## Scope and level

**Level B — Luna Verify.** Compared the approved `DESIGN.md` and `TASKS.md`
with the current implementation, tests, SPEC-0018 calendar/session rules,
SPEC-0019 RT/privacy boundaries, repository canonical rules, and the stated
acceptance criteria. No Terra, legacy orchestration, Git/VCS, or Ship action
was invoked.

## Commands and results

| Command | Exit/result |
|---|---|
| `pnpm exec vitest run apps/api/src/calendar apps/api/src/rt apps/web/src/workspace/calendar-controls.test.ts apps/web/src/workspace/workspace-api.test.ts` | **0 / PASS** — 9 files, 32 tests |
| `pnpm test` | **0 / PASS** — 39 files, 164 tests |
| `pnpm typecheck` | **0 / PASS** — web and API TypeScript checks |
| `pnpm build` | **0 / PASS** — Vite web build and API TypeScript build |
| `pnpm exec playwright test apps/web/e2e/calendar-sessions.spec.ts` | **0 / PASS** — 1 Chromium journey |
| `pnpm exec playwright test` | **1 / PASS WITH CONDITION** — 44/45 passed; one unrelated pre-existing seed expectation failed |

The dedicated journey creates its own roster through the API, configures
today's weekday and local period through the UI (without calendar PUT), saves,
starts a real class, records `10`, `5`, `0`, and `ABSENT` (`Ausente`), ends the
class, and verifies the same RT grid is disabled and labelled `Read-only — class
ended`.

## Task completeness

All five TASKS.md items are checked. The listed focused, browser, full test,
typecheck, and build evidence was rerun; the final evidence is recorded here.

## Acceptance mapping

| Acceptance criterion | Evidence | Status |
|---|---|---|
| ISO Monday–Sunday values/labels; hydrated multi-period selected-group editing; add/remove; preserve holidays and other groups | `CalendarControls.tsx` and focused UI contract test; server replacement remains atomic and preserves non-selected slots/holidays. | PASS |
| Pre-session Edit/Save/Cancel; authoritative post-history/archive lock | `canReplace` is server-derived and gates `Edit calendar`; save/cancel use the hydrated DTO; calendar service rejects replacement after session history and archived writes. | PASS |
| Stable status codes and exact copy with required precedence | Calendar service test covers `UNCONFIGURED`, `OUTSIDE_TIMETABLE`, `ELIGIBLE`, `ACTIVE_SESSION`, and `USED_SLOT_DATE`; UI maps all seven documented reasons exactly. | PASS |
| SPEC-0018 rules remain intact | Calendar/session focused and integration tests pass: three terms, timezone-local eligibility, ownership, idempotent start/end, active-session/archive conflict, and used slot/date. No migration or calendar rule change was introduced. | PASS |
| Ended RT is private, read-only, complete, and emits no closed-session write | RT private API/domain tests pass; `RtGrid` loads through existing private GET, displays all saved values, disables controls, and returns before POST when ended. Server closed writes remain `409` in SPEC-0019 implementation. | PASS |
| Preserve `10|5|0|ABSENT`, no projection leakage, and zero M3 currency work | RT tests pass, projection privacy tests are included in the full suite, RT contains no coin/gem write path, and no projection DTO/route was modified. | PASS |
| Dedicated UI journey and no unrelated scope/migration | Dedicated Playwright passes. Changed application scope is limited to the approved calendar/RT maintenance; no migration, seed, dependency, projection, M3, history, or broad redesign change was introduced. | PASS |

## Findings and bounded correction

- The initial full Playwright run had a strict locator collision because the
  new calendar legend repeated the group name already shown in the workspace.
  The legend was changed to the neutral approved-scope label `Selected
  timetable periods`; this is a bounded UI correction and does not change the
  contract or behavior. The affected journey and full suite were rerun.
- The remaining full Playwright failure is
  `apps/web/e2e/auth-projection.spec.ts` expecting stale seed text `Weekend
  Story`; it is unrelated to SPEC-0020 and matches the pre-existing suite
  fixture-isolation warning recorded by SPEC-0018/0019.

## Privacy and residual risk

Calendar, session, and RT routes remain cookie-authenticated and teacher-owned;
calendar/session/RT DTOs contain no real names or projection fields. The ended
RT state is display-only in the workspace and private GET remains the read
authority. No projection route or mapper changed. Academic values, XP,
behaviour, narrative, and currency semantics remain separate.

- **C-01 production condition:** encrypted-restic restore, retention/deletion,
  and backup-expiry evidence remain absent; real student data and production
  use remain blocked by repository policy.
- The dedicated browser journey depends on the local API/database fixture and
  the current clock being inside the UI-configured UTC period.
- Full Playwright remains **44/45** because of the unrelated stale-seed
  `Weekend Story` expectation; all SPEC-0020-focused runtime checks pass.

## Verdict

**PASS WITH CONDITIONS.** SPEC-0020 meets its approved Level B Design and
acceptance criteria with focused and full Vitest evidence, typecheck/build
evidence, privacy checks, and the dedicated calendar→RT browser journey. The
unrelated full-suite fixture warning and production-only C-01 condition remain.
