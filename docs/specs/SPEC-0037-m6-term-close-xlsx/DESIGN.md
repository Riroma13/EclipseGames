# SPEC-0037 — M6 Term Close and XLSX Export

## Status, route, and outcome

**Level C — Sol Design only.** A migration and teacher-private educational export justify Terra review under the default SDD Lite route. This request explicitly limits work to one Explore and one Sol Design and prohibits Terra, so Terra is **not routed**. Build, Verify, Playwright, Ship, and Git/VCS work are not authorized.

The outcome is an explicit, versioned group-term close. It references M5 immutable rubric versions, snapshots RT and roster facts, and stores the generated XLSX bytes. Repeated downloads therefore cannot silently change after roster, RT, rubric, code, or library changes.

## Scope and evidence

Repository evidence: M5 already owns per-student `OPEN → CLOSED → REOPENED → CLOSED`, revisions, UUID-v4 idempotency, immediate transactions, immutable snapshots, and stale evidence; `rt/service.ts` currently replays term entries into nullable averages; `students` belong to groups and use `archived_at`; projection DTOs are server allowlists; package manifests contain no XLSX/ZIP library. Canonical `.ai/context/PROJECT.md:337-367` requires exactly `Student`, `Classroom Observation /10`, and `RT average /10`.

**In scope:** readiness, group-term close/reopen versions, roster/RT/rubric snapshot lineage, private versioned XLSX download, Spanish group workflow, migration, and focused tests.

**Out of scope:** changing M5 lifecycle or grade rules; auto-closing rubrics; detailed/category/comment/XP export; CSV/PDF; RT grading or persistence changes; roster-transfer rules; projection; public links; student accounts/rankings; retention/backup implementation; generic report/audit engines.

## Decisions and behaviour

| Decision | Contract and rationale |
|---|---|
| Group close | Create a first-class group-term closure, not orchestration over live M5 reads. Readiness may aggregate M5 state, but only a persisted snapshot can freeze cohort, names, rubric versions, RT basis, and bytes. |
| Every active student | At each close attempt, the authoritative cohort is every `students.group_id = groupId AND archived_at IS NULL`. Zero active students rejects `422`. Every cohort member must have a current M5 evaluation in `CLOSED` with a snapshot; missing/virtual `OPEN`, `OPEN`, or `REOPENED` blocks the whole close and is returned by readiness. No partial export or auto-close. |
| Roster changes | Added active students before close are included and block until ready. Archived/removed students before close are excluded. A permitted pre-evidence group correction follows the current group. After close, additions, archival, or transfer never alter that version; reclose captures the then-current cohort. Existing roster correction locks remain unchanged. |
| RT | Close recomputes from authoritative term entries in real-session start/id order, using `10/5/0`; `ABSENT` is retained as evidence but excluded from sum/count. Store integer sum, evaluated count, and each source entry ID/value. No evaluated RT is **non-blocking**: average is `null` and the XLSX cell is blank, never `0`. |
| Correction | Post-close RT edits, M5 reopen/reclose, or roster changes only make the current group snapshot `stale`; they never mutate or regenerate it. Teacher reopens the group close with a reason, completes current M5 closures, and closes again to create `priorVersion + 1`. Prior downloads remain available. |
| XLSX | Add pinned API dependency `exceljs@4.4.0`: the repo is Node ESM/pnpm and has no spreadsheet/ZIP dependency; ExcelJS writes real OOXML buffers and avoids a custom ZIP/XML implementation. Generate once inside close, persist BLOB + SHA-256 + length, and serve those exact bytes. |

`stale` is true when the current active student-ID set differs, a referenced rubric is no longer `CLOSED` at the referenced current version, or the canonical RT entry ID/value sequence differs. Readiness also reports B-01 counts, but B-01 does not invent a blocker beyond M5's explicit limitation.

## Data and transaction contract

Migration `0016_group_term_close_xlsx`, registered after `0015`, creates:

- `group_term_closures`: unique group+term identity with owner/year/calendar lineage, `OPEN|CLOSED|REOPENED`, revision, and current snapshot version.
- `group_term_close_snapshots`: immutable version/prior version, cohort count, actor/time, XLSX BLOB/SHA-256/length.
- `group_term_close_students`: immutable ordinal, student ID, snapshotted real name, M5 evaluation/snapshot version, `grade_milli`, RT sum/evaluated count.
- `group_term_close_rt_evidence`: immutable snapshot/student/entry/value basis, including `ABSENT`.
- append-only `group_term_close_lifecycle_events` (`CLOSE|REOPEN`) and teacher-scoped `group_term_close_requests`.

Composite uniques/FKs and checks enforce owner/year/group/calendar/term lineage, contiguous positive versions, grade range, RT values, nonnegative counts, and one ordinal/student per snapshot. Existing rows are untouched; no backfill occurs.

Close and reopen use `BEGIN IMMEDIATE`. They recheck ownership, active-year policy, state, `expectedRevision`, readiness, and all evidence; write snapshot rows, workbook, lifecycle, request, and closure atomically. Failure rolls everything back. Mutations require a UUID-v4 `Idempotency-Key`; fingerprint operation, route identities, expected revision, and normalized body. Exact key/fingerprint replay returns the recorded revision/version (`200`); semantic reuse or stale/concurrent writes return `409`. Fresh close/reopen returns `201`; one concurrent writer wins. Reopen requires trimmed reason 1–500. Archived years are read/download-only.

## Private API and XLSX contract

All routes use cookie authentication, Zod validation, ownership-as-`404`, private mappers, and existing safe errors/logging.

| Route | Result |
|---|---|
| `GET /api/v1/groups/:groupId/terms/:termId/term-close?academicYearId=` | State/revision/current version/history metadata, active count, ready count, per-student ID/M5 state/version/RT count, blockers, B-01 count, and stale reasons. |
| `POST .../term-close/close` | `{expectedRevision}`; atomically creates the next snapshot/XLSX only when ready. |
| `POST .../term-close/reopen` | `{expectedRevision, reason}`; preserves all prior versions. |
| `GET .../term-close/exports/:version.xlsx?academicYearId=` | Exact stored bytes; `200`, OOXML MIME, `Content-Length`, quoted attachment filename, `X-Content-Type-Options: nosniff`, private `Cache-Control: no-store`, and stored SHA-256 as `ETag`. |

Workbook: one worksheet named from `T1|T2|T3`; row 1 contains exactly the three canonical headers above and no hidden/private columns, comments, formulas, macros, links, metadata sheet, rubric detail, XP, or behaviour. Rows use snapshotted real name, numeric `grade_milli / 1000`, and numeric RT `sum / count` or blank. Grade/RT number format is `0.###`. Order is deterministic by snapshotted real name (`NOCASE`), then student ID, persisted as ordinal. Fixed workbook properties plus persisted bytes make retries byte-stable.

Filename is deterministic and header-safe: `term-close_<year-label>_<group-name>_<term-code>_v<version>.xlsx`, with labels Unicode-normalized, unsafe/control/path characters replaced by `-`, whitespace collapsed, segments bounded, and IDs used as fallback.

Student names, exact grades, RT, source IDs, snapshots, and files remain teacher-private and must never enter projection/Show Student DTOs, logs, URLs beyond opaque IDs/version, browser storage, or public caches.

## Spanish teacher workflow

Add a group-level `Cierre trimestral` panel using existing panel, table, status, error, dialog, and button language. One term selector and a 30-student readiness table show name, `Rúbrica` (`Cerrada vN`/`Pendiente`), `RT` (average or `Sin evidencias`), and blocking state. Summary reads `N de 30 listos`; filter `Solo pendientes`, row selection, and `Siguiente pendiente` open the existing student rubric at that term. Do not batch-close student rubrics.

`Cerrar trimestre` is enabled only when every active student is ready; disabled text explains why. Closed mode shows version/time/stale notice and `Exportar XLSX`; reopen requires reason/confirmation. Loading, no calendar/term, empty group, error+retry, pending duplicate prevention, stale `409` with reload, session expiry, archived read-only, context-abort, narrow layout, keyboard labels/focus, and persisted reload are intentional. Ambiguous mutation retry retains its key; successful context change clears private state and keys.

## Failure boundaries, rollout, and tests

- Workbook generation/validation or DB failure: `500`, full rollback, no closed state/file residue.
- Missing rubric: readiness identifies the student; close `422`, no partial snapshot.
- No RT: close succeeds and exports blank RT cell.
- Later correction: old bytes remain official; stale is explicit; only reopen/reclose publishes a new version.
- Unauthorized/version mismatch: `401` or ownership-safe `404`; no names/file bytes. Projection allowlists remain unchanged.
- **B-01:** active legacy XP without trustworthy term identity remains annual-only, is never timestamp-inferred, and its count/term-completeness warning appears in readiness/UI. Exported M5 grades retain that known limitation.
- **C-01:** real-data production remains blocked by retention/deletion, backup expiry, and executed encrypted-restic restore evidence; this SPEC does not solve it.

Roll out migration, API, then UI; no backfill or feature flag. Smoke one 30-student close/download/reopen/reclose before enablement. Before any close, rollback may restore a verified pre-migration backup. After snapshots exist, disable writes but retain private reads/downloads and use only a forward corrective migration.

Test priority: **P0** domain roster/readiness and RT sum/count/absence rules; migration constraints; valid XLSX opened and inspected by ExcelJS for exact sheet/header/types/order/blanks; immutable byte/hash replay; M5-version/RT/roster staleness; reopen/version lineage; UUID replay/mismatch, stale revision, competing closes, and injected rollback. **P1** Fastify auth/ownership/status/headers/filename/30 rows and projection negative regression. **P1** web Vitest for the complete Spanish fast workflow and recovery states. Later Verify must include a focused browser journey for 30-student readiness, close, download, correction, reopen/reclose, responsive keyboard use, and projection non-leakage; it is not run by this Design task.

## Expected working set

Create `apps/api/drizzle/0016_group_term_close_xlsx.sql`, `apps/api/src/term-close/{repository,service,mapper,routes,xlsx}.ts`, focused tests, and `apps/web/src/workspace/TermClosePanel.tsx`. Modify API package/lockfile, schema/migrations/server, contracts, workspace API/app/rubric term coordination, styles, and privacy tests. Preserve M5, RT writes, projection, and all game/behaviour/narrative boundaries.

## Acceptance and Simplicity Check

- [ ] Every active student is governed exactly as above; missing rubric blocks, no RT does not.
- [ ] Each close atomically freezes cohort/name, exact M5 version/grade, exact RT basis, actor/time, prior version, and XLSX bytes; old versions never drift.
- [ ] XLSX is valid and contains exactly the three canonical columns, deterministic rows/types/blank semantics, and safe deterministic filename/headers.
- [ ] Reopen/reclose, correction staleness, idempotency, revision, concurrency, rollback, ownership, archive, privacy, B-01, and C-01 contracts hold.
- [ ] The Spanish 30-student journey and all applicable baseline states are tested; projection remains unchanged.

**Threat matrix:** N/A — normal authenticated REST/file response only; no shell, subprocess, VCS/PR automation, executable classification, or process integration.

**Simplicity Check:** one cohesive term-close module, one forward migration, one established spreadsheet dependency, six narrow tables, and one group panel are the minimum that preserves auditable cohort/RT/M5 lineage and byte-stable exports. Live-only orchestration, custom OOXML, generic reporting, and projection reuse are rejected. No unresolved design blocker exists; B-01 and C-01 remain the stated rollout limitations.
