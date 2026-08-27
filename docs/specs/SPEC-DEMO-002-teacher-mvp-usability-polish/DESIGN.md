# SPEC-DEMO-002 — Teacher MVP Usability Polish

**Status:** Archived — Architecture Review APPROVED WITH CONDITIONS; correction Apply complete; Verify PASS WITH CONDITIONS; refreshed Archive complete | **Depends on:** archived SPEC-0003/0004/0005 and SPEC-DEMO-001

## Phase Boundary and Evidence

This archived B-01-only change preserves the approved scope and contains no completed-SPEC reopening or VCS action. Inspected context service/routes, schema/migration, integration tests, and workspace API/panel. `createContext` trims via Zod then inserts; contexts have `archived_at`, but no archive/update route. SQLite/Drizzle use partial `COLLATE NOCASE` unique indexes.

The approved workspace, visual direction, XP/coins/privacy/accessibility, C-01, and conditional D-06 remain unchanged.

## B-01 Technical Approach

Make the assessment context deterministic: one active same-group normalized-name invariant; create either creates or returns its canonical DTO. The inline teacher control says **Create/select Assessment**, never IDs or records. No management page, lifecycle engine, aliases, duplicate-resolution flow, generic idempotency, or dependency.

```
inline name → POST assessment-contexts → service trim/lookup
  ├─ active match → 200 existing DTO → select it
  └─ no match → insert under unique invariant → 201 DTO → select it
                    └─ unique race → reload → 200 canonical DTO
```

## Decisions

| ID | Choice | Rationale |
|---|---|---|
| B-01a | Canonical display name is `trim(name)`; reject empty-after-trim; first successful create preserves casing. Compare active names with `lower(trim(name))` only within `group_id`. | Teacher input stays readable while equivalent retries resolve identically. Same name in another group is independent. |
| B-01b | Create lookup/reuse precedes insert. Add SQLite invariant `UNIQUE(group_id, lower(trim(name))) WHERE archived_at IS NULL` in Drizzle and one SQL migration. Preflight active duplicates and fail closed; never merge/delete history. A unique violation reloads the canonical active row and succeeds. | The index protects concurrent requests and the one-advantage-per-student/context meaning. |
| B-01c | Archived contexts do not match active creation; a same normalized name creates a new ID. Old contexts remain historical/read-only. An archived academic year's group rejects creation with existing `422 VALIDATION_FAILED`; no independently archived-group state exists. | Historical evidence is retained without blocking a new assessment. |
| B-01d | Existing `POST /api/v1/assessment-contexts`, `{groupId: UUID, name: string.trim().min(1).max(100)}`: new `201` + existing context DTO; duplicate/retry `200` + that same DTO; blank `422 VALIDATION_FAILED`; unknown group `404 NOT_FOUND`; archived year `422`. Harmless duplicate is never `409`. | Preserves the route, DTO, validation, and typed-error convention; `200` is already the project replay convention. |
| B-01e | No context rename mechanism exists. The smallest thin future contract is `PATCH /api/v1/assessment-contexts/:contextId` with `{name}` and the same trim/ownership/writable checks: stable ID; active normalized collision `409 CONFLICT`; empty `422`; archived context `422`. No list-management surface follows from it. | A true rename must not silently merge assessments or invalidate redemption identity. |

## Interface and UI

`AssessmentContextDto` remains `{ id, groupId, name, archivedAt }`; create returns it unchanged. Add `workspaceApi.createAssessmentContext`; `StudentPanel` keeps active contexts only. On an inline duplicate, replace/select the returned canonical item and announce that assessment is selected; no error workflow. The existing redemption uniqueness remains one advantage per `student_id + assessment_context_id`, therefore unambiguous because B-01 selects one canonical active context.

## Evidence Plan

| Layer | Objective evidence |
|---|---|
| API/integration | Trimmed create returns `201`; empty rejects; different-case and whitespace retry return `200` and first DTO; same name in another group returns a new ID; concurrent creates converge on one row/ID; archived old plus new active has two IDs; archived-year and unknown-group typed failures; rename collision `409`; snapshots prove no mutation on failures. |
| Unit | Normalization and create-or-reuse result/status; unique-violation reload path; rename guard. |
| Playwright | Teacher types Create/select Assessment, duplicate auto-selects the existing teacher-named assessment, then spends once; repeat advantage remains `409` without another debit. Use real API fixtures, roles/outcomes, and no ID/assessment name in URL/storage. |

## Working Set (planned only)

| File | Action | Purpose |
|---|---|---|
| `apps/api/src/coins/{service,routes}.ts` | Modify | Create-or-reuse and thin rename contract using existing errors. |
| `apps/api/src/db/schema.ts`, `apps/api/drizzle/0006_assessment_context_name_uniqueness.sql` | Modify/Create | One partial normalized active-name invariant and fail-closed preflight. |
| `apps/api/test/integration/coins-lifecycle.test.ts` | Modify | B-01 API/concurrency/archive/rename evidence. |
| `apps/web/src/workspace/{workspace-api,StudentPanel}.tsx` and workspace/Playwright tests | Modify | Inline create/select and automatic reuse evidence. |

## Threat Matrix

| Boundary | Applicability | Response / RED tests |
|---|---|---|
| Documentation-like paths | N/A | No file classification/execution boundary. |
| Git repository selection | N/A | No Git command. |
| Commit state | N/A | No commit operation. |
| Push state | N/A | No push operation. |
| PR commands | N/A | No PR command. |

## Migration, Simplicity, and Review State

One forward invariant migration only; deploy only after preflight finds no active normalized duplicates, otherwise stop for maintainer resolution. D-06's later correction is limited to the minimal fixed-ID/source/idempotent point grants documented in the refreshed Apply and Archive records; no new mechanics are introduced. C-01 remains production-only.

**Historical Architecture Review #2152:** BLOCKED B-01 before this refinement; retained as history, not current lifecycle. **Current Architecture Review:** APPROVED WITH CONDITIONS; migration preflight/fail-closed test evidence carried through Apply and Verify. **Correction reference:** the post-Verify maintainer correction is presentation-only for Eclipse Points, preserves backend `coin` terminology and B-01 boundaries, adds AbortError/genuine-failure evidence, and minimally extends D-06 seed data for the verified journey. **Final state:** correction Apply complete; Verify PASS WITH CONDITIONS; refreshed Archive complete. **Next step:** Health, then Repository Ready. C-01 remains production-only.
