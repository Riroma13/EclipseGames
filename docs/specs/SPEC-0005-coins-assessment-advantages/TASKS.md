# Tasks: Coins and Assessment Advantages

Approved Design: `APPROVED WITH CONDITIONS` (C-02, C-03, C-04 are mandatory).

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,300 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | One branch; internal work units only, not PR slices |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

`exception-ok` is maintainer-approved for this run; do not ask delivery, size, or branch questions.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Domain/contracts | Internal only | `pnpm test --filter domain` | N/A: pure rules | domain/contracts files |
| 2 | Persistence/reconciliation | Internal only | `pnpm test --filter api -- coin` | N/A: SQLite integration | migration, schema, coin modules |
| 3 | API/workspace/evidence | Internal only | `pnpm test && pnpm test:e2e` | Playwright teacher flow | routes, workspace, tests |

## Phase 1: Domain Rules and Contracts

- [x] 1.1 RED: add `packages/domain/test/coins.test.ts` for fixed costs, allow-listed +1 sources, non-negative balances, one advantage/context, finite correction chains, and impossible arbitrary negatives; then implement `packages/domain/src/coins/rules.ts`.
- [x] 1.2 RED: add contract parsing cases, then extend `packages/contracts/src/index.ts` with the named coin, reward, context, redemption, reversal, and safe-error DTOs; keep allocation internals private.

## Phase 2: SQLite Foundation

- [x] 2.1 RED: add `apps/api/test/integration/coins-schema.test.ts` that explicitly runs `PRAGMA foreign_keys=ON` (C-04), checks FK RESTRICT and partial uniques, rejects archive writes, and proves rollback leaves zero mutation.
- [x] 2.2 Add `apps/api/drizzle/0005_coins_assessment_advantages.sql`, matching tables/indexes/checks to `apps/api/src/db/schema.ts`; extend `apps/api/src/db/migrations.ts` and `src/services/transactions.ts` only for reviewed transaction support.

## Phase 3: SPEC-0004 Entitlement Reconciliation

- [x] 3.1 RED: test repeated GRANT/REVOKE/REINSTATE and exact allocation-triggering REVOKE replay (C-02): no duplicate refund/compensation, no active-allocation reuse, and identical final state; also prove unique source identity, no durable cursor, and pre-archive entitlement preservation.
- [x] 3.2 Implement `apps/api/src/coins/entitlement-reconciler.ts` using full ordered replay (`afterSequence=0`, page 100), plus the explicit SPEC-0004 XP/roster port seam; REINSTATE creates exactly one current entitlement.

## Phase 4: Ledger and Allocation Lifecycle

- [x] 4.1 RED: test cost-2 and cost-3 exact active allocation counts (C-03: exactly 2 and exactly 3 distinct grants), normal reversal, spent-grant revoke, two consumed grants/one redemption, one exact refund, surviving-grant re-spend, refund ineligibility, duplicate reversal, insufficient-funds zero mutation, and rollback-before-commit.
- [x] 4.2 Implement append-only ledger/allocation behavior in `apps/api/src/coins/repository.ts` and `service.ts`: deterministic `(created_at,id)` selection, exact active-count assertion, release/reallocation, finite corrections, whole-redemption reversal, and no generic correction endpoint.

## Phase 5: Contexts and Fixed Rewards

- [x] 5.1 RED: test owned/unowned and archived assessment contexts, fixed costs 2/3, one advantage per context, second advantage without debit, and archive writes rejected.
- [x] 5.2 Implement context/reward/redemption service in `apps/api/src/coins/service.ts`, preserving derived ownership, two fixed rewards, idempotent debit/refund constraints, and no grade storage.

## Phase 6: Authenticated API

- [x] 6.1 RED: test authenticated Fastify/Zod routes for ownership-as-404, safe `{code,message,requestId}` errors, same-payload idempotency replay, changed-payload `409`, and forbidden negative/general ledger operations.
- [x] 6.2 Add `apps/api/src/coins/routes.ts` and `mapper.ts`; wire authenticated routes in `apps/api/src/server.ts` with contracts and existing cookie/idempotency patterns.

## Phase 7: Teacher Workspace

- [x] 7.1 RED: extend `apps/web/src/workspace/workspace-api.test.ts` and `workspace-state.test.ts` for private balance, reward selection, redemption/reversal feedback, safe failures, and fast no-grade presentation.
- [x] 7.2 Integrate `workspace-api.ts`, `workspace-state.ts`, `StudentPanel.tsx`, and `FastActionShell.tsx`; do not expose allocation internals or implement SPEC-0006 streak behavior.

## Phase 8: Regression and Runtime Evidence

- [x] 8.1 Add deterministic domain, SQLite, API, privacy, and workspace regression/integration coverage mapping AC-01–13, with explicit C-02/C-03/C-04 assertions.
- [x] 8.2 Add Playwright evidence for teacher redemption, exact cost allocation, reversal, replay safety, and safe error UX; verify no XP/RT/rubric/grade mutation.

## Phase 9: Cleanup and Lifecycle Evidence

- [x] 9.1 Document the fixed-source seam for future SPEC-0006 only, migration/rollback notes, and C-01 production-only status; remove temporary test fixtures without adding workers, queues, buses, engines, dashboards, or dependencies.
