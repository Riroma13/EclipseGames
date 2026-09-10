# SPEC-0024 — Calendar Session Preparation and Early Start

## Design and evidence

**Level C — Luna Explore → Sol Design → separate Terra review → Luna Build → Terra Verify.** Although no migration is needed, this changes the authoritative resolver that selects persisted real-session identity and is consumed by SPEC-0019 RT. Terra review is justified for precedence, DST, uniqueness, ownership, and status/start consistency.

Repository evidence: SPEC-0018 owns calendar/session lineage and SPEC-0020 owns editable-calendar and RT handoff behaviour. `calendar/service.ts` currently performs an unordered in-progress-slot lookup separately for status/start, `CalendarControls.tsx` couples editing and preparation, and no next-class derivation exists. Existing session rows already snapshot the selected slot/date/year/group/term/teacher and enforce active-teacher and slot/date uniqueness.

## Behaviour

Calendar configuration remains editable at any date/time whenever existing server-derived `canReplace` permits it: the year is not archived and its calendar has no session history. Saving has **no current-time, current-term, holiday, timetable, or early-window eligibility gate**. Server replacement remains atomic; load, edit, save, cancel, failed-save draft recovery, and reload persistence are intentional. The editor is separate from session-preparation status.

`Comenzar clase` remains explicit. An owned active teacher session always blocks another start. Otherwise a class may start during its scheduled local interval or during a fixed, non-configurable 15-minute window immediately before it. The UI shows authoritative, actionable Spanish status and never enables a start the same resolver would reject.

## Exact eligibility algorithm

One pure calendar resolver is used by status, start, and next-class calculation. The resolver receives an explicit instant, never a `Clock`; each status request captures `clock.now()` exactly once and passes that instant with owned calendar configuration, teacher-active-session state, and used slot/date identities.

1. Record any teacher-active session. Continue deriving the selected group's preview, but final reason is `ACTIVE_SESSION`, `eligible:false`; start fails `409` before creating anything.
2. Resolve the instant into the calendar IANA timezone, including local date, ISO weekday, and second-level wall time. Reject invalid timezone conversion safely.
3. If the year is archived, return `ARCHIVED_YEAR`; if no calendar exists, return `UNCONFIGURED`; if the local date is outside every term or inside a holiday, return the corresponding state before slot selection (all subject to active-session precedence).
4. Load the selected group's slots in deterministic order. Persisted overlapping slots remain invalid. If malformed data produces multiple scheduled matches, fail closed and log only safe calendar metadata.
5. Find a scheduled candidate satisfying `start <= now < end`. Its presence takes precedence over every upcoming early window. If its `(slotId, localDate)` is used, return `USED_SLOT_DATE`; do not fall through to an adjacent/upcoming slot.
6. If there is no scheduled candidate, collect starts satisfying `start - 15 minutes <= now < start` and order the full candidate set by nearest start, then earlier end, then stable slot ID. Choose the first unused `(slotId, localDate)`. If every candidate is used, keep the first candidate in that same full ordering as `currentClass` and return `USED_SLOT_DATE`; filtering used candidates must not erase or nondeterministically choose the occurrence being reported.
7. Return `ELIGIBLE` with `startTiming: 'SCHEDULED' | 'EARLY'`, or `NO_CLASS_DAY` when the date has no valid slot occurrence, otherwise `OUTSIDE_TIMETABLE`.

Start re-runs this resolver inside the existing `BEGIN IMMEDIATE` transaction after idempotency replay and ownership checks. A non-replay start captures one `decisionInstant = clock.now()` inside that transaction, passes that exact `Date` to the resolver, and persists `decisionInstant.toISOString()` unchanged as `startedAt`. Eligibility and `startedAt` MUST NOT perform separate clock reads; auxiliary creation/request timestamps cannot influence either value. Active-session and uniqueness checks remain database-backed; races return `409` without partial writes.

## Boundary, overlap, and adjacency semantics

For scheduled `[start,end)` and early `[start-15m,start)`: exactly 15 minutes before is enabled; 16 minutes before is blocked; exact start is scheduled, not early; exact end and all later instants are blocked unless another slot independently matches. Comparisons include seconds, not truncated display minutes.

Configuration still rejects overlapping timetable slots. Early windows may overlap a preceding scheduled slot: the in-progress slot wins even when already used. For adjacent `09:00–10:00` and `10:00–11:00`, `09:45–09:59:59` resolves to the first slot; at `10:00` the second slot wins. Multiple early candidates use the deterministic ordering above.

## Next-class calculation

The horizon is the selected academic year's inclusive `endsOn`, not a configurable or arbitrary day count. Search local dates from today through that boundary and occurrences by start, end, then stable slot ID. A candidate must be within a configured term, outside holidays, belong to the selected group/weekday, map to a real zoned occurrence, and have no existing session for its slot/date. Skip gaps, holidays, out-of-term dates, used occurrences, and nonexistent DST local times. Repeated-hour instants remain eligible under SPEC-0018, but slot/date uniqueness permits only one session.

Calendar clock handling adds one host-independent `wallTimeToZonedInstant(localDate, localTime, timezone)` contract for next-class occurrence construction. It MUST NOT use host-local `Date` parsing or constructors. It finds candidate instants whose `Intl.DateTimeFormat(..., { timeZone: timezone })` round-trip exactly to the requested ISO date and `HH:mm:00` wall time: zero matches means a nonexistent spring-gap time and returns no occurrence; one match is returned; repeated-wall-time matches are ordered by epoch and the **earlier instant (first fold occurrence)** is selected. Tests pin `Europe/Paris` `2026-03-29 02:30` as nonexistent and `2026-10-25 02:30` to `2026-10-25T00:30:00.000Z`, and run under non-Paris host timezones.

When the current resolver has an unused scheduled/early candidate, `nextClass` describes it; otherwise it describes the first future unused occurrence whose start has not passed. Return `null` after the horizon. An active session does not alter this derived preview, but still blocks start.

## Session identity

Early start changes only `startedAt`. Creation preserves the resolver-selected existing `slotId`, local class date, timezone and slot snapshots, academic year, group, term, calendar, and teacher ownership. Existing request fingerprints, UUID-v4 idempotency keys, exact replay (`200`), create (`201`), cross-operation/key mismatch (`409`), active-teacher uniqueness, slot/date uniqueness, immutable history, composite lineage, and SPEC-0019 owned-session adapter remain unchanged.

## Scope and ownership

**In:** fixed early start, shared resolver, next-class derivation, Spanish preparation status, editor/preparation separation, active-other-group handling, focused API/UI/DB/browser tests.

**Out:** schema changes, configurable early windows/horizons, holiday editor, session-history UI, automatic start/end, attendance, projection, RT/Energy semantics or persistence, M3/gems, XP, behaviour, narrative, imports, and general recurrence engines. SPEC-0018/0019/0020 Designs are not modified.

`calendar` owns the resolver, session creation, status DTO, clock/timezone handling, and calendar rules. `roster` remains the ownership source through its existing adapter. `rt` continues to consume only `getOwnedRealClassSessionContext`; React never infers authorization or eligibility.

## Data, API, and UI effects

Keep the existing authenticated status route and backward-compatible `configured`, `canReplace`, `eligible`, `reason`, and operational `active: RealClassSessionDto | null`. Status `canReplace` must equal calendar GET, including `true` for an unconfigured non-archived year and `false` for an archived year. Add only the two status distinctions required by this scope, `ARCHIVED_YEAR` and `NO_CLASS_DAY`, plus:

```ts
type ClassOccurrenceDto = {
  localDate: string;
  weekdayLabel: string; // Spanish, never ISO weekday number
  startsAt: string;
  endsAt: string;
};
type SessionStatusDto = {
  configured: boolean;
  canReplace: boolean;
  eligible: boolean;
  reason: 'ACTIVE_SESSION' | 'ARCHIVED_YEAR' | 'UNCONFIGURED' | 'OUTSIDE_TERM' |
    'HOLIDAY' | 'NO_CLASS_DAY' | 'OUTSIDE_TIMETABLE' |
    'USED_SLOT_DATE' | 'ELIGIBLE';
  startTiming: 'EARLY' | 'SCHEDULED' | null;
  message: string;
  currentClass: ClassOccurrenceDto | null;
  nextClass: ClassOccurrenceDto | null;
  activeForSelectedGroup: boolean;
  active: RealClassSessionDto | null;
};
```

`currentClass` is the scheduled/early occurrence considered now, including the deterministically ordered used occurrence when all early candidates are used; `nextClass` is unused and equals it when eligible. Both are `null` for `ARCHIVED_YEAR`, without configuration, or beyond the year horizon. `startTiming` is non-null only for `ELIGIBLE`; `activeForSelectedGroup` is true only when `active.groupId` matches the route group.

`ClassOccurrenceDto` and rendered status contain no UUID, technical ID, term ID, or numeric weekday. The existing `active` object is retained only as the private operational compatibility contract needed to end the session and load SPEC-0019 RT; its IDs are never rendered.

Server-owned Spanish messages are stable. `ARCHIVED_YEAR` is exactly `Este curso académico está archivado. No se pueden comenzar clases.` The remaining messages are `Configura el calendario para preparar esta clase.`, `Hoy está fuera de los trimestres configurados.`, `Hoy no hay clase: es un día festivo configurado.`, `Hoy no hay clase programada para este grupo.`, `Este periodo ya se utilizó. Consulta la próxima clase.`, `Puedes comenzar la clase hasta 15 minutos antes.`, and, for scheduled eligibility, exactly `Puedes comenzarla ahora.` Active copy distinguishes `Hay una clase activa...` from `Hay una clase activa en otro grupo. Ve a ese grupo y finalízala antes de comenzar otra.`

Extract a focused calendar editor from session preparation without redesigning the workspace. Preparation renders Spanish status and next class, loading/empty/error/retry/disabled states, and explains disabled start. For an active session in the selected group, show End and RT normally. For another group, show neither that session's RT nor an End action in the selected-group panel; direct the teacher to select the active group. Group switching then exposes the existing End/RT flow.

## Privacy and failure boundaries

All data remains cookie-authenticated and teacher-private; ownership precedes derivation and non-owned resources remain `404`. No student data enters status/occurrence DTOs, logs, or projection. UI state never authorizes start. Status failure clears stale eligibility, disables Start, and offers retry. Failed calendar save preserves the draft; failed start/end preserves its idempotency key. Resolver/configuration corruption, invalid zone conversion, and ambiguous overlap fail closed. Existing `401`, `422`, and race/replay `409` behaviour remains; C-01 still blocks real-data production.

## Persistence, migration, compatibility, and rollout

No migration, table, backfill, seed, feature flag, or dependency is required. Existing indexes and session snapshots remain authoritative. API additions are additive except the two new reason enum members; deploy API and web together so exhaustive clients understand them. Rollback restores prior API/web code and leaves all sessions valid; no data rollback. Preserve SPEC-0019 RT routes, adapter, closed-session read-only handoff, and all projection/domain contracts.

## Focused tests and acceptance

- TDD resolver tests use an injected fake clock for 16/15 minutes, exact start/end, seconds, scheduled-over-early precedence, adjacency, used-current refusal, skipped used early candidates, all-used deterministic `currentClass`, tie ordering, active priority, archived/no-class/holiday/term states, DST gaps/repeats with earlier-fold selection, and host-zone independence.
- SQLite/service tests prove status/start select the same slot/date identity, a ticking/counting clock is read once by start inside the transaction and that exact instant becomes `startedAt`, next-class skips used dates through year end, replay/uniqueness/history/lineage survive early start, and active sessions block same/other groups.
- Fastify contract tests assert every reason/timing including exact `ARCHIVED_YEAR` reason/message and `canReplace:false`, exact DTO shape, Spanish copy, no occurrence IDs/numeric weekdays/student fields, ownership-as-404, and safe failure codes.
- Component tests cover separate editor and preparation state, save/cancel/failure recovery, persistence reload, next-class formatting, explained disabled actions, retries, and active-other-group RT suppression.
- Playwright covers the complete teacher journey: configure a future timetable in the UI while currently ineligible, save and reload it, observe next-class guidance, start at the early boundary, enter RT through unchanged SPEC-0019 UI, switch groups and see the active-session block without foreign RT, return, end, and see RT read-only. Focused journeys also prove holiday/no-class and already-used presentation and no projection leakage.

Acceptance requires status and start agreement under one fake clock; one transaction-captured start instant used unchanged for resolver eligibility and persisted `startedAt`; exact half-open boundaries and deterministic precedence, including nearest-start/earlier-end/stable-slot `currentClass` when every early candidate is used; `ARCHIVED_YEAR` with exactly `Este curso académico está archivado. No se pueden comenzar clases.`, `eligible:false`, `canReplace:false`, and null class occurrences; future configuration independent of start eligibility; correct schedule-derived session identity with only early `startedAt`; host-independent next-class construction that rejects spring gaps and chooses the earlier fold instant; safe next-class horizon/skips; actionable Spanish states including exactly `Puedes comenzarla ahora.`; active-teacher blocking with correct RT presentation; runtime API/DB contracts, reload/recovery, responsive controls, and no RT/M3/domain/projection change.

## Review, threat matrix, and Simplicity Check

Because this remains Level C, Terra must review this revised Design again before Build, focusing on single-instant start semantics, archived status, resolver determinism, DST gap/fold construction, used/adjacent precedence, operational-ID privacy, transaction races, and the SPEC-0019 seam. **Threat matrix:** N/A — no routing, shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary.

**Simplicity Check:** one pure derived resolver, one fixed product constant, existing tables/transactions/routes, a year-derived horizon, and one small UI separation solve the workflow. No scheduler, persisted derived state, setting, dependency, migration, generic recurrence engine, or downstream domain change is introduced.
