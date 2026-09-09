# SPEC-0018 — Academic Calendar, Weekly Timetable, and Real Class Sessions

## Design

**Level C — Sol Design → separate Terra review → Luna Build → Terra Verify.** This SQLite migration adds teacher-private scheduling and the real-session identity consumed by M2–M11.

## Behaviour and scope

An active owned academic year has one IANA timezone, exactly `T1`–`T3`, holidays, and local weekly group slots. Terms/holidays are inclusive ISO dates within the year; terms cannot overlap (gaps allowed), holidays may overlap terms. Slots are weekday local `[start,end)`, `HH:mm`, non-midnight-crossing, and non-overlapping per group/weekday.

`Comenzar clase` is eligible only when the clock instant in that zone is in a term, not a holiday, and inside one slot. It explicitly creates one real session; no session auto-starts. `Finalizar clase` closes the teacher-owned active session after slot expiry if necessary; no session auto-ends. A closed slot/date cannot create another session.

**In:** setup/status, start/end, contracts, migration, tests. **Out:** projection, attendance, XP/RT/Energy/lives/gems/narrative, automatic scheduling, imports, recurrence engine, and `minigame_sessions` reuse.

## Ownership and decisions

| Decision | Choice / rationale |
|---|---|
| Boundaries | `calendar` owns configuration/lifecycle. It reads roster identity only through `getOwnedAcademicYearGroupContext(db, teacherId, yearId, groupId)`; it never queries roster tables. `roster` keeps year mutation/archive ownership and invokes calendar's narrow `assertAcademicYearLifecycleChange(...)` guard—no generic lifecycle engine. |
| Downstream | Export `getOwnedRealClassSessionContext(...)`; later domains use it rather than calendar tables. `minigame_sessions` is unrelated gameplay. |
| Clock/DST | Inject `Clock { now(): Date }`; production UTC `Date`, tests fixed instants. Use `Intl.DateTimeFormat` and `formatToParts` for local date/weekday/time, never host/browser timezone. Both repeated-hour instants match; nonexistent local times have no instant. |
| Replay/races | `BEGIN IMMEDIATE` transactions serialize setup/start/year mutation/archive. Partial unique indexes allow one active session per teacher and one per slot/local date. Calendar-owned request rows make a UUID-v4 key globally single-use per teacher across start and end; exact replay returns the stored session, all other reuse is `409`. |

## Data and migration

Forward migration `0011_academic_calendar_real_sessions` adds UUID/text IDs, `created_at`, and `RESTRICT` FKs:

| Table | Authority / invariant |
|---|---|
| `academic_calendars` | `academic_year_id UNIQUE`, owner, timezone. |
| `academic_terms` | calendar, `T1|T2|T3`, valid inclusive range, unique code. |
| `calendar_holidays` | calendar, valid inclusive range. |
| `weekly_timetable_slots` | calendar/group, weekday, valid local interval. |
| `real_class_sessions` | immutable owner/year/group/calendar/term/slot lineage; local/date-zone/slot snapshots; UTC start/end; partial active-teacher and slot/local-date uniques. |
| `real_class_session_requests` | calendar-owned `{owner_teacher_id, idempotency_key, operation, fingerprint, session_id}` journal, `UNIQUE(owner_teacher_id, idempotency_key)`. |

Composite keys make lineage enforceable: calendar has unique `(id, academic_year_id, owner_teacher_id)`; terms and slots carry that triple and reference it; slots also carry `(group_id, academic_year_id, owner_teacher_id)` and reference a unique group triple. Sessions carry the full triple plus term and slot identities, with composite FKs to their matching calendar/term/slot keys. In the same write transaction, calendar additionally joins the full chain to prove owner/year/group agreement, term containment of `local_date`, and slot/time containment—cross-row date/time assertions SQLite cannot express. The downstream session adapter returns only that joined, verified chain.

Replacement setup atomically validates references, terms, containment, overlap, and no active session. It rejects edits after the first session. Existing years remain readable but writes fail closed until configured; no backfill/seed. Add SQL to `migrations.ts` and Drizzle declarations. No reverse DDL: rollback disables routes/UI and restores a verified pre-migration backup.

**Roster lifecycle guard.** `PATCH /api/v1/academic-years/:id` continues through `roster.updateYear`, which runs `assertAcademicYearLifecycleChange` and `repository.updateYear` in one `BEGIN IMMEDIATE` transaction. For proposed inclusive `[startsOn, endsOn]`, the guard rejects `422` when any configured term range, holiday range, or persisted session `local_date` is outside; closed sessions remain readable and still protect their snapshot. `POST /api/v1/academic-years/:id/archive` similarly runs the guard then archive update in that transaction and rejects `409` if any session for the year is active; it archives only after a close. Guard/setup/start/archive conflicts are serialized; SQLite constraint/write races are converted to `409`, with no partial write.

## API and UI

Cookie-authenticated Zod routes use the existing safe envelope: absent/non-owned `404`, invalid input/state `422`, and active-archive, write-race, or replay mismatch `409`.

| Route | Contract |
|---|---|
| `GET/PUT /api/v1/academic-years/:yearId/calendar` | Read or atomically replace timezone, terms, holidays, and group slots; GET returns `configured:false` if absent. |
| `GET /api/v1/groups/:groupId/real-class-session-status?academicYearId=` | Private eligibility/active status; no roster data. |
| `POST /api/v1/groups/:groupId/real-class-sessions/start` | `{ academicYearId }` + UUID-v4 `Idempotency-Key`; `201` create, `200` replay. |
| `POST /api/v1/real-class-sessions/:sessionId/end` | Required key; `201` close, `200` replay. |

Add contract schemas/DTOs, mapper, repository/service/routes, clock and rules. The selected workspace gains a panel and configured/ineligible/active state; pending controls retain retry keys and refresh. Historical years are read-only. No projection mapper/route or client privacy filter is added.

For both lifecycle routes, look up `real_class_session_requests` by `(teacherId, Idempotency-Key)` before and again inside the write transaction. Fingerprint SHA-256 of canonical JSON `{ operation: 'START'|'END', routeTarget: groupId|sessionId, body: { academicYearId }|{} }`; it is stored with the operation and session. Same operation and fingerprint returns that session `200`; a changed target/body or **any cross-operation reuse** is `409`. The unique key makes concurrent duplicate start/end converge to one session/request record.

## Privacy, tests, and acceptance

Calendar/session data is teacher-private. Server ownership precedes every read/write; DTOs contain no student data; audit logs retain safe metadata only. Fail closed for archive/non-ownership, invalid zone/config/conversion, ineligibility, edit/collision, prior slot/date, stale/closed session, or replay mismatch. C-01 still blocks real student data/production pending retention, backup-expiry, and encrypted-restic restore evidence.

TDD pure rules first: ranges/overlap, `[start,end)`, IANA/DST, host-zone independence. Add SQLite composite-FK and malformed cross-calendar/cross-group lineage rejection; same-transaction chain, calendar setup/start versus roster year-update/archive races; date-range/session-snapshot rejection; active-archive rejection then closed-history read; concurrent duplicate start/end, changed-key, and cross-operation-key reuse. Fastify covers the existing roster PATCH/archive routes plus auth/ownership-as-404, `422`/`409`, DTO/log privacy; Playwright covers private setup, ineligible, start/retry/end.

- [ ] Owner-only atomic valid `T1`–`T3`, timezone, holidays, slots; unconfigured years create no session.
- [ ] Eligible start snapshots verified UTC/local lineage; concurrent requests preserve both session and request uniqueness, including cross-operation key refusal.
- [ ] Roster date update rejects out-of-range configured ranges/session snapshots; archive rejects active sessions, then closed history stays readable.
- [ ] Owner-only replay-safe end works after slot expiry; no student/projection leak.
- [ ] Private workspace exposes setup/status and only `Comenzar clase` / `Finalizar clase` lifecycle controls.

## Rollout, working set, and review

Deploy migration before routes/UI; no flag, conversion, or seed. If needed, disable feature and restore backup; never reverse-migrate. Terra review is required for migration/uniqueness, DST, ownership privacy, and adapter seams before Build and at Verify.

| Action | Files |
|---|---|
| Create | `apps/api/drizzle/0011_academic_calendar_real_sessions.sql`; `apps/api/src/calendar/{clock,rules,repository,service,mapper,routes}.ts`; calendar/API/privacy tests; `apps/web/src/workspace/CalendarSetup.tsx`; focused E2E. |
| Modify | `apps/api/src/{db/schema.ts,db/migrations.ts,server.ts,roster/service.ts,roster/repository.ts}`; `packages/contracts/src/index.ts`; `apps/web/src/workspace/{WorkspaceApp.tsx,workspace-api.ts}`; focused styles. |
| Preserve | Projection contracts/routes, `minigame_sessions`, XP/coin/game semantics, context authorities, backup/deployment policy. |

**Threat matrix:** N/A — no shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary.

**Simplicity Check:** one module, six narrow tables (including one calendar-only request journal), native `Intl`, injected clock, and two named adapters; no scheduler, generic engine, dependency, projection contract, or speculative downstream feature.
