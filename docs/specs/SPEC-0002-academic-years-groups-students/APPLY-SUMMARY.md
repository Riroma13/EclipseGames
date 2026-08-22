# SPEC-0002 Apply Summary

Apply is complete for the approved Academic Years, Groups, and Students Design. Phase 4 tasks 4.1–4.3 completed the handoff and evidence work unit. Verify, Archive, Health Report, and Repository Ready were not run.

## Files changed

### Created

- `apps/api/drizzle/0003_academic_roster.sql`
- `apps/api/src/roster/mapper.ts`
- `apps/api/src/roster/repository.ts`
- `apps/api/src/roster/routes.ts`
- `apps/api/src/roster/service.ts`
- `apps/api/test/integration/roster-core.test.ts`
- `apps/api/test/integration/roster.test.ts`
- `apps/api/test/privacy/roster-dto.test.ts`
- `docs/specs/SPEC-0002-academic-years-groups-students/APPLY-SUMMARY.md`

### Modified

- `.ai/context/SESSION.md`
- `apps/api/src/db/migrations.ts`
- `apps/api/src/db/schema.ts`
- `apps/api/src/server.ts`
- `apps/api/test/integration/migrations.test.ts`
- `packages/contracts/src/index.ts`
- `docs/specs/SPEC-0002-academic-years-groups-students/TASKS.md`

## Key implementation decisions

- `students` is the canonical roster identity; `projection_students` remains a SPEC-0001 fixture and is not read or written by roster code.
- Academic years, groups, and students use stable UUIDs, teacher ownership, prepared SQL, transactional service operations, and ownership-as-`404` responses.
- Year archive is terminal for writes while authorized historical reads remain available.
- Student group membership is immutable except for the explicitly bounded, same-owner/same-year, unlocked accidental-assignment correction. The correction retains the student ID and creates no history.
- Teacher-private DTOs and classroom-safe DTOs are separate server-side allowlists. No browser `fields` filtering or private DTO fallback is used.
- Batch roster creation accepts 1–30 drafts and rolls back atomically on validation or constraint failure.

## Working Set

### Planned

The approved Design Working Set: the `0003_academic_roster` migration; Drizzle schema and migration registry; bounded `apps/api/src/roster/{repository,service,routes,mapper}.ts`; contracts and server wiring; focused migration, integration, privacy, and fixture-isolation tests; Apply Summary and SESSION handoff.

### Actual

The planned implementation and evidence set was completed. The actual set also includes the required `TASKS.md` checkbox update and this summary. `apps/api/src/http/errors.ts` did not require modification because the existing typed error path supported the approved `CONFLICT`, validation, authentication, ownership, and safe `500` behavior after the contracts update.

### Accuracy / deviations

No behavioral deviation from the approved Design. No UI, Playwright test, dependency, product-domain module, backup, retention/deletion, or production infrastructure was added. The conditional Playwright check is N/A because no minimal teacher roster screen was introduced; API integration is the Design-approved workflow proof.

## Migration and rollback evidence

Migration `0003_academic_roster` creates `academic_years`, `groups`, and `students` with foreign-key `RESTRICT`, date and non-empty checks, explicit ASCII `NOCASE` uniqueness, partial active-alias uniqueness, indexes, archive state, and the roster correction lock. The registry order is explicitly tested as:

`0001_foundation → 0002_auth_projection → 0003_academic_roster`

Migration tests prove ordered application, repeatability, untouched `projection_students`, transactional rollback, and fail-closed `MigrationError` behavior. Existing `openDatabase` closes the database when migration fails, blocking startup. Forward migrations are not runtime-reversed; when schema rollback is unsafe, the Design boundary is restoration from a verified backup.

Rollback boundary for this work unit: remove the Phase 4 evidence and handoff artifacts without changing implementation, or revert the SPEC-0002 implementation boundary consisting of `apps/api/drizzle/0003_academic_roster.sql`, `apps/api/src/db/{migrations,schema}.ts`, `apps/api/src/roster/`, `apps/api/src/server.ts`, `packages/contracts/src/index.ts`, and the SPEC-0002 tests. No unrelated foundation fixture or product domain is included.

## Validation evidence

| Command | Result | Exact evidence |
|---|---|---|
| `pnpm build` | PASS | Web Vite build and API TypeScript build completed successfully; exit 0. |
| `pnpm typecheck` | PASS | Web and API TypeScript checks completed successfully; exit 0. |
| `pnpm exec vitest run` | PASS | 11 files, 37 tests passed; exit 0. |
| `pnpm exec vitest run apps/api/test/privacy/roster-dto.test.ts apps/api/test/integration/roster.test.ts apps/api/test/integration/roster-core.test.ts apps/api/test/privacy/projection.test.ts` | PASS | 4 files, 22 tests passed; exit 0. |
| `pnpm exec vitest run apps/api/test/integration/migrations.test.ts` | PASS | 1 file, 3 migration tests passed, including migration failure rollback; exit 0. |
| `pnpm exec vitest run apps/api/test/integration/roster-core.test.ts -t "runs the authenticated year, group, and batch workflow through Fastify"` | PASS | 1 runtime workflow test passed; 5 unrelated tests skipped by the focused selector; exit 0. |
| `pnpm exec vitest run apps/api/test/integration/roster.test.ts apps/api/test/integration/transactions.test.ts` | PASS | 2 files, 8 tests passed; exit 0. |
| Playwright roster screen check | N/A by Design | No minimal teacher roster screen was introduced; API integration is the approved runtime proof, so unrelated E2E was not run. |

Runtime harness evidence: Fastify inject authenticated login → academic year creation → group creation → atomic student batch creation passed. API integration additionally covers exact `/api/v1` authentication, ownership-as-`404`, `409`/`422`, archive historical reads and blocked writes, correction failures, stable IDs, and idempotent correction locking.

## Acceptance criteria mapping

- [x] **AC-01:** Authenticated teacher year/group/student workflow, private reads, correction, archive, ownership checks, and anonymous/other-owner rejection are covered by service and Fastify integration tests.
- [x] **AC-02:** Ordered/repeatable migration, SQLite constraints, foreign-key `RESTRICT`, atomic batches, transaction rollback, and fail-closed migration behavior are implemented and tested.
- [x] **AC-03:** Separate teacher-private and classroom-safe allowlists, negative private-field assertions, authentication, and payload-free audit evidence are present; no client filtering or private fallback is relied upon.
- [x] **AC-04:** `projection_students` remains fixture-only; migration, repository, service, mapper, and integration evidence preserve isolation.
- [x] **AC-05:** No stated non-goal was implemented. C-01 remains unchanged as a production-only condition.
- [x] **AC-06:** Manual year archive is owner-only, succeeds once, becomes a terminal write boundary, and preserves authorized historical reads.
- [x] **AC-07:** Trim-before-persist validation, preserved display casing, empty-after-trim rejection, explicit `NOCASE` conflicts mapped to `409`, and archived-alias reuse are covered.
- [x] **AC-08:** Administrative correction changes only an unlocked accidental assignment within different same-owner/same-unarchived-year groups, retains the stable student ID, creates no history, and covers the required `401`/`404`/`422`/`409` failures.

## Privacy and security evidence

- Real names, group/year administration fields, lifecycle timestamps, and correction-lock state are excluded from classroom-safe DTOs.
- Classroom-safe routes remain teacher-authenticated; safe classification does not weaken authorization.
- Unexpected API failures use the existing typed `500 INTERNAL_ERROR` path without request payload or student data in audit output.
- Ownership and absence intentionally map to `404` to avoid cross-teacher record disclosure.
- No student data, credentials, secrets, public endpoint, browser-side privacy filter, or public ranking was added.

## C-01 — production-only condition

C-01 is carried forward unchanged: before real student data or production use, SPEC-0014/0016 must define and implement retention and deletion including backup expiry, and demonstrate quarterly encrypted-restic restore verification. This Apply work unit does not implement or satisfy that production gate. The local environment does not provide encrypted-restic execution; any local fixture restore is not encrypted-restic proof.

## Known issues and non-blocking findings

- C-01 remains the production gate described above.
- Exact legal/privacy retention and deletion controls remain deferred to SPEC-0014.
- Avatar presentation/catalog UX, year rollover/copy-forward semantics, and student transfer/history remain deferred to their approved future Designs.
- No minimal roster UI exists in this SPEC; workspace UX remains SPEC-0003.

## Focused Apply remediation — avatar persistence mismatch

The independent Verify defect was confirmed: the approved server catalog in `apps/api/src/roster/service.ts` and `apps/api/src/roster/routes.ts` accepts `default`, `fox`, `owl`, `cat`, and `wolf`, while the `students.avatar` CHECK in `apps/api/drizzle/0003_academic_roster.sql` allowed only `default`. SQLite therefore rejected a Zod-valid `fox` request at the persistence boundary and the service returned `409 CONFLICT`.

The smallest Design-compliant correction updates `apps/api/drizzle/0003_academic_roster.sql` to allow the existing five-token catalog and adds `apps/api/test/integration/roster-core.test.ts` coverage that persists every permitted avatar through the authenticated Fastify API. The avatar catalog, validation design, dependencies, and scope were not changed; there is no Design deviation.

Focused validation:

| Command | Result | Exact evidence |
|---|---|---|
| `pnpm exec vitest run apps/api/test/integration/roster-core.test.ts -t "persists every permitted avatar"` | PASS | 1 test passed; exit 0. |
| `pnpm exec vitest run apps/api/test/integration/migrations.test.ts apps/api/test/integration/roster.test.ts apps/api/test/integration/roster-core.test.ts` | PASS | 3 files, 17 tests passed; exit 0. |
| `pnpm typecheck` | PASS | Web and API TypeScript checks completed; exit 0. |

Remediation rollback boundary: revert only the avatar CHECK line in `apps/api/drizzle/0003_academic_roster.sql` and the focused regression in `apps/api/test/integration/roster-core.test.ts`; no unrelated implementation or evidence is removed. This forward migration correction must be verified through the normal migration path; it is not a runtime schema rollback.

## Apply handoff

Tasks 1.1–4.3 remain checked. The focused Apply remediation passes. **Verify must be rerun; this remediation does not claim Verify passed.**

Exact next SDD step: `Verify for SPEC-0002`.
