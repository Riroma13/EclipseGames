# Tasks: SPEC-0002 Academic Years, Groups, and Students

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 850–1,200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 foundation; PR 2 API; PR 3 privacy/evidence |
| Delivery strategy | force-chained |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Migration, schema, constraints | PR 1 | `pnpm exec vitest run apps/api/test/integration/roster.test.ts -t migration` | `pnpm exec tsx apps/api/scripts/migrate.ts` on disposable SQLite | migration/schema files |
| 2 | Repository/service/routes/correction | PR 2 | `pnpm exec vitest run apps/api/test/integration/roster.test.ts` | Fastify inject CRUD, batch, archive, correction | `apps/api/src/roster/` and wiring |
| 3 | DTO privacy, isolation, evidence | PR 3 | `pnpm exec vitest run apps/api/test/privacy/roster-dto.test.ts apps/api/test/integration/roster.test.ts` | API workflow; Playwright only if screen exists | tests, `APPLY-SUMMARY.md`, handoff |

## Phase 1: Persistence and RED tests

- [x] 1.1 [AC-02,07] RED-test trim/minimum, display casing, ASCII `NOCASE` year/group uniqueness, partial active-alias uniqueness, date/FK/RESTRICT/index/archive/lock constraints in `apps/api/test/integration/roster.test.ts`.
- [x] 1.2 [AC-02] RED-test migration ordering, repeatability, transactional DDL rollback, database close/startup block on failure in existing migration/client coverage.
- [x] 1.3 [AC-02] Add `0003_academic_roster` and Drizzle definitions/registry in `apps/api/drizzle/`, `src/db/{schema,migrations}.ts`; preserve fixture DDL and fail closed on migration errors.

## Phase 2: Contracts and roster core

- [x] 2.1 [AC-01,07,08] RED-test Zod UUID/body rules, trim-before-persist, 1–30 atomic drafts, empty-after-trim rejection, avatar/specialty enums, and conflict/error mapping.
- [x] 2.2 [AC-01,07,08] Add `CONFLICT`, validation helpers, and repository/service in `packages/contracts/src/index.ts`, `apps/api/src/http/`, `apps/api/src/roster/{repository,service}.ts`; enforce ownership-as-404, transactions, terminal archive, correction safeguards, stable ID, idempotent lock, and no future-table queries/history.
- [x] 2.3 [AC-01,06,08] Implement `apps/api/src/roster/{routes,mapper}.ts` and `src/server.ts` wiring for authenticated `/api/v1` CRUD/archive, batch creation, and separate correction.

## Phase 3: Privacy and integration verification

- [x] 3.1 [AC-03,04] RED-test teacher-private/classroom-safe allowlists, negative private-field assertions, authentication, and payload-free audit; add roster DTOs in `apps/api/test/privacy/roster-dto.test.ts` and preserve `projection_students` fixture-only ownership.
- [x] 3.2 [AC-01,02,06,07,08] Complete API/integration tests for 401, ownership 404, 409/422, archive historical reads and blocked writes, correction target/lock/alias failures, RESTRICT references, and no partial rows in `apps/api/test/integration/roster.test.ts`.
- [x] 3.3 [AC-04] Update focused projection/auth fixtures/tests only if required to prove isolation; never add workspace UX. Run Playwright only under Design’s minimal-screen condition.

## Phase 4: Handoff and evidence

- [x] 4.1 [AC-01–08] Produce `docs/specs/SPEC-0002-academic-years-groups-students/APPLY-SUMMARY.md` with Working Set, migration, tests, AC mapping, deviations, and privacy evidence.
- [x] 4.2 Carry C-01 unchanged as production-only: SPEC-0014/0016 retention/deletion, backup expiry, and quarterly encrypted-restic restore verification; update `.ai/context/SESSION.md` only with Apply Summary/evidence and exact next SDD step.
- [x] 4.3 Run build/typecheck, Vitest, API privacy/integration, migration-failure, and conditional Playwright checks; record results for Apply Summary and Tasks Review/Apply handoff.

### Compact AC mapping

AC-01: 2.1–2.3, 3.2; AC-02: 1.1–1.3, 2.1–2.2, 3.2; AC-03: 3.1; AC-04: 3.1–3.3; AC-05: 4.2; AC-06: 2.2–2.3, 3.2; AC-07: 1.1, 2.1–2.2, 3.2; AC-08: 2.1–2.3, 3.2.

## Tasks Review

**Result:** APPROVED WITH CONDITIONS

**Evidence:** Reviewed the approved SPEC-0002 Design, canonical workflow, repository instructions and stable context, SPEC-0001 Design/Verify evidence, and the Design Read Order implementation/test anchors. The breakdown covers AC-01–AC-08, the predicted Working Set, dependency direction, C-01, migration/privacy work, Apply Summary, SESSION handoff, and conditional Playwright scope. No architecture or product decision is reopened.

### Conditions

- **Migration ordering:** Before Apply, make the dependency explicit in the applicable task evidence: `0001_foundation → 0002_auth_projection → 0003_academic_roster`; assert the registered order, repeatability, untouched `projection_students` fixture, and fail-closed startup behavior.
- **RED-first failure coverage:** Ensure RED tests precede production tasks for correction-lock idempotency and every stated correction failure, plus safe unexpected-error `500` mapping. Keep the existing validation, migration-failure, trim/casing, `NOCASE`, partial-active-alias, and archive/RESTRICT RED coverage.
- **Privacy/API explicitness:** The API verification task must name the exact `/api/v1` endpoints and explicitly assert that no browser/client `fields` filtering or private DTO fallback is relied upon; retain teacher-private/classroom-safe negative payload tests and payload-free audit evidence.

### Non-blocking

- The `force-chained` delivery metadata is retained as supplied; chain strategy remains `pending` for the orchestrator’s workload guard. No wording or speculative scope issue blocks Apply.

**C-01:** Preserved unchanged as a production-only condition: SPEC-0014/0016 must define/implement retention and deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification before real student data or production use.

**Next step:** Apply after the orchestrator resolves the workload-guard chain decision and carries these conditions into implementation evidence; do not begin Tasks Refinement.
