# SPEC-0002 — Academic Years, Groups, and Students
## Design

**Status:** Archived | **Owner:** Maintainer | **Date:** 2026-08-22  
**Related decisions:** DEC-004, DEC-005, DEC-009, DEC-011 | **Depends on:** SPEC-0001 (archived)

> Correction pass complete. The prior review is retained as history; the affected assignment-correction and normalization portions passed scoped Architecture Review. C-01 must be carried forward unchanged.

---

# 1. Context, goals, and non-goals

## 1.1 Current state
SPEC-0001 provides React/Vite, Fastify, Drizzle/SQLite, cookie sessions, typed errors, and server-side privacy mappers. It has no canonical academic-year, group, or student tables. `projection_students` is a foundation-only demo fixture containing pre-composed future-domain fields; it is not a roster model and must never become one.

## 1.2 Goals and exact scope

- A teacher can create and manually archive school years, create groups in a year, add a roster of up to 30 students in one atomic request, edit student identity/classroom-safe fields, correct an accidental initial group assignment under explicit safeguards, list a private roster, and archive a student.
- Persist alias, built-in avatar token, and optional specialty assignment without adding gamification behaviour.
- Establish canonical, stable IDs and read contracts for later domains without direct cross-domain table access.

## 1.3 Non-goals

No automatic rollover, copy-forward, retention/deletion policy, group archive, student transfer or membership history, hard deletion, student accounts, public/student endpoints, uploads, XP, RT/Energy, behaviour, gamification, assessment, narrative, exports, or SPEC-0003 workspace UI (selector, cards, search, side panel, fast actions, undo). The narrowly scoped accidental-assignment correction is not a transfer. C-01 remains unchanged: real student data/production remain blocked until SPEC-0014/0016 retention/deletion and encrypted-restic restore conditions pass.

---

# 2. Technical approach and settled decisions

Add a bounded `roster` API feature using the existing Fastify → service → repository → SQLite flow. Repositories issue prepared SQL against Drizzle-declared schema; services own transactions and ownership checks; Zod validates input; DTO mappers are the only data-exposure boundary.

| Decision | Choice | Trade-off / rationale |
|---|---|---|
| Academic year | Teacher-owned `academic_years`; trimmed, display-case-preserving `label`, `startsOn`, `endsOn`, manual `archivedAt`; explicit archive command | Labels are case-insensitively unique per teacher using SQLite `NOCASE`, including archived years. Date range and label identify a year. There is no persisted “current” flag: the teacher selects an unarchived year, avoiding rollover policy. A teacher manually archives a year once; it then becomes read-only and remains available for authorized historical reads. ID, owner, and creation timestamp are immutable; label/dates may be corrected only while unarchived. No automatic rollover, copy-forward, retention, or deletion policy is implied. |
| Group | Teacher-owned group belongs to exactly one year; trimmed, display-case-preserving required name | Names are case-insensitively unique within their year using SQLite `NOCASE`. `academicYearId` and owner are immutable to preserve history; name is editable while its year is unarchived. No ordering or archive field is justified. |
| Student membership correction | One direct `students.group_id` relation, immutable except one administrative accidental-roster-assignment correction | `studentId` remains stable and no membership/history row is created. `PATCH /students/:id/group` may target only another unarchived group owned by the same teacher in the same unarchived year, for an unarchived student, before `group_correction_locked_at` is set. This is not a transfer; future transfer/history semantics require a dedicated Design. |
| Student lifecycle | Stable UUID; teacher-private real name; alias/avatar/specialty editable; nullable `archivedAt` | Archive replaces hard deletion and preserves later references. Archived students are omitted by default and cannot be edited or unarchived in this SPEC. |
| Avatar/specialty | `avatar` is a required opaque token from a small server-approved built-in catalog (default `default`); `specialty` is nullable and one of the eight DEC-011/project specialty names | No uploads/storage strategy. Specialty assignment stores identity only; no XP bonus, badge, or public ranking is introduced. |
| Efficient entry | `POST` accepts 1–30 student drafts and commits all-or-nothing | Fits one classroom without speculative enterprise import. Duplicate/invalid drafts cause no partial roster. |
| Projection fixture | Keep `projection_students` isolated as the SPEC-0001 test/demo fixture; roster code neither reads nor writes it | The canonical identity is `students`. Existing projection routes remain foundation fixture coverage until SPEC-0009 replaces their source through a projection read adapter; no two authoritative models exist. |

---

# 3. Domain model, privacy, and dependency direction

```
teacher_accounts 1 ── * academic_years 1 ── * groups 1 ── * students
                                      (direct, immutable student membership)
```

`AcademicYear(id, ownerTeacherId, label, startsOn, endsOn, archivedAt)`; `Group(id, ownerTeacherId, academicYearId, name)`; `Student(id, groupId, realName, alias, avatar, specialty, archivedAt, groupCorrectionLockedAt)`. IDs are UUIDs. The teacher account owns every reachable record; ownership is checked through the year/group before every read or write. Domain identity/read contracts may be consumed by later domains; web → API/contracts → service → repository/SQLite remains inward-only. Later domains request named roster read contracts, never query roster tables directly.

`groupCorrectionLockedAt` is internal/system-only and has one purpose: it gates accidental-assignment correction. Roster cannot reliably inspect future-domain tables without violating dependency direction. Therefore a future domain service must atomically call the roster-owned write contract `lockStudentGroupCorrection(studentId)` before it creates its first student reference; it is not a public endpoint, direct table access, transfer history, or a generic audit mechanism. A set lock rejects correction permanently; the lock command is idempotent for the authorized downstream caller.

| Field | Classification | Notes |
|---|---|---|
| All IDs, foreign keys, owner IDs, lifecycle timestamps (including `groupCorrectionLockedAt`), year dates | Internal/system-only | Never sent to projection DTOs. Teacher responses expose only resource IDs needed for navigation. |
| Year label; group name | Teacher-private | Administrative context; no classroom API in this SPEC. |
| Student `realName` | Teacher-private | Never logged or returned by classroom-safe contracts. |
| Student `alias`, `avatar`, `specialty` | Classroom-safe | Exposure classification only, **not** weaker authorization. Projection remains teacher-authenticated. |

Teacher DTOs and classroom-safe DTOs are separate server types; a browser must never filter a teacher DTO. `TeacherStudentDto` includes `id`, `realName`, `alias`, `avatar`, `specialty`, `groupId`, `archivedAt`; `ClassroomStudentIdentityDto` is only `{ id, alias, avatar, specialty }`. The latter is a stable later-domain read contract, not a new public endpoint.

---

# 4. Persistence and migration

Migration `0003_academic_roster` creates:

| Table | Required columns / constraints | Indexes and referential behaviour |
|---|---|---|
| `academic_years` | UUID PK; `owner_teacher_id` FK; trimmed non-empty display-case-preserving `label`; ISO `starts_on`, `ends_on`; `CHECK(starts_on < ends_on)`; nullable `archived_at`; `created_at` | Explicit `UNIQUE(owner_teacher_id, label COLLATE NOCASE)`, index `(owner_teacher_id, archived_at, starts_on)`. Teacher deletion is `RESTRICT`. |
| `groups` | UUID PK; owner FK; `academic_year_id` FK; trimmed non-empty display-case-preserving `name`; `created_at` | Explicit `UNIQUE(academic_year_id, name COLLATE NOCASE)`, index `(owner_teacher_id, academic_year_id)`. Year deletion is `RESTRICT`. |
| `students` | UUID PK; `group_id` FK; trimmed non-empty `real_name` and display-case-preserving `alias`; allowed `avatar`; nullable allowed `specialty`; nullable `archived_at`, `group_correction_locked_at`; `created_at` | Partial unique index `UNIQUE(group_id, alias COLLATE NOCASE) WHERE archived_at IS NULL`; index `(group_id, archived_at, alias, id)` for roster queries. Group deletion is `RESTRICT`; future student references must also be `RESTRICT`. |

Zod `.trim().min(1)` validates and persists trimmed labels, names, aliases, and already-required non-empty real names; casing is retained. SQLite `NOCASE` is the deliberate compatible ASCII case-insensitive rule, not a SQLite default. The service maps constraint failures to `409 CONFLICT`; it must not rely on validation alone. SQLite foreign keys remain enabled in `openDatabase`. `created_at` supports identity/history; `archived_at` is the student/year lifecycle marker; `group_correction_locked_at` only gates correction. No generic soft-delete/audit/event framework is added. Add matching Drizzle definitions in `apps/api/src/db/schema.ts`, register the migration in `migrations.ts`, and keep raw SQL migration/repository patterns used today. Run DDL and schema-migration receipt transactionally; any failure closes the database and blocks startup. Forward migrations are not runtime-reversed: restore the verified backup when schema rollback is unsafe. The fixture table is deliberately untouched by this migration.

---

# 5. Application and API contracts

All routes are teacher-session authenticated (`requireSession`), under `/api/v1`, validate UUID params/body with Zod, and return existing `{ code, message, requestId }` errors. Add `CONFLICT` to the contracts error-code union. Ownership/absence deliberately return `404 NOT_FOUND` rather than revealing another teacher’s record. Unexpected errors are logged once without request payload/student data and return `500 INTERNAL_ERROR`.

| Operation | Input / successful response | Failure behaviour |
|---|---|---|
| `POST /academic-years` | `{label,startsOn,endsOn}` → year | `422` invalid/date range; `409 CONFLICT` duplicate label; `401`; `500`. |
| `GET /academic-years?includeArchived=false`, `PATCH /academic-years/:id` | teacher years; patch `label/startsOn/endsOn` | `404` absent/not owned; `422` invalid/archived edit; `409` label conflict. |
| `POST /academic-years/:id/archive` | `204`; sets `archivedAt` once | Session required; `404 NOT_FOUND` for absent/not-owned year; `422 VALIDATION_FAILED` if already archived; `500`. It deletes nothing and makes the year, its groups, and students read-only while retaining authorized historical reads. |
| `POST /academic-years/:yearId/groups`, `GET /academic-years/:yearId/groups`, `PATCH /groups/:id` | `{name}` → group; list; patch name | `404` ownership; authorized reads remain available after archive; `422` invalid/archived-year write; `409` duplicate name. |
| `POST /groups/:groupId/students` | `{students:[{realName,alias,avatar?,specialty?}]}` (1–30) → created private DTOs | `422` invalid enum/empty/over-30 or archived parent year; `409` duplicate aliases within request or active group; one transaction rolls back all. |
| `GET /groups/:groupId/students?includeArchived=false`, `GET /students/:id`, `PATCH /students/:id` | private roster/detail; patch `realName,alias,avatar,specialty` | `404` absence/ownership; authorized reads remain available after year archive; `422` invalid, archived-student, or archived-year write; `409` active alias conflict. |
| `PATCH /api/v1/students/:id/group` | `{groupId}` → private student DTO with the unchanged `id` and new `groupId` | `401` no session; `404 NOT_FOUND` absent/non-owned student, current group, or target group; `422 VALIDATION_FAILED` same group, different year, archived student/current or target year, or locked downstream references; `409 CONFLICT` target active-alias collision; one transaction verifies and changes only `group_id`. |
| `POST /students/:id/archive` | `204`; sets `archivedAt` once | `404` absence/ownership; `422` already archived or archived-year write; no delete/move endpoint. |

Representative private response:
```ts
{ id, groupId, realName, alias, avatar: 'default', specialty: 'Communication' | null, archivedAt: null }
```
Any eventual classroom-safe route returns only `ClassroomStudentIdentityDto`, remains cookie-authenticated, and has no `fields` selector or private fallback.

---

# 6. Classroom workflow and boundaries

The bounded application flow is: create year → create its group → submit up to 30 roster drafts atomically → retrieve private roster → correct real name/alias/avatar/specialty or an accidental initial group assignment → archive a departed student → manually archive the completed year. Assignment correction first validates session, ownership, unarchived student/current/target years, same-year target, unlocked state, distinct target, and target active-alias uniqueness; it then updates only `group_id` atomically. Year archive is a terminal state in this SPEC: it prevents new groups and students and all further roster writes, but preserves its groups and students for authorized historical reads. It supports one teacher and a class-sized roster without designing the SPEC-0003 screens. Roster order is deterministic `alias, id` at the API boundary only; no persisted teacher ordering is added. This correction neither transfers a student nor creates a deletion workflow.

---

# 7. Failure modes, testing, and acceptance criteria

| Layer | Objective coverage |
|---|---|
| Vitest unit | Zod trim/minimum validation; preserved display casing; allowed avatar/specialty; DTO allowlists exclude real name, group/year administrative fields, and lifecycle fields. |
| SQLite integration | Migration order/repeatability/fail-closed rollback; FKs, explicit `NOCASE` year/group uniqueness, partial active-alias uniqueness (including whitespace/case variants), date check, archive filtering, correction-lock gating, atomic correction/batch rollback, `RESTRICT` historical references, and persisted year archive state. |
| Fastify API | `401`, ownership-as-`404`, `409`, `422`, safe `500`; cookie session; private DTO correctness; negative classroom DTO and payload-free audit tests. Prove year archive is owner-only, succeeds once, returns `404` for other/absent IDs and `422` when repeated, blocks group/student creation and all roster writes, and preserves authorized historical reads. Prove correction accepts only the stated same-owner/same-unarchived-year/unlocked case, retains ID, rejects every listed failure, and does not create history. |
| Playwright | Only if a minimal teacher roster management screen is introduced without crossing SPEC-0003: authenticated create year/group/add roster and verify real names never appear in a classroom-safe response/render. Otherwise API integration is the workflow proof. |

- [ ] AC-01: A session-owning teacher can create/list/correct/archive the bounded model; other/anonymous callers cannot read or mutate it.
- [ ] AC-02: SQLite constraints and a failed batch preserve consistency and no partial student rows.
- [ ] AC-03: No private roster DTO is sent to a classroom-safe contract; negative tests assert field absence and authentication.
- [ ] AC-04: `projection_students` remains fixture-only and no roster repository/service uses it.
- [ ] AC-05: No endpoint or schema implements a stated non-goal; C-01 is preserved unchanged.
- [ ] AC-06: A teacher can manually archive only their unarchived year; the operation is terminal, preserves authorized historical reads, and objectively rejects repeat archive and all subsequent group/student writes.
- [ ] AC-07: Labels, group names, and aliases are trimmed before validation/persistence; empty-after-trim values fail; display casing is retained; SQLite-enforced `NOCASE` conflicts are mapped to `409`, and active alias conflicts include case/whitespace variants while archived aliases may be reused.
- [ ] AC-08: The administrative group-correction route changes only an accidental unlocked assignment between different same-year, same-owner unarchived groups; it retains `studentId`, creates no history, and returns the specified `401`/ownership-`404`/`422`/`409` failures.

## Threat matrix
N/A — this change adds normal, server-authenticated Fastify REST routes, but no routing/shell/process/VCS boundary requiring the special threat matrix. Route authorization, validation, and failure cases are covered by the Fastify API tests above.

| Boundary | Applicability | Design response / RED tests |
|---|---|---|
| Routing | N/A — normal REST routing only; no shell or process-integration boundary | None; Fastify API tests cover the resource contract. |
| Shell commands | N/A — no command execution | None. |
| Subprocesses | N/A — no child-process execution | None. |
| VCS/PR automation | N/A — no Git, commit, push, or PR integration | None. |
| Executable-file classification | N/A — no file classification or execution | None. |
| Process integration | N/A — no external process boundary | None. |

---

# 8. Working Set, Read Order, constraints, and handoff

## 8.1 Predicted Working Set

**Create:** `apps/api/drizzle/0003_academic_roster.sql`; `apps/api/src/roster/{repository,service,routes,mapper}.ts`; `apps/api/test/integration/roster.test.ts`; `apps/api/test/privacy/roster-dto.test.ts`.  
**Modify:** `apps/api/src/{server.ts,db/{schema,migrations}.ts,http/errors.ts}`; `packages/contracts/src/index.ts`; focused auth/projection tests only where fixture isolation or route ownership must be preserved; possibly `apps/web/e2e/auth-projection.spec.ts` to stop treating the fixture as canonical.  
**Must not modify:** domain gamification/academic/behaviour/task/narrative modules; product UI/workspace; deployment, backup, retention/deletion, or OpenSpec artifacts.

## 8.2 Read Order for Tasks/Apply
1. This Design; 2. `AGENTS.md`; 3. `docs/SDD-WORKFLOW.md`; 4. SPEC-0001 Design; 5. `apps/api/src/{server.ts,db/{client,migrate,migrations,schema}.ts}`; 6. auth, HTTP error/validation, projection fixture/mapper/routes; 7. contracts; 8. focused migration/auth/privacy/API tests.

## 8.3 Implementation constraints and settled handoff

- Preserve pnpm workspace, Fastify REST, pure TypeScript domain boundary, Drizzle/SQLite, opaque cookie sessions, one-service Docker topology, Vitest/Playwright, and server DTO mapping.
- Do not add dependencies, tenanting, generic soft deletion, uploads, direct browser-to-SQL access, client-side privacy filtering, or cross-domain table reads. Future reference-producing services use the roster-owned `lockStudentGroupCorrection` contract before their first reference.
- Roster identity is canonical; all later student records reference `studentId` and use named read/write contracts. Normal direct membership is immutable except the defined accidental-assignment correction; do not reconsider terminal manual year archive/no-current flag, archive-not-delete, ownership-as-404, or fixture isolation without a Design BLOCKER.

## 8.4 Deferred questions

- Avatar artwork/catalog presentation is a later UI/content concern; this SPEC settles only opaque built-in tokens.
- Year rollover/copy-forward and retention/deletion remain deferred; no implementation inference is permitted.
- A future SPEC must design student transfer/membership history if required; this Design deliberately supplies no such model.

## 8.5 Open findings

### BLOCKER
None found. The selected SPEC-0001 architecture supports this design.

### CONDITION
- **C-01 — production privacy and recoverability gate:** unchanged. Before real student data or production use, SPEC-0014/0016 must define/implement retention and deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification.

### NON-BLOCKING
- The existing projection fixture remains intentionally non-canonical until SPEC-0009 replaces it with later-domain projection composition.
- No user-facing roster workspace is designed here; it remains SPEC-0003.

---

## Architecture Review history

**Result:** APPROVED WITH CONDITIONS

**Evidence inspected:** `AGENTS.md`; canonical workflow and stable context; SPEC-0001 Design and Verify evidence; this candidate; and the current Fastify server/auth/error, SQLite migration/client, projection fixture, and contracts boundaries. The candidate preserves the archived platform contracts and confines work to the roadmap roster scope.

### BLOCKER
None.

### CONDITION
- **C-01 — production privacy and recoverability gate:** unchanged. Before real student data or production use, SPEC-0014/0016 must define/implement retention and deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification. Tasks must retain this as a production-only acceptance condition; it is not a prerequisite for SPEC-0002 implementation.

### NON-BLOCKING
- The design intentionally leaves avatar presentation, year rollover/copy-forward, retention/deletion, and student movement/membership history to their designated future SPECs. No change is required before Tasks.

### Review conclusion and next step
The proposed model was executable without a new architecture decision: stable roster IDs, immutable direct membership, manual terminal year archive, teacher-owned access, server-side allowlist DTOs, transactional migration/batch writes, and objective API/SQLite/privacy coverage were sufficiently specified. This conclusion predates the correction pass and is retained as history only.

## Scoped Architecture Review — Correction Pass

**Result:** APPROVED WITH CONDITIONS

**Evidence inspected:** corrected Sections 2, 3, 4, 5, 6, 7, and 8; affected acceptance criteria; `AGENTS.md`, `docs/SDD-WORKFLOW.md`, stable context, SPEC-0001 Design and Verify evidence; and current Fastify server/auth/error, SQLite migration/client, projection fixture, and contracts anchors.

### BLOCKER
None.

### CONDITION
- **C-01 — production privacy and recoverability gate:** unchanged. Before real student data or production use, SPEC-0014/0016 must define/implement retention and deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification. Tasks must retain this as a production-only acceptance condition; it is not a prerequisite for SPEC-0002 implementation.

### NON-BLOCKING
None.

### Scoped review conclusion and next step
Normal direct `students.group_id` membership remains immutable. The separate administrative correction retains the stable ID, changes only `group_id`, is bounded to a different same-owner/same-unarchived-year group, rejects ownership/archived/same-group/different-year/locked-reference/alias-collision cases, and creates neither transfer semantics nor membership history. The internal roster-owned lock is the minimal future-domain boundary and avoids future-table roster queries. Trim-before-persist validation, explicit ASCII `NOCASE` and partial active-alias constraints, concrete timestamps without `students.updated_at`, server DTO boundaries, fixture isolation, and objective tests/acceptance preserve SPEC-0001 and permit Tasks without a new architectural decision. C-01 is the only condition. Next step: **Tasks for SPEC-0002**.
