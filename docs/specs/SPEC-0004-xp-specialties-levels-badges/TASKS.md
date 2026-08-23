# SPEC-0004 Tasks — XP, Specialties, Annual Levels, and Badges

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,300 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | No — internal work units only |
| Suggested split | Four independently verifiable work units/commits on the current SPEC branch |
| Delivery strategy | auto-chain (informational only) |
| Chain strategy | pending — no PR/branch topology |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

### Internal Work Units

| Unit | Goal | Focused verification | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Domain, schema, migration | `pnpm vitest packages/domain/src/xp apps/api/src/db` | N/A: persistence/domain unit | XP domain files, migration, schema |
| 2 | Private API and seams | `pnpm vitest apps/api/src/xp apps/api/src/roster` | Fastify injection: auth/404/409/zero-row | API XP files, contracts, roster adapter |
| 3 | Workspace reconciliation | `pnpm vitest apps/web/src/workspace` | N/A: browser boundary is Unit 4 | Workspace XP files/state/styles |
| 4 | End-to-end/privacy proof | `pnpm exec playwright test <SPEC-0004 spec>` | Authenticated class-sized flow | Focused fixtures/spec only |

## Phase 1: Domain and Persistence (RED → GREEN)

- [x] 1.1 RED/GREEN `packages/domain/src/xp/{rules,levels,badges}.ts` and tests: enums, mappings, flat event-time bonus, base preservation, thresholds/L8, active evidence, specialty reassignment, exactly-three badge state.
- [x] 1.2 RED/GREEN `apps/api/drizzle/0004_xp_specialties_levels_badges.sql`, `apps/api/src/db/{schema,migrations}.ts`: five tables, FKs/RESTRICT, checks, indexes, unique one-GRANT constraint, ordering/repeatability/fail-closed/rollback tests.
- [x] 1.3 RED `apps/api/src/xp/repository.test.ts`: write failing transaction tests for immutable events, target-only reversal join, archive blocking, active aggregates, rollback, idempotency recovery, and GRANT/REVOKE/REINSTATE ordering.
- [x] 1.4 GREEN `apps/api/src/xp/repository.ts`: implement the repository transaction behavior from 1.3, including multi-threshold crossing; run the repository tests before API integration.

## Phase 2: Private API and Cross-Domain Contracts (RED → GREEN)

- [x] 2.1 RED/GREEN `apps/api/src/roster/service.ts`: export only the owned context adapter; test ownership/archive semantics and correction lock without roster-table/identity changes.
- [x] 2.2 RED `packages/{domain,contracts}/src/index.ts` and `apps/api/src/xp/{mapper,bonus-eligibility,level-grant-transition-port}.test.ts`: contracts, DTO mapping, Zod/header validation, cursor, typed errors, and private-field boundaries.
- [x] 2.3 GREEN `packages/{domain,contracts}/src/index.ts` and `apps/api/src/xp/{mapper,bonus-eligibility,level-grant-transition-port}.ts`: implement the independently verifiable contracts and mapper/validation seams.
- [x] 2.4 RED/GREEN `apps/api/src/xp/level-grant-transition-port.test.ts`: test only the XP transition-port seam and SPEC-0005 replay contract—ordered transitions, unique source replay, crash retry, GRANT consumption/compensation, and REINSTATE; do not implement SPEC-0005 ledger internals.
- [x] 2.5 RED `apps/api/src/xp/{service,routes}.test.ts`: define failing private service/route tests for ownership-as-404, safe 500, replay 200/201/409/422, cursor reads, bounded zero-row ordering, and no N+1.
- [x] 2.6 GREEN `apps/api/src/xp/{service,routes}.ts`: implement service/routes and group-summary integration against the repository and contracts; no repository implementation belongs here.
- [x] 2.7 RED/GREEN privacy tests proving no `TeacherStudentDto`, projection/public route, client filter, comments, or exact evidence leakage; preserve C-01 as production gate.

## Phase 3: Workspace Integration (RED → GREEN)

- [x] 3.1 RED/GREEN `apps/web/src/workspace/{workspace-api,WorkspaceApp,StudentPanel,FastActionShell,workspace-state}.tsx` and styles: explicit Register XP action, category/value flow, optional note, pending/double-submit, authoritative summary/group reconciliation.
- [x] 3.2 RED tests first, then GREEN implementation/integration for feedback/undo: base/bonus/effective text, 10-second capability, fresh reversal key, stale/expired/invalid undo, timeout retry, failure retention, and context-change abort/invalidation.

## Phase 4: Verification, Rollout, and Recovery

- [x] 4.1 RED Playwright scenarios first, then GREEN browser integration: authenticated register/correct/level/badge flow, keyboard/touch, retry/timeout, historical read-only, session expiry clearing, privacy negatives, and ~30-student single bounded summary/no per-card requests.
- [x] 4.2 Apply/Verify conditions: check AC-01–AC-14 traceability, migration-before-startup rollout, forward-only rollback/no-history-deletion, C-01 production privacy/recoverability gate, and SPEC-0005 transition-ledger/cursor reconciliation and replay condition; do not treat these as Tasks Review work.
