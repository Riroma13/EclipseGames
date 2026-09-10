# SPEC-0024 — Verification evidence

**Verdict: PASS WITH CONDITIONS** — the approved Level C design is implemented
and runtime-verified. C-01 remains the sole production-only condition: encrypted
restic backup/restore execution has not been demonstrated, so real student data
and production use remain blocked.

## Scope and correction

Terra compared `DESIGN.md`, `TASKS.md`, SPEC-0018/0019/0020 contracts, the
calendar/RT/projection implementation, and the Professional Engineering
Baseline. All four tasks are complete.

Verification found and corrected only Design-authorized Build defects:

- status reported `canReplace:false` for an unconfigured, non-archived year,
  contrary to the calendar GET contract;
- active-session precedence discarded the selected-group preview, and therefore
  could hide an eligible next occurrence in another selected group;
- next-class searching had an arbitrary 400-day cap, contrary to the inclusive
  academic-year horizon.

The shared resolver now preserves the derived occurrence while returning
`ACTIVE_SESSION`; status retains an unused selected occurrence as `nextClass`;
and the search continues through `endsOn`. No schema, migration, M3/gem, RT
semantic, projection, or SPEC-0018/0019/0020 Design change was made.

## Commands and results

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/calendar/resolver.test.ts apps/api/src/calendar/clock.test.ts apps/api/src/calendar/service.test.ts apps/api/src/calendar/routes.integration.test.ts apps/api/src/rt/domain.test.ts apps/api/src/rt/service.test.ts apps/api/src/rt/routes.integration.test.ts apps/web/src/workspace/calendar-controls.test.ts apps/web/src/workspace/RtGrid.test.ts` | PASS — 9 files, 41 tests |
| `pnpm test` | PASS — 41 files, 182 tests |
| `pnpm typecheck` | PASS — API and web TypeScript checks |
| `pnpm build` | PASS — Vite production build and API compilation |
| `pnpm exec playwright test apps/web/e2e/calendar-sessions.spec.ts` | PASS — 2 Chromium teacher journeys |
| `pnpm exec playwright test` | PASS WITH CONDITION — 45/46 Chromium journeys passed; the unrelated existing `auth-projection.spec.ts` expects stale `Weekend Story` seed text |

## Acceptance mapping

| Approved requirement | Evidence | Result |
|---|---|---|
| Future timetable save is independent of eligibility; reload recovers it | `service.test.ts`; Playwright future timetable save/reload journey | PASS |
| One resolver governs status/start, with one transaction-captured start instant persisted unchanged | `resolver.ts`, `service.ts`; counting-clock service test | PASS |
| 15-minute half-open windows, seconds, scheduled-over-early, adjacency, used/all-used deterministic selection | resolver tests | PASS |
| Archived, unconfigured, term, holiday, no-class-day, timetable, used, and active states; exact archived Spanish copy | resolver/service tests and server message map | PASS |
| No technical IDs/numeric weekdays/student fields in occurrence status; projection/RT privacy unchanged | occurrence mapper, Fastify privacy tests, full projection suite, Playwright body assertion | PASS |
| Next class uses academic-year horizon, skips used/invalid occurrences, and handles DST gap/fold independent of host zone | `clock.test.ts`, resolver/service inspection and focused tests | PASS |
| Session identity, lineage, replay, uniqueness, recovery, and unchanged SPEC-0019 RT handoff | service/API/RT tests; first Playwright journey starts, records RT, ends, and shows read-only RT | PASS |
| Active other group blocks start and suppresses foreign controls/RT | service status test and `CalendarControls.tsx` selected-group branch inspection | PASS |
| No migration/M3/projection/domain expansion | migration/schema/projection inspection and full suite | PASS |

## Privacy and baseline review

Calendar status remains cookie-authenticated, ownership-first, and contains only
calendar/session operational data. Occurrence DTOs expose Spanish weekday labels
and times, never IDs or student data. Projection remains server-allowlisted;
the full projection privacy suite passed. RT still enters only through the
existing owned real-session adapter, remains private, and the browser journey
proved the closed grid is read-only. The UI has intentional loading, retry,
disabled/explained start, save/cancel/failure preservation, reload, and
selected-group active-session states.

## Findings and residual risk

- **Resolved during verification:** the three bounded defects listed above.
- **Residual production-only condition:** C-01 / KI-009. No encrypted-restic
  backup/restore execution evidence exists. This does not block local acceptance
  but blocks real student data and production use.
- **Unrelated full-suite condition:** the existing `Weekend Story` fixture
  expectation remains stale; both SPEC-0024 journeys pass in isolation and in
  the full run.
- No unresolved SPEC-0024 correctness, privacy, migration, or cross-domain
  blocker remains.
