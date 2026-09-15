# SPEC-0038 — M7 Avatar Core

**Phase:** Design (Sol)  
**Level:** C — forward schema migration plus student-privacy/API boundary  
**Status:** DESIGN READY  
**Dependencies:** canonical roster (`students`), annual XP summaries, teacher cookie sessions  
**Conditions:** B-01 and C-01 remain open; see Rollout

## 1. Outcome and evidence

M7 gives every canonical student one persistent, teacher-configured Agent Éclipse avatar. It adds a small built-in catalogue, an editable Spanish teacher workflow, deterministic rendering, and append-only revision history. Alias and specialty remain roster-owned; level and badges remain XP-owned. M7 creates no student account or temporary-access flow.

Repository evidence fixes the integration shape: `students` owns identity and currently requires one of `default|fox|owl|cat|wolf`; XP derives annual totals and L1–L8 from immutable evidence; all private routes use teacher cookie sessions and ownership checks; the workspace renders initials rather than avatar artwork; and Projection is fixture-backed through a separate mapper/table. Migration `0017` therefore extends canonical roster identity without using Projection as a source.

## 2. Scope

### In scope

- One canonical avatar profile per student, created with the student and backfilled for every existing student.
- Built-in, code-owned M7 catalogue and a CSS/DOM renderer; no external asset fetch.
- Teacher-private read, replace, history, and revert APIs with ownership, revision, idempotency, and archive rules.
- Workspace card preview and panel editor with intentional loading, empty/invariant-error, edit, save, cancel, stale, retry, and read-only states.
- Narrow server DTO/port contracts for later M8 and an entitlement seam for M9.

### Non-goals

Uploads, free-form colours, image storage, boutique/purchases, grants or XP-driven cosmetic unlocks, student/public endpoints, accounts, access codes/URLs/QRs, access expiry records, rankings, Projection integration, Classroom Mode, `Mostrar al alumno`, group transfer, year rollover/copy-forward, and generic audit/event frameworks. M8 or later owns temporary teacher-controlled access; M7 deliberately persists **no** access secret or expiry.

## 3. Sixteen required design decisions

| # | Decision | Contract and rationale |
|---|---|---|
| D01 | Ownership | `students.id` remains canonical identity. New `avatar-core` service/repository modules own avatar configuration and expose narrow roster/XP adapters; they never query Projection. |
| D02 | Persistence | `avatar_profiles(student_id PK/FK RESTRICT, current_revision >=1, created_at, updated_at)` points to one authoritative immutable row in `avatar_profile_versions(profile_student_id, revision, face_id, skin_tone_id, hair_id, feature_id, clothing_id, accessory_id, frame_id, background_id, operation, reverted_from_revision, reason, actor_teacher_id, created_at)`. PK is `(profile_student_id,revision)`; the head has a composite FK to that row. All catalogue IDs are non-null. `operation` is `BACKFILL|CREATE|UPDATE|REVERT`; `reverted_from_revision` and trimmed `reason` are non-null only for `REVERT`. |
| D03 | Manual versus derived fields | The eight catalogue selections are manual profile state. Alias and the nullable eight-value specialty stay manual roster fields and are not copied into profile history. Annual effective XP, level, specialty category, and active badges are derived on read from their owners and are never stored in avatar tables. |
| D04 | Levels, L8, and excess XP | Reuse `@eclipse/domain`: thresholds are L1–L8 at `0,10,25,45,70,100,135,175`. L8 is the permanent maximum; XP remains an uncapped non-negative safe integer above 175. At L8 progress is `100%`, `nextLevel:null`, `xpToNextLevel:null`. Avatar writes never alter XP, level transitions, gems, badges, rubric evidence, or grades. |
| D05 | Specialty derivation | Never infer specialty from XP or appearance. Derive only its XP category with the existing mapping: Leader/Diplomat→COMMUNICATION; Strategist/Analyst→PRECISION; Disciplined/Perseverant→CONSISTENCY; Helper/Ally→COLLABORATION; null→null. The editor displays this read-only. |
| D06 | Exact M7 catalogue | Stable IDs are: face `face-human|face-fox|face-owl|face-cat|face-wolf`; skin `skin-light|skin-medium-light|skin-medium|skin-medium-dark|skin-dark`; hair `hair-none|hair-short|hair-curly|hair-long`; feature `feature-none|feature-glasses|feature-freckles`; clothing `clothing-eclipse|clothing-field`; accessory `accessory-none|accessory-pin`; frame `frame-none|frame-orbit`; background `background-eclipse|background-night`. Unknown IDs, wrong-category IDs, omitted fields, and additional body fields are `422`. SQLite `CHECK`s enforce these M7 sets; catalogue expansion requires an explicit migration. IDs, not Spanish labels or CSS classes, are persisted. |
| D07 | Legacy compatibility | Backfill maps `default→face-human/skin-medium/hair-short`, and `fox|owl|cat|wolf→` the matching face with `skin-medium/hair-none`; all use `feature-none`, `clothing-eclipse`, `accessory-none`, `frame-none`, `background-eclipse`. Existing `students.avatar` remains a deprecated read-only compatibility token and its five-value `CHECK` remains. New students store `default` there and receive profile revision 1 transactionally. Roster PATCH no longer accepts `avatar`; only Avatar Core mutates appearance. |
| D08 | Unlock abstraction | M7 has **no unlock/entitlement persistence and no XP gate**: every M7 catalogue item is base-available. A narrow `AvatarAvailabilityPort.allows(studentId,itemId)` is called by writes and its M7 adapter accepts catalogue membership. M9 may replace that adapter with boutique-owned entitlements without changing profile storage/API; it must not write avatar tables directly. This avoids coupling cosmetic ownership to reversible XP. |
| D09 | Audit and revert | Every successful create/update/revert appends a full snapshot; history is never edited or deleted. Revert means “append the selected old snapshot as revision N+1,” records `revertedFromRevision`, and requires a trimmed 1–500 character reason in the request (stored with the version). There is no destructive undo. Backfill actor is the owning teacher resolved through group/year. |
| D10 | Group transfer and year rollover | Same-student same-year group correction keeps the profile because it is keyed by student, not group/year. M7 introduces no transfer or rollover. A future rollover that creates a new student ID must explicitly copy a chosen profile revision; it must never match by alias/name. Archived student/year profiles are readable/history-visible but not writable or revertible. |
| D11 | Teacher DTO | `TeacherAvatarDto` contains `studentId, alias, specialty, specialtyCategory, academicYearId, annualEffectiveXp, level, progress, badges, revision, profile, updatedAt, editable`. History contains revision, operation, reverted-from, reason, actor teacher ID, timestamp, and profile. Real name stays in the existing roster DTO and is not duplicated here. |
| D12 | Future restricted DTO | Server-only `RestrictedAvatarDto` is exactly `{studentId,alias,specialty,specialtyCategory,level,progress,badges,profile}`. It excludes real name, exact XP, revision/history, teacher IDs, group/year administration, comments, RT, rubric/grade, behaviour, and disciplinary data. M7 exports a mapper/service port but exposes no route for it. |
| D13 | Rendering and preview | Current web capability has no avatar art and currently renders roster initials. Add one pure `AvatarPreview` React component using local semantic DOM/CSS layers selected by catalogue IDs; no URL, blob, SVG injection, canvas, upload, or network image. Unknown data fails to a neutral initials crest and reports the invariant error in teacher UI. Card and editor reuse this component; M8 must reuse the same renderer/DTO rather than fork token logic. |
| D14 | Privacy and Projection | Every M7 route requires `__Host-session`; ownership mismatch/absence is indistinguishable `404`. Catalogue is authenticated despite containing no names. Server mappers are allowlists. No browser filtering creates a restricted DTO. Existing `/api/v1/projection/**`, `projection_students`, mapper, fixture, and root Projection UI remain unchanged and receive no canonical roster/avatar data in M7. |
| D15 | Revision, idempotency, concurrency | PUT and revert require UUID-v4 `Idempotency-Key` and `expectedRevision`. `avatar_profile_requests(owner_teacher_id,idempotency_key,operation,fingerprint,student_id,resulting_revision,created_at)` has composite PK `(owner_teacher_id,idempotency_key)` and makes exact replays return `200` with the original resulting DTO; key reuse with a different fingerprint is `409`. An immediate transaction compares the head revision, appends N+1, advances the head conditionally, and stores the request. A stale revision or lost race is `409`; no partial revision/request is committed. GETs need no key. |
| D16 | Migration and consumers | Forward migration `0017_avatar_core` creates the three tables/indexes/checks, preflights all legacy tokens and owner lineage, backfills exactly one revision/profile per student, and fails closed on unknown/missing/duplicate data. It does not rewrite XP, roster tokens, Projection, or fixtures. M8 consumes only `RestrictedAvatarDto` plus the renderer and owns any expiring access. M9 consumes `AvatarAvailabilityPort`, owns catalogue expansion/entitlements, and calls Avatar Core writes; neither may treat profile choices as academic or XP evidence. |

## 4. API and workflow

All paths are under `/api/v1`, return the existing `ApiErrorResponse`, validate UUIDs, and use roster-style owner-as-`404` checks.

| Endpoint | Contract | Failures |
|---|---|---|
| `GET /avatar-catalog` | Authenticated immutable catalogue `{version:'m7-v1', categories:[...]}` with stable IDs, Spanish labels, and order; rendering classes stay client-internal | `401`, `500` |
| `GET /students/:studentId/avatar?academicYearId=` | `TeacherAvatarDto`; year must be the student's owned year | `401`, `404`, `422`, `500` |
| `GET /students/:studentId/avatar/history` | Ordered newest-first complete history; teacher-only | `401`, `404`, `500` |
| `PUT /students/:studentId/avatar?academicYearId=` | `{expectedRevision,profile}` replacement; `200 TeacherAvatarDto` | `401`, `404`, `409`, `422`, `500` |
| `POST /students/:studentId/avatar/revert?academicYearId=` | `{expectedRevision,targetRevision,reason}`; appends and returns new current DTO | `401`, `404`, `409`, `422`, `500` |

`annualEffectiveXp`, level, progress, and badges in a successful response are recalculated server-side for the requested academic year; client values are never accepted. History is expected to remain class-sized and is not exposed to classroom consumers; pagination is deferred until measured need.

In `StudentPanel`, the section label is **“Avatar del agente”**. Read mode shows preview, **“Nivel”**, **“Especialidad”**, and **“Personalizar avatar”**. Edit mode uses **“Rostro”**, **“Tono de piel”**, **“Cabello”**, **“Rasgo”**, **“Ropa”**, **“Accesorio”**, **“Marco”**, **“Fondo”**, live preview, **“Guardar cambios”**, and **“Cancelar”**. History uses **“Historial del avatar”** and **“Restaurar esta versión”** with mandatory **“Motivo”**.

Loading disables editing and says **“Cargando avatar…”**. Save disables duplicate submission and says **“Guardando…”**. A known failure retains the draft and offers **“Reintentar”**; an ambiguous network failure retries with the same key. `401` returns to existing sign-in handling. `409` says **“El avatar cambió en otra sesión. Recarga antes de guardar.”** and preserves the draft until reload/cancel. Archived context says **“Este avatar es de solo lectura.”** Missing profile after migration is an invariant error, not an empty profile silently invented by the browser.

## 5. Data and call flow

```text
StudentPanel -> teacher Avatar API -> avatar-core service -> roster ownership
                                             |          -> XP summary (read only)
                                             +----------> avatar tables

Future M8 -> restricted avatar port -> server allowlist -> shared renderer
Future M9 -> entitlement port ------> avatar-core validated write
Projection fixture/table ------------------------------------ unchanged
```

## 6. Failure, privacy, and rollout boundaries

- Service validates session, owner, student/year lineage, archive state, expected revision, catalogue membership, and availability before any write. Database checks and unique/FK constraints are the final boundary.
- A write transaction includes version, head, and request receipt. SQLite busy/constraint failures surface through existing typed errors; the UI must not claim success before reloading the authoritative DTO.
- No M7 response, log field, URL/hash, browser storage, or catalogue metadata contains real name or private educational evidence beyond the explicit teacher DTO. Exact annual XP is teacher-only and absent from the restricted DTO.
- Threat matrix: N/A — this change adds normal authenticated HTTP handlers but no shell, subprocess, executable classification, VCS/PR automation, or process-integration boundary.

Roll out migration before API/web. Migration tests must prove fresh install, exact five-token backfill, populated upgrade, repeat startup inertness, FK/check/index shape, and atomic rollback on bad legacy data. After deploy, smoke-test one read/edit/reload/revert and unchanged Projection responses. Rollback is application rollback only after migration; additive tables may remain unused. Do not down-migrate or discard history.

**B-01 remains open:** active legacy XP without trustworthy term identity remains annual-only and is never timestamp-inferred. It does not block Avatar Core because M7 uses annual XP only.  
**C-01 remains open:** real student data and production use remain blocked until retention/deletion including backup expiry and executed encrypted-restic restore verification are complete.

## 7. Tests and acceptance

### Required evidence

- **Domain/unit:** exact catalogue IDs/category validation; five legacy mappings; specialty-category mapping; L1–L8 thresholds, permanent L8, safe excess XP; renderer determinism/fallback; DTO allowlists.
- **API/SQLite integration:** fresh and populated migration; creation with profile; authenticated read/update/history/revert/reload; exact replay and conflicting-key behavior; stale and simultaneous writes; archived read-only; cross-teacher `404`; unknown IDs `422`; transaction rollback; profile survives same-year group correction; Projection tables/routes unchanged.
- **Web component/integration:** Spanish labels; live preview; edit/save/cancel; pending disabled state; retained draft/retry; stale recovery; archived state; selected-student race isolation; card/editor renderer parity.
- **Focused built-artifact Playwright before Ship:** teacher selects a student, edits and saves, reloads persistence, restores a prior revision, observes a stale conflict/recovery, and confirms the existing Classroom/Projection journey leaks neither teacher history nor exact XP. No temporary-access or student-browser scenario exists in M7.

### Acceptance criteria

- [ ] Every existing and newly created student has exactly one valid current profile and at least one immutable revision.
- [ ] All five legacy tokens retain a deterministic recognizable base-face mapping; unknown legacy data blocks migration without partial effects.
- [ ] Teacher edit, save, cancel, failure retry, reload, history, and append-only revert work with optimistic concurrency and idempotency.
- [ ] Alias/specialty and XP-derived level/badges remain owned by roster/XP; avatar actions mutate none of them and behaviour cannot reduce academic evidence.
- [ ] L8 remains maximum while exact teacher XP may exceed 175; restricted consumers never receive exact XP.
- [ ] Cross-owner, archived-write, invalid-catalogue, and stale-write paths fail closed with no partial state.
- [ ] The restricted DTO and unchanged Projection responses exclude every private field listed in D12/D14.
- [ ] M7 creates no account, code, URL, QR, secret, expiry, upload, boutique, entitlement ledger, public endpoint, or ranking.
- [ ] Persistence/reload, responsive editor behavior, keyboard labels/focus, and useful disabled/error explanations are verified.
- [ ] B-01 and C-01 remain explicitly open.

## 8. Build slicing guidance and working set

Build in bounded cohesive slices: (1) catalogue/domain contracts and RED tests; (2) migration/schema/backfill plus migration tests; (3) avatar-core repository/service and concurrency/idempotency tests; (4) routes/mappers/privacy tests; (5) shared renderer and editor/card states; (6) focused browser regression. Keep tests with each slice; Build creates `TASKS.md` and never Ships.

Expected changes: `apps/api/drizzle/0017_avatar_core.sql`, `apps/api/src/db/{schema,migrations}.ts`, new `apps/api/src/avatar-core/*`, narrow updates to roster creation/routes/mappers, route registration, `packages/contracts/src/index.ts`, new `apps/web/src/workspace/AvatarPreview.tsx`, and bounded updates to `StudentCard.tsx`, `StudentPanel.tsx`, `workspace-api.ts`, styles, and focused tests. Projection source files are test-observed but not modified.

## 9. Risks, review, and Simplicity Check

| Risk | Control |
|---|---|
| Five-token regression or dual authority | Exact backfill table; profile becomes authoritative; legacy column is frozen compatibility only. |
| Private-data leakage | Separate server mappers, teacher auth, owner-as-404, restricted DTO tests, unchanged fixture Projection. |
| Cosmetic/XP coupling | No M7 unlocks; read-only XP derivation; explicit future availability port. |
| Lost updates or duplicate history | Expected revision, immediate transaction, request fingerprint receipt, unique constraints. |
| Renderer/catalogue drift | Stable IDs and one shared component; API validation plus DB checks. |

**Level C review:** Terra review is justified before Build because this design combines a populated migration with a new student-data allowlist and future restricted-consumer seam. Per the maintainer's instruction, this task performs only one Sol Design and does not request or invoke Terra; the separate review remains a next-phase gate, not an open design decision.

**Simplicity Check:** one profile head, immutable revisions, and request receipts are the minimum needed for canonical state, audit/revert, and safe retries. A fixed code catalogue and CSS renderer avoid uploads/assets; one availability interface avoids an M7 entitlement engine. Temporary access, Projection replacement, boutique, rollover, and generic audit infrastructure are deferred to their actual owners. The design has no unresolved implementation decision; only the explicit B-01/C-01 rollout conditions remain.

**DESIGN READY — stop after Sol Design; do not enter Build or review in this task.**
