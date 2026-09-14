# SPEC-0036 — M5 Quarterly Observation Rubric

## Design status and route

**Level C — Sol Design only.** Migration, teacher-private educational records, and XP/calendar/workspace effects justify an independent Terra review under the default SDD Lite route. The maintainer explicitly selected a design-only route, so Terra is **not invoked** and no Build, Verify, or Ship work is authorized by this document.

This Design is the implementation contract. Repository code on current main is implementation truth; the canonical product rules in `AGENTS.md` and the bounded evidence cited below constrain decisions.

## 1. Scope and non-goals

**In scope:** term-attributed base-XP evidence; four-category provisional suggestions; per-category evidence counts and warnings; persisted teacher adjustments/comments; exact Observation grade; explicit `OPEN → CLOSED → REOPENED → CLOSED` lifecycle; immutable versioned close snapshots; ownership, idempotency, concurrency, privacy, migration, private API, Spanish teacher-workspace integration, and focused tests.

**Non-goals:** changing annual effective-XP totals, thresholds, levels, badges, specialty bonuses, Emerald/Ruby/Diamond or legacy coin flows; changing game progression, RT/Energy, behaviour, narrative, roster/archive semantics, calendar configuration, export, projection/Show Student fields, rankings, student accounts, generic audit/event-sourcing engines, or retention/backup implementation.

Behaviour never changes base XP, evidence eligibility, rubric levels, grade, or RT. The rubric reads XP evidence but does not write XP, levels, badges, gems, game progression, RT, Energy, behaviour, or narrative.

## 2. Current repository evidence

- `apps/api/src/db/schema.ts` and `apps/api/drizzle/0004_xp_specialties_levels_badges.sql` store immutable XP originals and one compensating reversal; events currently have academic-year but no term/session identity.
- `apps/api/src/xp/repository.ts` derives annual progression from active events (`LEFT JOIN xp_evidence_reversals ... r.id IS NULL`) and currently sums `effective_xp`; rubric must instead sum active `base_xp` by term/category.
- `apps/api/src/xp/service.ts` accepts XP without a real-session requirement and snapshots bonus facts. Its ownership/archive checks and UUID-v4 idempotency fingerprint pattern are established boundaries.
- `apps/api/drizzle/0011_academic_calendar_real_sessions.sql` gives every real session immutable owner/year/group/`term_id` lineage. `docs/specs/SPEC-0018-academic-calendar-weekly-timetable-real-class-sessions/DESIGN.md` identifies this session identity for M2–M11 and prevents calendar replacement after the first session.
- `apps/api/src/calendar/routes.ts` and `apps/api/src/roster/calendar-context.ts` establish cookie authentication, ownership-as-404, and narrow cross-domain adapters.
- `apps/api/src/projection/mapper.ts` constructs projection DTOs by server allowlist. Existing privacy tests in `apps/api/test/privacy/projection.test.ts` negatively assert rubric/grade/comments/history exclusion.
- `apps/web/src/workspace/WorkspaceApp.tsx`, `StudentPanel.tsx`, and `workspace-api.ts` hold selected year/group/student context, abort stale reads, clear private state on `401`, and render historical records read-only.
- `apps/api/src/http/errors.ts` standardizes `{code,message,requestId}` and payload-free logging metadata.
- Canonical rules in `.ai/context/PROJECT.md:331-368` and `.ai/context/DECISIONS.md:259-286` require active **base** XP, four thresholds, teacher judgement, exact grade formula, term-scoped rubric snapshots, and projection exclusion.

## 3. Domain rules and ownership

### 3.1 Authoritative term attribution

For every new XP event, the XP service must resolve the teacher's active real class session through a narrow calendar-owned adapter and require its owner, academic year, and group to match the owned student context. It snapshots `real_class_session_id` and `term_id` on the immutable event. No date inference, client-supplied term, or later calendar lookup is authoritative. Without one matching active session, XP creation fails `422`; this prevents apparently valid XP from silently missing the quarterly rubric. Annual XP remains the active event's effective-XP sum across the year.

Existing events receive nullable attribution columns and are never guessed from UTC `created_at`. An unattributed legacy event remains valid annual XP/level/game evidence but is excluded from every term rubric and is reported privately as unattributed.

### 3.2 Evidence, suggestion, count, and grade

For `(student, academicYear, term, category)`, qualifying rubric evidence is each immutable original XP event whose snapshotted `term_id` and category match and which has no reversal. Each event counts exactly once regardless of base value or specialty bonus. The category aggregate is `SUM(base_xp)` only; `specialty_bonus_xp` and `effective_xp` are excluded.

Active base-XP suggestion:

| Base XP | Suggested level |
|---|---|
| 0–2 | 1 — Insuficiente |
| 3–5 | 2 — En desarrollo |
| 6–9 | 3 — Adecuado |
| 10+ | 4 — Excelente |

Each category exposes `qualifyingEventCount` and `lowEvidence = count < 4`. The rubric exposes `hasLowEvidence` when any category is below four. This is a non-blocking professional-judgement warning: it does not alter suggestions, prevent adjustment/close, or invent XP.

The final level is the teacher override when present, otherwise the current suggestion. All four final levels are required implicitly because every suggestion is 1–4. The official grade is exactly `(sum of four final levels / 16) * 10`. Calculation uses integers: `levelSum ∈ 4..16`, `gradeMilli = levelSum * 625`, and the database stores both integers, never binary floating point. API snapshots expose `gradeDecimal` as an exact fixed three-decimal string (`"8.125"`); Spanish UI renders the same value with decimal comma and trims only trailing zeros (`8,125`, `7,5`, `10`), with `/10`. No intermediate or display rounding changes the official value.

### 3.3 Correction/reversal lineage

A reversal removes its target from computed-on-read current totals/counts/suggestions but never rewrites an existing close snapshot. Each snapshot records the exact included XP event IDs plus snapshotted category/base XP. A closed view compares that evidence set with current active attributed evidence and reports stale evidence without changing the official snapshot. To issue a corrected grade, the teacher explicitly reopens and closes a new version. Reversals continue to affect annual XP, levels, badges, and game transition lineage under existing XP rules; the rubric causes no cross-domain write.

## 4. Lifecycle, drafts, snapshots, and concurrency

- **OPEN / provisional:** no close exists. Suggestions, counts, aggregates, unattributed count, and evidence drift are computed on read. Nullable category overrides and one private comment are persisted as the editable draft.
- **CLOSED:** one immutable snapshot version is official. Draft mutation is rejected. Current evidence may drift, but the returned official grade/levels/comment remain from the snapshot.
- **REOPENED / editable:** reopening requires a trimmed 1–500 character reason. The prior snapshot remains immutable; editable overrides are seeded from its final levels and the draft comment from its comment. Live evidence is computed again.
- **CLOSED again:** close creates version `previous + 1`, never updates a snapshot, and returns to `CLOSED`.

Every mutable evaluation has integer `revision`, incremented by save, close, and reopen. Draft save, close, and reopen require `expectedRevision`; mismatch is `409 CONFLICT` with no write. Each mutation also requires a teacher-scoped UUID-v4 `Idempotency-Key`, fingerprinting operation, route identities, expected revision, and normalized body. Same key/fingerprint returns the original operation result (`200` replay); key reuse with another fingerprint is `409`. First save returns `200`; first close/reopen returns `201`. `BEGIN IMMEDIATE` encloses ownership/state/revision checks, live evidence read, snapshot/evidence/lifecycle/request inserts, and evaluation update. Concurrent different-key attempts serialize: exactly one wins and the stale operation receives `409`. Timeout retry with the same key cannot create a second version. Close when already closed and reopen when open/reopened are state conflicts unless they are exact journal replays.

## 5. Data model and migration

Forward migration `0015_quarterly_observation_rubric`, registered after `0014`, runs transactionally and blocks startup on failure.

| Table/change | Contract |
|---|---|
| `xp_evidence_events` | Add nullable `real_class_session_id` and `term_id`; both null or both non-null; composite FKs enforce matching immutable session lineage. Existing rows remain null; service requires both for new writes. Add term/category active-read indexes. |
| `observation_rubric_evaluations` | One row per `(student_id, term_id)` with owner/year/group lineage, state `OPEN|CLOSED|REOPENED`, `revision`, four nullable override integers 1–4, private draft comment (max 2000), current snapshot version nullable, timestamps. Composite FKs/uniques prevent cross-owner/year/group/term identity. |
| `observation_rubric_snapshots` | Immutable `(evaluation_id, version)`; four suggested levels, four final levels, four base-XP totals, four event counts, `has_low_evidence`, exact `level_sum`, `grade_milli`, private comment, close time/teacher, prior version nullable. Checks enforce ranges, formula, and contiguous version in service transaction. No UPDATE/DELETE application path. |
| `observation_rubric_snapshot_evidence` | Immutable unique `(snapshot_id, xp_event_id)` with category and base-XP copy; proves the exact close basis even after reversal. |
| `observation_rubric_lifecycle_events` | Append-only `CLOSE|REOPEN`, evaluation, resulting revision/state, snapshot version, required reopen reason where applicable, actor/time. |
| `observation_rubric_requests` | Teacher-scoped unique idempotency key, operation/fingerprint, evaluation and resulting revision/snapshot reference. |

No rubric row is pre-created for every student. GET returns a virtual `OPEN` view until first save/close; the write transaction creates the identity after rechecking ownership. Migration does not alter existing annual aggregates or fabricate term evidence.

## 6. Private API contracts

All routes are cookie-authenticated `/api/v1`, Zod validated, and teacher-private. Services validate the complete student→group→year→calendar→term ownership lineage before returning whether a resource exists; absent/non-owned/mismatched identity is `404`.

| Route | Contract |
|---|---|
| `GET /api/v1/students/:studentId/terms/:termId/observation-rubric?academicYearId=` | Current evaluation, editable draft when applicable, computed live four-category evidence, latest official snapshot/history metadata, stale flag, unattributed annual-event count. |
| `GET /api/v1/groups/:groupId/terms/:termId/observation-rubrics?academicYearId=` | Bounded roster overview with student ID, state/revision, warning, latest exact grade string/version; no comments or evidence detail and no N+1 query. |
| `PUT /api/v1/students/:studentId/terms/:termId/observation-rubric` | `{expectedRevision, overrides:{four nullable levels}, comment}` plus key; valid only `OPEN|REOPENED` and active student/year. Whole-draft replacement supports save/cancel predictably. |
| `POST .../observation-rubric/close` | `{expectedRevision}` plus key; atomically computes and freezes snapshot. |
| `POST .../observation-rubric/reopen` | `{expectedRevision, reason}` plus key; valid only `CLOSED` and active student/year. |

DTOs use category objects rather than database-shaped rows. They expose `baseXp`, `qualifyingEventCount`, `suggestedLevel`, `overrideLevel`, `finalLevel`, and `lowEvidence` only to these private routes. Failures remain `401 AUTH_REQUIRED`, ownership-safe `404`, invalid/archive/state `422`, stale/replay/race `409`, and safe `500`; logs contain no names, comments, levels, grades, counts, event IDs, path/query/body, or term details.

## 7. Privacy and projection boundary

Rubric levels, category/base XP, evidence counts and event lineage, Observation grade, comments, lifecycle reasons, and snapshots are educational records. They exist only in authenticated teacher services/DTOs. They must not be added to `ProjectionStudentDto`, projection repository selects, normal projection responses, Show Student responses, browser-side filtering, logs, URLs, or public rankings. Existing classroom-safe allowlists and temporary behaviour-only Show Student extension remain unchanged. Negative tests must reject the fields and representative private values across normal projection and Show Student payloads.

The existing C-01 production condition remains: real student data/production use is blocked pending approved retention/deletion including backup expiry and executed encrypted-restic restore evidence.

## 8. Spanish teacher UI integration

Add a private `Rúbrica trimestral` section in the selected-student workspace, bound to authoritative selected year/group/student and an explicit `T1|T2|T3` selector sourced from the server calendar. Four rows show Spanish dimension/level labels, base XP, evidence count, provisional suggestion, editable final-level select, and `Menos de 4 evidencias` where applicable. Explain that XP is evidence, not the grade. Provide `Guardar cambios`, `Cancelar`, `Cerrar trimestre`, and, when closed, `Reabrir evaluación`; reopening requires a reason and confirmation. Closed mode shows version, close time, exact grade `/10`, immutable values/comment, evidence-stale notice, and read-only history metadata.

Required states:

- loading skeleton/status with controls disabled;
- no calendar/term, no students, and zero-evidence empty states with actionable Spanish explanation;
- load failure with `Reintentar`; save/close/reopen failure preserves entered data and the same idempotency key for ambiguous retry;
- pending mutation disables duplicate actions and explains the disabled state;
- stale revision `409` preserves local edits, offers `Recargar`, and never overwrites server data automatically;
- reload reconstructs draft/state/snapshot from the API, not browser storage;
- year/group/student/term change aborts requests, clears private prior-context data, local edits, retry keys, and confirmations before loading the new context;
- archived year/student is readable but save/close/reopen controls are absent or disabled with `Solo lectura` explanation;
- `CLOSED` is read-only until successful reopen; stale evidence never silently changes official values;
- session expiry clears all private state and returns to authentication.

Cancel restores the last server-loaded draft. Navigation with unsaved edits requires a focused discard confirmation. Keyboard, focus restoration, labels, alert/status semantics, touch targets, and narrow/wide layouts follow existing workspace patterns.

## 9. Failure boundaries

| Failure | Safe result |
|---|---|
| Missing/mismatched active session during new XP | Reject XP `422`; no unattributed new evidence or partial game writes. |
| Legacy unattributed XP | Preserve annual effects; exclude from term calculations; show private warning/count; never infer. |
| XP reversal after close | Annual/current live evidence changes; official snapshot does not; closed view becomes stale. |
| Duplicate/timeout mutation | Exact replay returns journaled result; no duplicate snapshot/lifecycle version. |
| Concurrent close/reopen/save | `BEGIN IMMEDIATE` plus revision/state checks yields one winner; loser `409`; no partial rows. |
| Evidence changes during close | Serialized transaction snapshots one internally consistent active evidence set. |
| Migration/FK/formula violation | Roll back migration or request and fail closed; do not start on incomplete schema. |
| Unauthorized or expired session | `404` avoids ownership disclosure; `401` clears browser-private state. |
| UI context race | Abort/ignore old generation; never render or apply old student's rubric in new context. |

**Threat matrix:** N/A — this change adds normal authenticated API routing but no shell, subprocess, VCS/PR automation, executable-file classification, repository selection, or process-integration boundary.

## 10. Focused testing strategy

Use TDD for calculations and state transitions.

| Layer | Required proof |
|---|---|
| Domain Vitest | Base-only thresholds/boundaries; event count and `<4`; override precedence; exact `levelSum * 625`; decimal formatting; OPEN/CLOSED/REOPENED transitions; behaviour/bonus/RT non-interference. |
| SQLite/repository | Migration/FKs/checks/indexes; no unsafe backfill; session/term attribution; active/reversed aggregates; snapshot evidence lineage and immutability; version continuity; rollback; stale revision; concurrent/idempotent save/close/reopen. |
| Fastify integration | Exact routes/DTO/statuses; ownership-as-404; archive read-only; invalid state `422`; key mismatch/race `409`; group query includes zero-evidence students without N+1; safe errors/logs. |
| Web Vitest/integration | Spanish fields/actions; persisted draft save/cancel/reload; all loading/empty/error/retry/pending/stale/context-change/read-only/closed/reopened states; exact grade display; unsaved-change confirmation; stale response suppression. |
| Privacy regression | Neither field names nor representative values for levels, category/base XP, counts, grade, comments, reasons, or snapshot lineage appear in normal projection or Show Student DTOs. |
| Focused browser coverage for later Verify | Teacher selects context/term/student, reviews low evidence, adjusts, saves/reloads, closes, sees immutable grade, reverses evidence and sees stale state, reopens with reason, recloses version 2; projection remains free of private fields. |

## 11. Rollout and rollback

Deploy migration before API/UI. No feature flag or seed is required. Before enabling writes, report the count of unattributed active legacy XP by year/group; zero permits normal rollout. Non-zero activates **B-01** below and blocks claiming complete term evidence until maintainer-directed reconciliation exists. Smoke-test ownership, exact formula, one close/reopen cycle, reload, and projection exclusions.

Before rubric writes, rollback may disable routes/UI and restore a verified pre-migration backup. After any draft/snapshot exists, never reverse DDL or delete lineage; disable writes, retain reads, and deploy a forward corrective migration. C-01 remains the production gate.

## 12. Expected Working Set

| Action | Paths |
|---|---|
| Create | `apps/api/drizzle/0015_quarterly_observation_rubric.sql`; `apps/api/src/rubric/{domain,repository,service,mapper,routes}.ts`; focused rubric/API/privacy/web tests; `apps/web/src/workspace/QuarterlyRubric.tsx`. |
| Modify | `apps/api/src/db/{schema,migrations}.ts`, `apps/api/src/server.ts`, `apps/api/src/xp/{service,repository}.ts`, a narrow calendar session-context adapter, `packages/{domain,contracts}/src/index.ts`, `apps/web/src/workspace/{WorkspaceApp,StudentPanel,workspace-api}.tsx` as applicable, and focused styles/fixtures. |
| Preserve | Projection route/mapper allowlists and DTO shape; annual XP/levels/badges and game transition semantics; RT/Energy, gems/coins, behaviour, narrative, roster/archive/calendar rules; deployment/backup policy. |

No new runtime dependency, generic workflow engine, mutable aggregate cache, browser persistence, public endpoint, or projection composition is justified.

## 13. Read Order

1. This `DESIGN.md` and root `AGENTS.md`.
2. `docs/architecture/sdd-lite.md`.
3. `apps/api/src/xp/{service,repository,routes}.ts` and migration `0004`.
4. `apps/api/src/calendar/{service,repository,routes}.ts`, `apps/api/src/roster/calendar-context.ts`, and migration `0011`.
5. `apps/api/src/db/{schema,migrations}.ts`, `server.ts`, contracts, errors, and existing ownership/idempotency tests.
6. `apps/web/src/workspace/{WorkspaceApp,StudentPanel,workspace-api,workspace-state}.tsx` and focused tests.
7. `apps/api/src/projection/{mapper,routes,repository}.ts` and projection privacy tests.

Do not load unrelated SPECs or historical context unless a concrete implementation contradiction requires it.

## 14. Objective acceptance criteria

- [ ] **AC-01:** Every new XP event snapshots a server-resolved matching active session and term; clients cannot choose attribution, and missing/mismatched sessions fail atomically.
- [ ] **AC-02:** Existing unattributed events are not guessed, retain annual/game effects, and are excluded and privately reported for term rubric purposes.
- [ ] **AC-03:** Each category derives active term `base_xp` only and maps exactly `0–2/3–5/6–9/10+` to levels `1/2/3/4`; bonus/effective XP and behaviour are excluded.
- [ ] **AC-04:** Qualifying counts count active originals once, reversal removes one, and each category warns exactly when count `<4` without blocking or altering assessment.
- [ ] **AC-05:** Teacher overrides are nullable 1–4; final level is override-or-suggestion; exact grade uses `(sum / 16) * 10`, stores `gradeMilli=sum*625`, and presents the identical decimal without binary-float drift.
- [ ] **AC-06:** Persisted drafts survive reload and support edit/save/cancel; live aggregates remain computed on read and are never a mutable cache.
- [ ] **AC-07:** Lifecycle is exactly `OPEN → CLOSED → REOPENED → CLOSED`; closed values are read-only, reopen requires a reason, and each reclose creates the next immutable snapshot version.
- [ ] **AC-08:** Every snapshot preserves exact levels, aggregates, counts, grade integers/comment, actor/time, prior version, and included event lineage; later reversal cannot mutate it and produces a stale indicator.
- [ ] **AC-09:** Save/close/reopen enforce authentication, full ownership lineage, archive policy, expected revision, state, UUID idempotency/fingerprint, `BEGIN IMMEDIATE`, exact replay, one concurrency winner, and rollback without partial state.
- [ ] **AC-10:** Private single-student and bounded group APIs satisfy DTO/status/error/log contracts and avoid N+1 reads.
- [ ] **AC-11:** Spanish workspace covers every UI and recovery state in Section 8, including reload, context change, unsaved edits, stale write, and historical read-only behavior.
- [ ] **AC-12:** Rubric levels, category/base XP, counts, grade, comments, reasons, and lineage never enter normal projection or Show Student DTOs; current server allowlists remain unchanged.
- [ ] **AC-13:** Annual XP, level/badge/game progression, RT/Energy, gems/coins, behaviour, narrative, and roster/calendar semantics remain unchanged except the required new-event session attribution guard.
- [ ] **AC-14:** Migration and focused domain/database/API/web/privacy/browser tests prove Sections 3–10; rollout does not proceed over unresolved unattributed production evidence.

## 15. Settled decisions and open findings

**Settled:** real-session snapshot is authoritative term attribution; active base XP is evidence; event count is record count; `<4` is warning only; drafts persist while evidence computes on read; close freezes exact evidence and integer grade facts; reopen seeds prior finals and creates traceable new versions; projection remains unchanged; no Terra review runs on this explicit route.

| Finding | Classification | Disposition |
|---|---|---|
| **B-01 — existing XP has no trustworthy term identity** | **BLOCKER when any active legacy XP must contribute to an official term rubric** | Migration must not infer from timestamps. Before rollout over such data, the maintainer must approve an explicit, auditable attribution/re-entry policy in a revised Design; otherwise those events remain annual-only and the affected rubric cannot be represented as complete. |
| **C-01 — production privacy/recoverability** | **CONDITION** | Real student data/production remains blocked until retention/deletion including backup expiry and executed encrypted-restic restore evidence are complete. |
| Terra review | **CONDITION waived by route** | Level C normally justifies Terra, but the maintainer explicitly prohibited it for this design-only run. Build must not be inferred as authorized. |

## 16. Simplicity Check

One explicit rubric module, one XP attribution seam, five narrow persistence structures, integer arithmetic, computed live evidence, and immutable snapshots solve the requirement. There is no generic assessment engine, event bus, cache, client-side privacy filter, new dependency, or projection change. The additional snapshot-evidence join is justified because immutable close provenance cannot otherwise survive later XP reversals.

DESIGN READY
