# Tasks: SPEC-DEMO-002 Teacher MVP Usability Polish

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 700–1,000 (tests, migration, API, UI, evidence) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Internal units 1 → 2 → 3 → 4; no VCS assumption |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Internal Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Migration/API context invariant | `pnpm test -- apps/api/test/integration/coins-lifecycle.test.ts` | API fixture: create/retry/archive/race/rename | schema, migration, coins service/routes/tests |
| 2 | Workspace hierarchy and assessment flow | `pnpm test -- apps/web/src/workspace` | Authenticated teacher journey in Playwright | `StudentPanel`, workspace API/state/CSS/tests |
| 3 | Feedback, responsive, accessibility/privacy | `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts` | Tablet viewport, keyboard, reload/hash checks | presentation/state/styles/e2e tests |
| 4 | Full evidence and acceptance | `pnpm test && pnpm typecheck && pnpm build` | Canonical authenticated client demo; no seed expansion unless gated | evidence-only changes and conditional seed task |

## Phase 1: RED Tests / Foundation
- [x] 1.1 RED: add migration fixtures proving legacy active same-group `lower(trim(name))` duplicates fail closed: no index, data mutation, or `schema_migrations` row (C-DEMO-02).
- [x] 1.2 RED: add clean-migration assertion for exact partial uniqueness `(group_id, lower(trim(name))) WHERE archived_at IS NULL` (C-DEMO-03).
- [x] 1.3 RED: add API/service tests for trim/case reuse, 201 new/200 canonical reuse, empty/unknown/archived-year failures, cross-group independence, archive replacement, race recovery, and stable-ID rename collision.

## Phase 2: API / Core
- [x] 2.1 Update `apps/api/src/db/schema.ts` and create `apps/api/drizzle/0006_assessment_context_name_uniqueness.sql` with transactional preflight and partial expression index.
- [x] 2.2 Update `apps/api/src/coins/{service,routes}.ts` for lookup-before-insert, unique-violation reload, and thin PATCH rename (stable ID; 409/422/404/archived guards).
- [x] 2.3 Keep `AssessmentContextDto`, redemption uniqueness, XP/coin rules, and C-01 production-only unchanged; do not add management, generic idempotency, or domains.

## Phase 3: Workspace / UX
- [x] 3.1 RED then update `apps/web/src/workspace/{workspace-api,StudentPanel}.tsx` and existing CSS/state for hierarchy, breathing room, active-context filtering, and inline **Create/select Assessment** reuse.
- [x] 3.2 RED then unify idle/pending/success/failure/undo feedback without changing action semantics or adding generic infrastructure.
- [x] 3.3 RED then verify responsive tablet/dialog/focus/keyboard behavior, accessible announcements, and private URL/hash/storage behavior.
- [x] 3.4 Keep D-06 seed extension conditional: first prove existing deterministic data supports coin/assessment behavior; only then consider fixed-ID, service-owned, idempotent, fail-closed seed changes.

## Phase 4: Verification / Acceptance
- [x] 4.1 Add Playwright evidence for authenticated canonical flow: student → XP → coins → **Create/select Assessment** → advantage → duplicate reuse; cover AC-01–AC-17 objectively.
- [x] 4.2 Run migration snapshots, focused tests, `pnpm test`, `pnpm typecheck`, `pnpm build`, and the full client-demo harness; record failures and privacy evidence.
- [x] 4.3 After Verify, answer usability acceptance: first-time comprehension in ~1 minute; core flow stays in workspace without admin complexity; coherence adds no material complexity.
