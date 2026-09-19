# Tasks: SPEC-0041 M10 History, Filters, and Audit

## Expected Change Surface

- Add `apps/api/src/history/*` for contracts, bounded source adapters, composer, DTO mapper, cursor/filter validation, and routes; register in `apps/api/src/server.ts`.
- Extend `apps/web/src/workspace/workspace-api.ts`, `WorkspaceApp.tsx`, and new history panel/filter tests/components under `apps/web/src/workspace/`.
- Add focused API tests under `apps/api/src/history/` and web tests under `apps/web/src/workspace/`; reuse `apps/api/src/gems/cursor.ts` key-ring configuration with a distinct history purpose.
- Preserve/no change: source tables/calculations, projection/Classroom/Show Student routes and DTOs, game authoring, persistence, migrations, backfill, dual-write, export, rankings, narrative, coin writes/conversion, generic audit infrastructure, and runtime/global HTTP logging.

## Minimum Read Order

1. `DESIGN.md`; `apps/api/src/server.ts`; `apps/api/src/http/errors.ts`; `apps/api/src/gems/cursor.ts`.
2. Existing source route/repository pairs: `xp`, `rt`, `gems`, `coins`, `behaviour`, `rubric`, `term-close`, `avatar-core`, `boutique`, `game`.
3. `apps/web/src/workspace/WorkspaceApp.tsx`, `workspace-api.ts`, `workspace-state.ts`, `ClassroomMode.tsx`, and projection integration tests.

## Contracts and Gates

- `GET /api/v1/groups/:groupId/history` accepts the Design query contract; returns `{items,nextCursor}`; defaults all families/limit 25, caps 50, uses inclusive `from` and exclusive `to`.
- Authenticate and owner-scope before reads; owned-context misses are `404` and malformed filters/cursors `422`. Any adapter/source query, mapping, or consistency failure fails the whole request closed as generic HTTP `503` with the established `INTERNAL_ERROR` envelope and request ID only: discard composed rows and return no `items`, `nextCursor`, partial history, or database/source detail. Existing global incoming/error/completed logging remains authoritative and unchanged; its established payload-free operational fields are allowed: `event`, request ID, method, `statusCode`, error `code`, and completed-request `responseTimeMs`. Add no logger, log event/field, adapter-name field, logging subsystem, or runtime/global logging change. Logs must never contain teacher/student/group IDs, student names/aliases, URL/query/private-filter/cursor values, history items or educational payloads, comments, source-record content, SQL, raw exceptions, or adapter/database error details.
- Closed DTO allowlist only; archived rows are visibly read-only. Order by `(occurredAt DESC,family-rank ASC,source-id DESC,item-id DESC)`; opaque authenticated cursor binds tuple, owner scope, and filter fingerprint; pages are duplicate-free and bounded (`limit+1`, no N+1/full materialization).
- No route for projection/viewers; add negative privacy regression coverage proving history fields absent from Classroom/Show Student payloads and DOM.
- **Critical Terra Verification Gate: REQUIRED** — Level C cross-domain private read boundary, chronology, pagination, and privacy/performance review before Build.

## Bounded Implementation Slices

### Slice 1 — RED contracts and safe query foundation — COMPLETE

 - [x] 1.1 RED/GREEN: contract tests cover query validation and exact DTO keys; route foundation provides owner/auth/no-store behavior and has no projection/viewer registration.
 - [x] 1.2 RED/GREEN: cursor tests cover distinct history purpose, scope/filter binding, tamper rejection, tie ordering, and date normalization boundaries.
 - [x] 1.3 Implemented contracts, validators, history cursor, order primitive, owner boundary, and explicit empty route; registered only the route and reused the configured key ring with distinct purpose. Source adapters/composition remain Slice 2.

**Verification evidence:** `VERIFY.md` records the focused Slice 1 Vitest gate and one API typecheck. Slice 2 remains pending and was not started.

### Slice 2 — RED source coverage and API integration

- [x] 2.1 RED then implement adapters for all declared families, including archived/read-only records, RT `ABSENT`, correction links, and B-01 annual-only exclusion. For badges, prove one current-state row timestamped by active `last_activated_at` or inactive `last_revoked_at`; for Classroom Events and Challenges, prove one current-state row timestamped by `updated_at`. Mutate each source and prove replacement/reordering, exact date treatment, applicable student/term exclusion, and no synthetic lifecycle/snapshot items or timestamp fallback/reinterpretation.
- [x] 2.2 RED/API verify combined filters, all-family chronology, duplicate-free pagination, owner isolation, no writes/N+1, and bounded query plans. Re-prove at integration level that each adapter failure discards earlier adapter output, returns only generic `503`, and leaves only the unchanged global payload-free operational records—with `responseTimeMs` allowed and every prohibited private payload or source/internal detail absent.

**Slice 2 verification evidence:** The final focused gate executed
`adapters.test.ts`, `routes.integration.test.ts`, `slice2.evidence.test.ts`,
and `bounded-retrieval.evidence.test.ts` (19/19 passing), plus one API
typecheck. Complete approved all-family adapter coverage, authoritative
mapping, approved filters, cross-family chronology, bounded retrieval/N+1,
fail-closed errors, and payload-free logging evidence are green. Slice 2 is
**COMPLETE**. Slice 3 was not started.

### Slice 3 — Workspace history

- [x] 3.1 RED: loading, empty, retry, invalid-filter, expired-session, archived/read-only, reset, load-more, keyboard/live announcement, responsive, URL reload, and stale-request isolation scenarios.
- [x] 3.2 Implement API client and `Historial` panel/filter UI, replacing only the XP recent block; abort stale pages and clear old-context data on failure.
- [x] 3.3 RED/focused web regression: Projection/Show Student payload and DOM never expose history; verify no game-authoring route coupling.

**Slice 3 verification evidence:** `HistoryPanel.test.tsx` covers initial loading/result, server-order pagination, duplicate prevention, URL filter restoration, filtered empty state, read-only/private rendering, and the component's absence of Show Student payload/DOM. `workspace-api.test.ts` covers the exact no-store history query mapping. Existing `WorkspaceApp.integration.test.tsx` remains green for context reload/race isolation; the panel aborts context/filter requests and load-more requests and clears old items on a new query. No projection, Show Student, game-authoring, persistence, schema, API, or dependency changes were made.

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
