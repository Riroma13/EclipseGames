# SPEC-0004 — XP, Specialties, Annual Levels, and Badges
## Design

**Status:** Archived / Complete | **Owner:** Maintainer | **Date:** 2026-08-22  
**Depends on:** SPEC-0002 and SPEC-0003 (archived) | **Related decisions:** DEC-001, DEC-002, DEC-005, DEC-011

> **Think hard once, then execute.** XP is observation evidence, not an official grade, percentage, rubric score, or behaviour reward/punishment. It never reduces academic assessment, XP evidence, or RT.

---

# 1. Executive decision summary, authority, scope, and non-goals

Repository artifacts are authoritative. This Design follows the archived platform, roster, and workspace Designs; the maintainer brief is the SPEC-0004 product input because no proposal/spec artifact exists. Existing Fastify `/api/v1`, Zod, typed `ApiError`, opaque `__Host-session`, ownership-as-404, SQLite/Drizzle/raw migrations, and the `/#/workspace` shell are preserved.

SPEC-0004 adds a small private XP evidence domain: immutable active/reversed evidence records; event-time specialty bonus snapshots; annual derived totals/levels; durable level-unlock identities with append-only grant transitions for SPEC-0005; and event-count badge unlocks. It integrates one explicit XP action into the selected-student workspace and reads bounded annual summaries separately from `TeacherStudentDto`.

**Non-goals:** coin balance/ledger/catalogue/spending (SPEC-0005); behaviour state/session (SPEC-0007); RT/Energy/streaks (SPEC-0006); rubric/grades (SPEC-0008); projection or a SPEC-0009 contract; exports; unified history/audit UI (SPEC-0010); event sourcing; generic event bus/command registry; polling/websockets; direct roster-table access by future domains; modifying legacy projection fixture fields. No private XP details are exposed through client filtering.

## 1.1 Settled architecture decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Evidence correction | Create immutable original event and immutable compensating reversal record; no hard delete or in-place category/value edit | Hard delete, mutable events, full event sourcing | Preserves correction provenance with the smallest domain-specific model. |
| Authority | Totals, levels, badge qualification, and current unlock state derive from active evidence in the transaction/read query; no mutable XP counter/cache | Stored running totals/materialized cache | Corrections cannot leave derived state drifting. |
| Specialty time | Snapshot assigned specialty/category and eligibility on the evidence event at creation | Recompute against current roster specialty | Historical bonus and qualification remain explainable after reassignment. |
| Coin seam | XP owns one durable level-unlock identity and an append-only ordered transition outbox; SPEC-0005 reconciles each transition transactionally into its own ledger | Generic bus, synchronous coin mutation, mutable version-only state, best-effort callback | A correction cannot erase grant/revocation evidence, and XP never owns a balance or ledger. |
| Workspace | One explicit `Register XP` action provider in existing `FastActionShell`; authoritative mutation response refreshes selected and group summary state | Generic provider registry, optimistic totals | Preserves SPEC-0003 boundaries and prevents visible drift. |

---

# 2. Domain model and invariants

## 2.1 Vocabulary and rules

`XpCategory`: `COMMUNICATION | PRECISION | CONSISTENCY | COLLABORATION`. `baseXp` is exactly `1 | 2 | 3`; the controlled UI maps values as follows:

| Category | +1 | +2 | +3 |
|---|---|---|---|
| Communication | Spanish participation | French with help/short phrase | spontaneous/developed French |
| Precision | corrects/improves | correct/careful work | especially precise work |
| Consistency | tries despite difficulty | maintains effort | clearly overcomes difficulty/improves |
| Collaboration | appropriate occasional help | active collaboration | especially valuable collaboration |

Specialty mapping is `Leader,Diplomat → COMMUNICATION`; `Strategist,Analyst → PRECISION`; `Disciplined,Perseverant → CONSISTENCY`; `Helper,Ally → COLLABORATION`. A specialty match adds a flat `specialtyBonusXp=1`; otherwise it is `0`. `effectiveXp = baseXp + specialtyBonusXp`. It is never multiplied.

At event creation, XP calls the roster-owned `getOwnedStudentAcademicYearContext(db, teacherId, studentId)` port, a minimal exported adapter over the current private `ownedStudentContext`; it returns `{student, group, year}` and preserves its ownership/not-found semantics. It rejects an archived student/year, then calls the existing `lockStudentGroupCorrection(db, teacherId, studentId)` in the same outer XP transaction immediately before inserting the first reference. XP never queries roster tables. It snapshots `specialtyAtAward`, `specialtyCategoryAtAward`, and `bonusEligibleAtAward`. This SPEC initially supplies `bonusEligibility = true`; the narrow injected `XpBonusEligibilityPort` returns only `{ specialtyBonusAllowed: boolean }`. SPEC-0007 may later supply `false` in ALERT/RED_CODE. It may only suppress the +1 bonus; base XP is always awarded and behaviour is never queried to reduce it. An unassigned student has null snapshots and no bonus. Pre-assignment events remain active base evidence but never later gain a bonus or qualify for a specialty badge. A later specialty change does not rewrite any event, bonus, qualification, existing badge, or unlock. New matching events can qualify the newly assigned specialty category; therefore more than one category badge can be historically unlocked in a year after an explicit roster specialty change.

## 2.2 Annual derivation

Every event belongs to the immutable `academicYearId` resolved from the student's current group at creation. It is never inferred from calendar date and never changed. For a `(studentId, academicYearId)`, the authoritative annual total is `SUM(effective_xp)` of active original events; reversal records contribute no XP themselves and deactivate their one target. Category totals use the same active events grouped by category. The level is the greatest threshold not exceeding total:

`L1=0, L2=10, L3=25, L4=45, L5=70, L6=100, L7=135, L8=175`.

For L1–L7, `progress` is `{current: total-threshold(level), required: threshold(next)-threshold(level), nextLevel}`. L8 is capped: `{current: 0, required: 0, nextLevel: null, isMaxLevel: true}`; total still displays/retains all annual effective XP and historical reads use the same rule. Archived years/students retain the exact derived historical result but reject all writes, including correction.

## 2.3 Explicit invariants

1. Evidence belongs to one owned student and immutable academic-year identity; cross-year aggregation is forbidden.
2. Only active original events affect XP, levels, badge counts, and current level-unlock state.
3. Base XP is 1–3 and never reduced by behaviour; bonus is 0/1, flat, and event-time only.
4. An event is immutable; correction is a one-time compensating reversal, never deletion or mutation.
5. An RFC 4122 UUID v4 `Idempotency-Key` represents one operation for one teacher. Its SHA-256 canonical fingerprint binds the operation, path identity, and normalized body; same key/different fingerprint is `409`.
6. Each L2–L8 threshold has one unlock identity `(student, year, level)`, one durable first-crossing source/time, and at most one `GRANT` transition. Falling/regaining creates compensating transitions, never another grant identity or `GRANT`.
7. A badge counts qualifying evidence-event records, not points: exactly the third active qualifying record creates the badge; later records do not duplicate it.
8. All teacher-private evidence/category/comment data stays server-authorized; no projection endpoint or client-side safe filter is introduced.

---

# 3. Persistence and transaction model

Migration `0004_xp_specialties_levels_badges` is forward-only, registered after `0003_academic_roster`, with matching Drizzle declarations. Foreign keys stay enabled; failed migration rolls back and blocks startup. All mutation reads/writes/derivations below occur in one `better-sqlite3` transaction.

| Table | Columns and ownership | Immutability, constraints, reads/indexes, lifecycle |
|---|---|---|
| `xp_evidence_events` | XP domain: `id`, `owner_teacher_id`, `student_id` FK `students RESTRICT`, `academic_year_id` FK `academic_years RESTRICT`, `category`, `base_xp`, `specialty_at_award nullable`, `specialty_category_at_award nullable`, `bonus_eligible_at_award`, `specialty_bonus_xp`, `effective_xp`, `comment nullable`, `created_at`, `created_by_teacher_id`, `client_request_id`, `request_fingerprint` | Original event fields never update. `CHECK` enums/base 1–3/bonus 0–1/effective=base+bonus; `UNIQUE(owner_teacher_id, client_request_id)`. Index `(student_id, academic_year_id, created_at, id)` supports summary/detail; `(student_id, academic_year_id, category, created_at, id)` supports badges/rubric. Retain while roster/year retained. |
| `xp_evidence_reversals` | XP domain: `id`, `owner_teacher_id`, `target_event_id` FK `xp_evidence_events RESTRICT`, `reason nullable`, `created_at`, `created_by_teacher_id`, `client_request_id`, `request_fingerprint` | Immutable compensation record; `UNIQUE(target_event_id)` and `UNIQUE(owner_teacher_id, client_request_id)`. There are deliberately no denormalized student/year columns: target context is derived by the target-event join after roster ownership/year/archive checks. Index `(target_event_id, created_at, id)`. No deletion. |
| `xp_level_unlocks` | XP-to-coins handoff: `id`, `student_id` FK, `academic_year_id` FK, `level`, `active`, `first_crossed_at`, `first_source_event_id` FK `xp_evidence_events RESTRICT`, `updated_at` | `UNIQUE(student_id, academic_year_id, level)`, level 2–8; index `(student_id, academic_year_id, active)`. This is the one durable grant identity, not a coin balance/ledger. |
| `xp_level_grant_transitions` | XP-owned append-only outbox: `id`, monotonic `sequence`, `unlock_id` FK `xp_level_unlocks RESTRICT`, `kind` (`GRANT|REVOKE|REINSTATE`), `source_event_id nullable` FK event, `source_reversal_id nullable` FK reversal, `occurred_at` | `UNIQUE(sequence)` and a partial unique index for one `GRANT` per `unlock_id`; check exactly one appropriate source (`event` for GRANT/REINSTATE, reversal for REVOKE). Index `(sequence)` supplies ordered replay. No delivery flag, balance, or generic bus. |
| `xp_badge_unlocks` | XP domain: `id`, `student_id` FK, `academic_year_id` FK, `category`, `badge_label`, `active`, `first_unlocked_at`, `last_activated_at`, `last_revoked_at nullable`, `source_event_id nullable` FK | `UNIQUE(student_id, academic_year_id, category)`; category-label check; index `(student_id, academic_year_id, active)`. `source_event_id` is an active qualifying event iff `active=1`; otherwise it is null. The row preserves first unlock, not a separate immutable revocation history. |

`xp_evidence_events` does not store a mutable status: active is `NOT EXISTS xp_evidence_reversals(target_event_id=event.id)`. Reversal records are deliberately narrow, not a general audit/event system. Optional comments are teacher-private, trimmed, and capped at 500 characters; routine entry sends none.

### 3.1 Create, correct, recompute

```
selected student → POST create → transaction
 roster owned context + archive check → insert immutable event
 → derive affected annual state → update unlock + append grant transition
 → recompute badge activity → commit → authoritative summary/detail response
```

Create derives `beforeTotal` and `afterTotal`; every threshold `t` where `beforeTotal < t <= afterTotal` inserts/activates its one unlock identity. A single +3 event can cross multiple levels. Its first crossing atomically inserts `GRANT` with event/time source. A reversal derives the same relation with the target excluded; each now-unmet active unlock becomes inactive and appends `REVOKE` sourced by that reversal. Regaining an inactive prior unlock reactivates it and appends `REINSTATE` sourced by the new event—not a second `GRANT`. Thus +1 is granted once per student/year/level: an unconsumed GRANT may be cancelled by REVOKE, a consumed grant is compensated by REVOKE, and a later REINSTATE restores only that compensated original grant. Transaction rollback leaves evidence, correction, unlocks, transitions, and badges unchanged.

**SPEC-0005 named reconciliation contract:** `XpLevelGrantTransitionPort.listAfter(sequence, limit)` returns immutable ordered `{id,sequence,unlockId,studentId,academicYearId,level,kind,occurredAt}`; `get(id)` returns the same record. SPEC-0005 records a unique `sourceTransitionId` in its own ledger and advances its durable cursor in the **same transaction** as that ledger write. `GRANT` credits +1 once, `REVOKE` cancels/compensates that source whether not yet consumed or already consumed, and `REINSTATE` restores only the compensated source—not a new level reward. On crash/retry, the unique source plus transactional cursor makes replay harmless; if SPEC-0005 is absent, XP retains every ordered transition until it returns. XP never calls a coin service and never stores balance/ledger. This contract therefore cannot lose or duplicate a grant signal.

---

# 4. Interfaces, authorization, and privacy

All routes are cookie-authenticated Fastify `/api/v1`, use Zod UUID/body validation and existing `{code,message,requestId}` failures. Services use roster ownership helpers/named contracts; another teacher or nonexistent resource is `404 NOT_FOUND`, never an ownership leak. `401 AUTH_REQUIRED`, `422 VALIDATION_FAILED`, `409 CONFLICT`, and payload-free `500 INTERNAL_ERROR` retain existing meanings.

The header-only `Idempotency-Key` is a normalized RFC 4122 UUID v4. Before insertion, the service canonicalizes `{operation, pathId, category, baseXp, comment: trimmedComment ?? null}` (create) or `{operation, pathId, reason: trimmedReason ?? null}` (reverse) with fixed property order and `JSON.stringify`, then stores its Node `crypto.createHash('sha256')` hex digest with the immutable event/reversal row. Uniqueness is `(owner_teacher_id, client_request_id)` per operation table. Same key/fingerprint returns the original immutable event/reversal representation plus a **freshly derived current authoritative summary**; it is not a response snapshot. Same key/different fingerprint is `409 CONFLICT`. First success is `201`, replay is `200`; after a timeout after commit, retrying the same request selects that row and derives the current summary, so no second write occurs.

```ts
type CreateXpEvidenceRequest = {
  category: XpCategory; baseXp: 1 | 2 | 3; comment?: string;
};
type ReverseXpEvidenceRequest = {
  reason?: string; // optional, <= 500 chars
};
type XpEvidenceDto = {
  id: string; studentId: string; academicYearId: string; category: XpCategory;
  baseXp: 1|2|3; specialtyBonusXp: 0|1; effectiveXp: 1|2|3|4;
  specialtyAtAward: Specialty|null; comment: string|null; createdAt: string;
  reversedAt: string|null;
};
type XpAnnualSummaryDto = {
  studentId: string; academicYearId: string; annualEffectiveXp: number;
  level: 1|2|3|4|5|6|7|8;
  progress: { current: number; required: number; nextLevel: number|null; isMaxLevel: boolean };
  badges: Array<{ category: XpCategory; label: string; unlockedAt: string }>;
};
type XpEvidenceMutationDto = { event: XpEvidenceDto; summary: XpAnnualSummaryDto };
type XpEvidenceReversalDto = { id: string; targetEventId: string; reason: string|null; createdAt: string };
type XpEvidenceReversalMutationDto = { reversal: XpEvidenceReversalDto; summary: XpAnnualSummaryDto };
// Private XP read model: distinct from canonical TeacherStudentDto and legacy projection fixture DTOs.
type XpGroupStudentSummaryDto = { studentId: string; summary: XpAnnualSummaryDto };
type XpGroupSummariesDto = { groupId: string; academicYearId: string; summaries: XpGroupStudentSummaryDto[] };
type XpEvidencePageDto = { items: XpEvidenceDto[]; nextCursor: string|null };
```

| Route | Contract and validation | Success / failure |
|---|---|---|
| `POST /students/:studentId/xp-evidence` | active owned student/year determined server-side; category enum, base 1–3, optional trimmed comment, UUID key in `Idempotency-Key` header (body fallback prohibited) | `201 XpEvidenceMutationDto`; matching replay `200` same DTO; `404`, `422` archived/invalid, `409` key mismatch. |
| `POST /xp-evidence/:eventId/reversal` | target must be an active owned original event; service derives its student/year from the target, calls the roster context port, then checks ownership/year/archive; UUID header key; optional reason | `201 XpEvidenceReversalMutationDto`; matching replay `200`; `404`, `422` already reversed/archived year-or-student, `409` key mismatch. |
| `GET /students/:studentId/xp-summary?academicYearId=` | ID must equal student's owned current/historical year relation; no client-selected fields | `200 XpAnnualSummaryDto`; historical allowed; `404` ownership/mismatch. |
| `GET /groups/:groupId/xp-summaries?academicYearId=` | owned group and its exact year only; one roster-left-joined aggregate plus badge join | `200 XpGroupSummariesDto`: every canonical roster student, including zero-XP rows, ordered `alias COLLATE NOCASE, id`; no N+1. |
| `GET /students/:studentId/xp-evidence?academicYearId=&cursor=&limit=` | teacher-private detail, exact student/year only; limit default 25, range 1–50; descending stable `(createdAt,id)` | `200 XpEvidencePageDto`. Cursor is opaque base64url UTF-8 JSON `{v:1,createdAt,id}`, validated but never client-interpreted; malformed cursor is `422`; `nextCursor` is null when exhausted. Never projection/public. |

The mutation response is teacher-private. Exact totals/category breakdown, comments, event/reversal data, request IDs, specialty snapshots, and entitlement state are never logged or exposed to a classroom-safe API. Summary fields are only a future **classification** candidate; SPEC-0009 alone may define a separate server allowlist and endpoint. This SPEC introduces no public endpoint and no SPEC-0009 projection contract.

---

# 5. Badges and cross-domain seams

Badge labels are `COMMUNICATION → Voz activa`, `PRECISION → Ojo clínico`, `CONSISTENCY → Paso firme`, `COLLABORATION → Buen aliado`. A qualifying event is an **active original evidence event** whose `category === specialtyCategoryAtAward`; it counts once regardless of 1/2/3 base XP or bonus. On exactly three qualifying records for `(student, year, category)`, create/activate its badge in the creating transaction. Earlier/later nonmatching and pre-assignment events do not count. At fewer than three after correction, set `active=false`, `lastRevokedAt=now`, and `sourceEventId=null`; do not claim a revocation-history table. On requalification, reactivate the same row, retain `firstUnlockedAt`, set `lastActivatedAt=now`, clear no historical timestamp, and set `sourceEventId` to a currently active qualifying event. Replays do not alter those fields. Historical archived reads show the durable current badge state; archive correction is rejected.

| Domain | Named seam | Prohibited coupling |
|---|---|---|
| Roster (0002) | export `getOwnedStudentAcademicYearContext` as the minimal adapter over `ownedStudentContext`, then actual `lockStudentGroupCorrection` immediately before first XP reference | XP querying roster tables or changing roster identity, specialty assignment, or archive semantics. |
| Coins (0005) | `XpLevelGrantTransitionPort` reconciliation above | XP balance, ledger, spending, generic bus. |
| Behaviour (0007) | narrow `XpBonusEligibilityPort` only | behaviour reducing base XP, direct table reads, session design here. |
| Rubric (0008) | teacher-private named annual/term active evidence category aggregate read port | XP becoming a grade or rubric mutation. |
| Projection (0009) | none now; later independent allowlist composition | filtering teacher DTO/client summary, public route. |
| History (0010) | private evidence detail/reversal read port | unified history UI/audit framework now. |

---

# 6. Workspace UX and reconciliation

For active selected students, `StudentPanel` receives one explicit `Register XP` action provider (not a registry). First interaction chooses category; second chooses +1/+2/+3 and immediately submits. The category/value controls are large buttons; optional comment is behind a compact “Add note” disclosure and is never required. Immediate authoritative success feedback states `Base XP +N`, `Specialty bonus +1` when applied, and `Effective XP +N`; when no bonus applies it states `Base XP +N · No specialty bonus · Effective XP +N`. It then shows annual total, level/progress, and active badges. This is teacher-private, excludes behaviour state, and uses the mutation response only, so it adds no routine fetch/latency. Historical/archived panel remains read-only with no action.

Action states: `idle → category → value/pending → success|failure`; pending disables all entry/undo controls and suppresses double submit. On success the server response replaces selected summary, updates the matching in-memory group summary entry, and creates the existing 10-second UndoBanner capability. On failure keep category/value selection and show safe retry feedback. The domain action supplies `undoPolicy: 'default'`; the UI's 10 seconds is presentation only. Undo calls the reversal endpoint with a newly generated idempotency key; server validity persists beyond 10 seconds. Stale/expired UI undo performs no call; stale domain reversal returns its typed failure. Timeout-after-commit retries the same create key before any new submission.

On group/year/context change, abort pending fetches, invalidate shell feedback/undo as SPEC-0003 requires, and load `GET /groups/:groupId/xp-summaries?academicYearId=` once alongside the roster (or after roster context resolves). No per-card fetch, polling, websocket, or fields added to `TeacherStudentDto`. After mutation/reversal, use its response and one bounded group-summary refetch on explicit retry/refresh/re-entry; a failed refresh never overwrites known authoritative mutation response. Keyboard/touch use semantic buttons; no shortcut is needed for the 1–2 interaction target.

---

# 7. Failure-mode matrix

| Situation | Required safe behavior / recovery |
|---|---|
| Duplicate click/retry | Client disables while pending; server idempotency returns the immutable representation plus current summary only for same fingerprint; no duplicate XP, badge, unlock, or transition. |
| Network timeout after commit | Keep key, retry same request; receive immutable original event/reversal plus freshly derived current summary; never create a new key automatically. |
| Wrong student/category/value | Undo within presentation window invokes compensating reversal; otherwise teacher uses private evidence detail reversal. No hard delete/edit. |
| Stale/duplicate reversal | First transaction wins; matching replay returns original reversal; already reversed/new key is `422`; summary cannot drift. |
| Failed correction/rollback | No reversal/event/derived rows commit; panel retains safe failure/retry state. |
| Session expiry/other owner | `401` clears private workspace state; `404` reveals nothing and reconciles; no stale evidence rendered. |
| Archived year/student | Historical reads allowed; create/reversal/detail-write rejected `422`; no deletion. |
| Specialty reassignment | Existing snapshots/badges remain historical; future events use new snapshot/category. |
| Threshold correction/regain | One transaction creates the single GRANT on first crossing, REVOKE on falling, and REINSTATE on regain; SPEC-0005's unique transition source makes absent/consumed/crashed/retried reconciliation safe. |
| Badge correction | Recompute active qualifying event records; active badge is revoked/reactivated transactionally with correction. |
| SPEC-0005 temporarily absent | Entitlement state remains durable and replayable; no XP transaction depends on coin availability. |

## Threat matrix

Normal authenticated Fastify resource routes are added, but there is no shell, subprocess, VCS/PR, executable-file classification, repository-selector, or process-integration boundary. The special matrix is therefore N/A; API routing authorization/validation has dedicated tests.

| Boundary | Applicability | Design response / planned RED tests |
|---|---|---|
| Documentation-like paths | N/A — no file classification/execution | None. |
| Git repository selection | N/A — no Git selection | None. |
| Commit state | N/A — no commit operation | None. |
| Push state | N/A — no push operation | None. |
| PR commands | N/A — no PR automation | None. |

---

# 8. Testing strategy (RED first), rollout, and dependencies

Write RED tests before each implementation unit; no new runtime dependency is justified. Use installed Vitest, better-sqlite3, Fastify injection, React/Vite, and Playwright.

| Layer | RED-first coverage |
|---|---|
| Domain Vitest | category/value validation; mapping; flat/event-time bonus; eligibility seam cannot reduce base; thresholds/cap/progress; first GRANT / REVOKE / REINSTATE sequences, multi-threshold crossings, active-event derivation, qualifying-event count, specialty change/pre-assignment, and correction/re-cross state. |
| SQLite/migration | migration ordering/repeatability/fail-closed; checks/FKs/RESTRICT/indexes; reversal target-only context join; idempotency key/fingerprint and timeout recovery; atomic transition outbox ordering/one-GRANT uniqueness; transaction rollback; active aggregates; badge revoke/reactivate/source-null rule; archive historical reads/write rejection. |
| Fastify/API/privacy | Zod/header validation; `401`/ownership-as-`404`/`422`/`409`/safe `500`; exact first/replay DTO/status behavior; teacher-only detail cursor; zero-row roster order/single-query group response; no XP field on roster DTO; no projection/public/field-selector route. |
| Web Vitest | action state machine, category/value, base/bonus/effective authoritative feedback, comment optionality, pending/double-submit, mutation reconciliation, undo expiry/stale/invalid/failure, context invalidation. |
| Playwright | authenticated find→register→success→continue; keyboard/touch buttons if implemented; failure/retry and timeout reconciliation; 10-second banner; correction; level/badge update; group of ~30 summary load without per-card requests; historical read-only; session-expiry private-state clearing. |

Rollout is one reviewed migration before API startup, then server/domain/contracts and workspace; no feature flag or data backfill. Rollback before writes may revert code/migration only in a safe local environment; after evidence exists, do not delete tables/history—deploy a forward corrective migration or restore verified backup when appropriate. C-01 remains unchanged: real student data/production use require SPEC-0014/0016 retention/deletion, backup expiry, and encrypted-restic restore proof.

---

# 9. Working Set, constraints, and downstream read order

## 9.1 Expected files

| Action | Paths |
|---|---|
| Create | `apps/api/drizzle/0004_xp_specialties_levels_badges.sql`; `apps/api/src/xp/{repository,service,routes,mapper,bonus-eligibility,level-grant-transition-port}.ts`; `packages/domain/src/xp/{rules,levels,badges}.ts` and tests; focused API SQLite/privacy tests; workspace XP action/summary components/tests; focused Playwright spec. |
| Modify | `apps/api/src/{server.ts,db/{schema,migrations}.ts}`; `apps/api/src/roster/service.ts` solely to export the proven context adapter; focused roster-service tests for that adapter/lock; `packages/{domain,contracts}/src/index.ts`; existing workspace `workspace-api.ts`, `WorkspaceApp.tsx`, `StudentPanel.tsx`, `FastActionShell.tsx`, state/styles; focused test/config fixtures only. |
| Do not modify | `projection_students`, projection routes/mappers/tests, `/` route, `TeacherStudentDto`, roster tables/repository, roster ownership/identity/specialty/archive semantics, auth/session implementation, coins/behaviour/RT/rubric/narrative/history domain implementation, package manifests/lockfile, OpenSpec, deployment/backup files, stable context except required phase handoff. |

**Constraints:** no direct future-domain table access; no mutable XP total/cache; no generic event/undo/reward engine; no browser storage/logging of XP; no new dependency; no client privacy filtering; no public ranking/projection contract. The expected implementation is materially over the 400-line review budget; force-chain coherent slices (1) pure domain/schema+migration, (2) private API/repository/contracts, (3) workspace+E2E, with tests in each slice. Tasks must preserve this strategy and forecast it.

## 9.2 Minimum Tasks/Apply read order

1. This Design; 2. `AGENTS.md`; 3. `docs/SDD-WORKFLOW.md`; 4. SPEC-0001/0002/0003 Designs and their Verify/Archive evidence; 5. `apps/api/src/db/{client,migrate,migrations,schema}.ts`, migration `0003`; 6. roster service/repository/routes/mapper and auth/errors/server; 7. contracts and domain package; 8. workspace API/state/panel/shell/undo and existing tests; 9. focused integration/privacy/E2E fixtures. Do not re-explore outside this set without evidence.

---

# 10. Objective acceptance criteria

- [ ] **AC-01:** Teacher can create a valid private XP evidence event with exactly one category and base 1/2/3; category descriptions map exactly to Section 2.
- [ ] **AC-02:** Effective XP preserves base, 0/1 flat specialty bonus, and event-time specialty snapshot; no behaviour input can reduce base XP.
- [ ] **AC-03:** Annual total/level/progress derive from active evidence within immutable academic year only; L8 cap/progress and historical reads follow Section 2.2.
- [ ] **AC-04:** Each L2–L8 threshold has exactly one durable unlock identity with first source/time and at most one GRANT; crossing, replay, reversal/fall, regain, SPEC-0005 absence/consumption/crash/retry produce ordered idempotent GRANT/REVOKE/REINSTATE reconciliation without loss or duplicate +1 grant.
- [ ] **AC-05:** Badge unlock is exactly three active qualifying event records, never points; bonus values do not alter count; correction/reversal and specialty changes follow Sections 2/5.
- [ ] **AC-06:** Wrong evidence is corrected only by one idempotent compensating reversal; target-event FK plus ownership/year/archive service checks derive context, and no hard delete/mutable edit leaves totals, levels, badges, unlocks, or transitions inconsistent.
- [ ] **AC-07:** Create/reverse is atomic and idempotent under duplicate submission, timeout-after-commit, rollback, stale undo, and retry: same UUID/fingerprint returns its immutable representation plus current summary (`200` replay); a changed fingerprint returns `409`.
- [ ] **AC-08:** Archived academic years/students reject all XP writes including correction while authorized historical summaries/detail remain readable.
- [ ] **AC-09:** All API input/auth/error/ownership contracts in Section 4 pass, including ownership-as-404 and payload-free safe errors/logs.
- [ ] **AC-10:** `TeacherStudentDto` and legacy projection fixture DTOs remain distinct from private XP DTOs; a bounded group-summary response includes every roster student (zero rows) in `alias COLLATE NOCASE, id` order, avoids N+1, and adds no polling/websocket.
- [ ] **AC-11:** Selected active student can find → choose category/value → submit in 1–2 interactions, with optional comment, pending/success/failure, double-submit prevention, response reconciliation, explicit base/bonus/effective feedback, and existing 10-second presentation undo.
- [ ] **AC-12:** XP detail/category/comments/exact evidence remain teacher-private server-side; no client filter, public API, ranking, or SPEC-0009 projection contract exists.
- [ ] **AC-13:** Migration/schema constraints, domain rules, API/privacy, workspace state, and critical browser flow have the RED-first tests in Section 8.
- [ ] **AC-14:** No scope from coins, behaviour implementation, RT/Energy, rubric/grades, projection, history/export, legacy fixture, or dependencies is introduced; C-01 remains a production-only condition.

---

# 11. Design self-review, ambiguities, and handoff

## 11.1 Self-review

Checked against authority and current code: `ownedStudentContext` is private while `lockStudentGroupCorrection` exists; the Working Set therefore permits only a minimal exported context adapter and focused test, preserving roster ownership. Drift resistance comes from active-event derivation plus transactionally synchronized badges, unlocks, and append-only grant transitions. Retry correctness comes from immutable idempotency fingerprints and freshly derived summaries, not a false response snapshot. Specialty reassignment is event-time, not retrospective. Privacy has no browser safe-filter or projection route. Group summary is bounded for ~30 students. The model is proportional: five narrow tables, named ports, no cache, bus, event sourcing, or new dependency.

## 11.2 Open product ambiguities

| Item | Classification | Resolution / required input |
|---|---|---|
| Event-time bonus and badge semantics after specialty change | Resolved | Snapshot at event time; past effects stay historical; later matching events qualify new category, as Sections 2/5 specify. |
| Reversal after year/student archive | Resolved | Terminal archive rejects correction; historical result is read-only, consistent with SPEC-0002 archive semantics. |
| Coin correction | Resolved | One unlock identity has one GRANT and ordered durable REVOKE/REINSTATE transitions; SPEC-0005 records each transition and cursor atomically, Section 3.1. |
| “Current” academic year | Resolved | No new current flag; request context follows roster/workspace selected year. |
| Behaviour implementation and session boundary | Condition | The eligibility port defaults to true; SPEC-0007 must supply ALERT/RED_CODE facts without altering base XP. Not a SPEC-0004 blocker. |
| Coin ledger reconciliation implementation | Condition | SPEC-0005 must implement the named transition-port transaction/cursor proof; SPEC-0004 persists all replayable source evidence and does not own coins. |
| Level-1 coin | Resolved | None: only newly crossed L2–L8 thresholds grant +1, avoiding a grant merely for existing at 0 XP. |

## 11.3 Handoff

Downstream phases must not reconsider active-event derivation, immutable correction, event-time specialty snapshots, annual isolation/threshold semantics, durable unlock plus append-only transition seam, badge event-count rule, private-only contracts, bounded group summary, or the explicit workspace provider. If implementation evidence invalidates one, report a Design BLOCKER rather than redesigning silently.

**Architecture Review:** APPROVED WITH CONDITIONS; Apply and Verify completed.  
**Next step:** Health Report for SPEC-0004.

## 11.4 Phase Result Contract

```yaml
status: success
executive_summary: Corrected SPEC-0004 design with an exported roster context seam, durable exactly-once level transition handoff, precise idempotency, target-only reversals, coherent badge state, and complete private workspace/API contracts.
artifacts:
  repository: docs/specs/SPEC-0004-xp-specialties-levels-badges/DESIGN.md
  engram: sdd/spec-0004-xp-specialties-levels-badges/design
next_recommended: Health Report
risks:
  - SPEC-0005 must atomically reconcile the named ordered transition port into its future ledger.
  - C-01 production privacy/recoverability gate remains open.
 skill_resolution: sdd-design, cognitive-doc-design, api-design-principles, error-handling-patterns loaded; lifecycle archived after APPROVED WITH CONDITIONS review, completed Apply, and PASS WITH CONDITIONS Verify.
```
