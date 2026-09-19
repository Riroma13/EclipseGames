# SPEC-0041 — M10 History, Filters, and Audit

**Phase:** Design (Sol)  
**Level:** C — significant cross-domain private read boundary, correction chronology, privacy, and bounded-query performance  
**Status:** DESIGN READY  
**Dependencies:** SPEC-0001/0002/0004 and completed M1–M9: SPEC-0018/0019/0021/0024, SPEC-0027, SPEC-0030, SPEC-0036–0040

## 1. Outcome and scope

Add one read-only, teacher-private history in `/#/workspace`, composed at request time from authoritative records. It supports year/group scope, optional student, term, family, date filters, and stable cursor pagination. It creates no journal, event bus, audit engine, dual write, backfill, or reconstructed event.

Families are exactly `SESSION`, `XP`, `RT`, `GEM`, `LEGACY_COIN`, `BEHAVIOUR`, `RUBRIC`, `TERM_CLOSE`, `AVATAR`, `BOUTIQUE`, `CLASSROOM_EVENT`, `CHALLENGE`, and `MINIGAME`. Legacy coins are labelled read-only; gems remain the only future currency writes. No mutation, export, projection/Classroom/Show Student field, account, ranking, narrative rule, or source calculation changes. Academic, gamification, behaviour, and narrative remain separate; behaviour never changes grades, XP evidence, or RT, and XP remains evidence rather than grade.

## 2. Ownership and source adapters

`history/*` owns only filtering, merge ordering, DTO mapping, and pagination. Narrow adapters read, never reinterpret or write: sessions; XP events/reversals, level transitions, and badge current state; RT entries; Gem and legacy coin evidence; behaviour actions/incidents/proposals; rubric and term-close lifecycle/snapshots; Avatar revisions; Boutique purchases; and game records.

Immutable lifecycle rows produce one item per action. Mutable RT rows produce their current value at `updatedAt`; game records produce one latest-state item at `updatedAt`. UI must not claim unavailable prior values. `ABSENT` remains excluded from RT average, Energy, and streak. B-01 XP rows without trustworthy term/session attribution remain annual-only and are excluded by term filters—never timestamp-inferred.

The three mutable sources below expose exactly one current-state observation per source row. Their `occurredAt` is the stated authoritative timestamp and is also the date-filter and merge-order timestamp; a later source mutation replaces and repositions that observation rather than preserving an earlier version.

| Mutable source | Current-state and timestamp contract | Filter and historical boundary |
|---|---|---|
| Badges (`xp_badge_unlocks`) | Map the row's current `active`, category, and label. `occurredAt` is `last_activated_at` when active and `last_revoked_at` when inactive. A later revoke or reactivation mutates the same row and changes the observation and chronology. | Scope by academic year and owning student's group; a matching student filter includes it. No term/session attribution exists, so any term filter excludes it. This is not an unlock snapshot or lifecycle history: do not timestamp it with `first_unlocked_at`, emit synthetic unlock/revoke/reactivate items, reconstruct transitions from XP, or reinterpret `source_event_id`. An inconsistent inactive row without `last_revoked_at` is a source failure, not a fallback opportunity. |
| Classroom Events (`classroom_events`) | Map one row's current status and safe current fields. `occurredAt` is `updated_at`; edits, activation, completion, display changes, and archive replace and reposition the same observation. | Scope by owner/group/year; student or term filters exclude it because the row has neither attribution. Apply date filters to `updated_at`. Do not turn `created_at`, `activated_at`, `completed_at`, or `archived_at` into lifecycle items or snapshots, and do not reinterpret projection/display changes as separate history. |
| Challenges (`classroom_challenges`) | Map one row's current status, progress/target, and safe current fields. `occurredAt` is `updated_at`; edits, progress, pause/resume, completion, display changes, and archive replace and reposition the same observation. | Scope by owner/group/year; student or term filters exclude it because the row has neither attribution. Apply date filters to `updated_at`. Do not synthesize progress or lifecycle events from `created_at`, `activated_at`, `completed_at`, or `archived_at`, and do not claim prior target/progress/status snapshots. |

## 3. API, ordering, and UI contract

`GET /api/v1/groups/:groupId/history?academicYearId=<uuid>&studentId=<uuid?>&termId=<uuid?>&family=<value?>&from=<UTC?>&to=<UTC?>&limit=<1..50>&cursor=<opaque?>` defaults to all families and `limit=25`; `from` is inclusive and `to` exclusive. Student/term outside the owned context returns `404`; malformed filters/cursors return `422`.

Response is `{items:HistoryItemDto[],nextCursor:string|null}`. The exact item allowlist is `{id,family,kind,occurredAt,student:{id,realName,alias}|null,termId,sessionId,title,summary,facts:{value:string|null,amount:number|null,currency:'EMERALD'|'RUBY'|'DIAMOND'|'COIN'|null,state:string|null,revision:number|null},correction:{state:'ACTIVE'|'CORRECTED'|'REVERSED',relatedId:string|null}|null}`. Server mappers populate only applicable facts; they never expose raw rows, request keys/fingerprints, funding/allocation or teacher IDs, comments/reasons, XLSX data, or source marks/scores.

Adapters normalize UTC `occurredAt`, then merge by `(occurredAt DESC, family-rank ASC, source-id DESC, item-id DESC)`; rank follows the declared list. The authenticated cursor contains that tuple, scope, and filter fingerprint. It reuses the configured cursor key ring with a distinct history HKDF purpose; cross-scope/filter reuse or tampering is `422`. Each adapter pushes scope, tuple, and `limit+1` into one bounded query; no per-item reads or full-history materialization.

Workspace replaces the XP-only recent block with **Historial**. Filters are context, student (**Todo el grupo**), term (**Todo el curso**), family (**Todas**), and date range. Loading, empty, retry, invalid-filter, expired-session, archived/read-only, **Cargar más**, and reset states are intentional. Context/filter changes abort stale pages; reload restores URL filters, not private results. Game authoring routes remain separate.

## 4. Archive, privacy, failure, migration, and rollout

Archived owned records remain readable and visibly read-only. Authentication and owner checks precede adapter reads; responses are `no-store`, and no history route is registered for projection/viewers. Any adapter/source failure, including query, mapping, or source-consistency failure, fails the whole request closed: discard all already composed items, return no `items`, `nextCursor`, or partial chronology, and use the established error envelope with HTTP `503`, generic `INTERNAL_ERROR` messaging, and the request ID only—never database, adapter, source, or exception details. Existing global HTTP logging remains authoritative and unchanged: its established payload-free operational metadata is allowed (`event`, request ID, method, `statusCode`, error `code`, and completed-request `responseTimeMs`). SPEC-0041 adds no logger, log event/field, adapter-name field, or runtime/global logging change. History diagnostics rely only on those global incoming, error, and completed records and must never include teacher/student/group IDs; student names or aliases; URL, query, private filter, or cursor values; history items or other educational payloads; comments; source-record content; SQL; raw exceptions; or adapter/database error details. The UI clears old-context data and offers retry.

No schema/data migration, backfill, flag, or dual write is required. Build adds `apps/api/src/history/*`, registration, contracts, workspace UI/API, and tests. Roll out API before web; rollback removes reads/UI only. C-01 remains the production-only retention/deletion, backup-expiry, and encrypted-restic restore gate.

**Threat matrix:** N/A — normal authenticated REST/read/UI work only; no shell, subprocess, VCS automation, executable classification, or process integration.

## 5. Test and acceptance contract

- Unit/contract: adapter mappings, DTO keys, correction links, `ABSENT`, B-01 exclusion, ties, cursor/filter binding, date boundaries; and the exact badge/event/challenge current-state timestamps, later-change replacement/reordering, and student/term/date exclusions above without synthetic history.
- API/SQLite: all families, combined filters, archives, owner-as-`404`, `401/422/503`, no writes/N+1, bounded query plans, duplicate-free page continuity. Parameterize every adapter to fail after another has returned rows; each case must prove one generic `503`, no history payload or partial items, and only the unchanged global payload-free log records. Capture tests must allow `responseTimeMs` and the established operational fields while proving the absence of student names/aliases, IDs beyond request ID, private filter/cursor values, history or educational payloads, comments, source-record content, SQL, raw exceptions, and adapter/database error details.
- Web: loading/empty/error/retry/reset/load-more, URL reload, stale-request isolation, keyboard/focus/live announcements, laptop/tablet responsiveness.
- Focused built-artifact Playwright before Ship: filter group history to a student/term; observe XP reversal, RT `ABSENT`, Gem correction, rubric/term reopen, Avatar/Boutique evidence; paginate/reload; open archived history; prove history absent from Classroom/Show Student payloads and DOM.

Acceptance requires exact contracts; deterministic pagination; truthful current-state semantics for badges, Classroom Events, and Challenges using only their authoritative timestamps; read-only archives; server ownership/allowlists; unchanged source tables; no coin writes/conversion, generic audit subsystem, or projection leakage; and explicit B-01/C-01. Every adapter/source failure must atomically return only the generic `503` error envelope, with no partial history or internal/source detail. Diagnostics remain payload-free through the unchanged global logging contract, including permitted `responseTimeMs`; SPEC-0041 introduces no logging field, subsystem, or runtime/global logging change.

## 6. Risk, review, and Simplicity Check

Risks are cross-owner leakage, false completeness, unstable ties, and fan-out; controls are scoped adapters, stated limitations, total ordering/cursor binding, bounded indexed queries, and privacy tests.

**Level C / Terra:** targeted Terra review is justified before Build because sensitive records cross many owners and require chronology, correction, pagination, privacy, and performance review. This task does not invoke Terra.

**Simplicity Check:** one read composer, narrow source adapters, one closed DTO, and one workspace panel reuse existing records and cursor keys. No persistence, backfill, cache, search engine, journal, event sourcing, generic audit framework, or new runtime dependency is introduced.

**DESIGN READY — STOP. Do not create TASKS.md or enter Terra, Build, Verify, Ship, or Git/VCS.**
