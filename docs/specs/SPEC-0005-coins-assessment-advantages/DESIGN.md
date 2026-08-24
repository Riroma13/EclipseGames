# SPEC-0005 — Coins and Assessment Advantages
## Targeted Design Refinement

**Status:** Complete / archived | **Depends on:** archived SPEC-0004

## 1. Scope and preserved decisions

This refinement makes the private coin ledger's allocation/correction lifecycle executable. It preserves full deterministic reconciliation without a cursor; SPEC-0004's single unlock identity, at-most-one `GRANT`, immutable `GRANT|REVOKE|REINSTATE`; derived context ownership; the two fixed rewards (cost 2/3); four manual +1 sources; private API; and one-branch delivery. Coins never affect XP, RT, rubric, or grade. No generic engine, projection, dependency, or future-SPEC work.

## 2. Allocation model and eligibility

`coin_spend_allocations` contains only `redemption_id FK RESTRICT`, `grant_ledger_entry_id FK RESTRICT`, nullable `released_at`, and `release_reason='REDEMPTION_REVERSED'`. It has `UNIQUE(redemption_id, grant_ledger_entry_id)`, `UNIQUE(grant_ledger_entry_id) WHERE released_at IS NULL`, and indexes in both resolution directions. Released rows are immutable evidence and no longer consume a grant. The transaction asserts an active redemption has exactly `reward.cost` active allocations; no cross-domain accounting trigger.

An eligible unit is currently unallocated, active `+1`: a `LEVEL_ENTITLEMENT` representation from `GRANT` or `REINSTATE`, an allow-listed manual grant (`PERSONAL_IMPROVEMENT`, `EXCEPTIONAL_FRENCH`, `EXCEPTIONAL_COLLABORATION`, `SPECIAL_CHALLENGE`), or future explicit +1 source. It has no direct compensation. Debits, refunds, corrections, compensations, and other non-source entries are ineligible.

`coin_ledger` remains append-only signed evidence, with balance `SUM(amount)` per student/year and non-negative mutations. `corrects_ledger_id UNIQUE` creates finite chains: manual +1 → one -1 correction; active entitlement representation → REVOKE -1; REVOKE → REINSTATE +1 `LEVEL_ENTITLEMENT`. REINSTATE is one new current spendable representation, not another GRANT; it neither reopens historical redemptions nor reuses released allocations. A refund only cancels its exact debit and is never a source.

## 3. Transactions and correction predicates

`CoinEntitlementReconciler` keeps settled atomic full ordered replay (local `afterSequence=0`, page 100); `source_transition_id UNIQUE` makes retry safe. After reconciliation, settled validation/idempotency/balance checks, redemption transaction is: insert redemption; append exact debit; select exactly cost eligible grants by `(created_at,id)`; insert allocations; assert count; commit. Sufficient balance but insufficient eligible grants is invariant failure: roll back all work and return safe `500`; never create an unallocated debit. Ordering is not product behaviour.

Normal reversal resolves/idempotently checks redemption; a new already-reversed request fails; then appends one cost-sized refund, records approved reversal fields, releases all active allocations, and commits. `advantage_redemptions.reversal_ledger_id UNIQUE` plus partial unique `coin_ledger(redemption_id) WHERE source='REDEMPTION_REFUND'` prove exactly-one refund. No reversal-of-reversal.

Revoking an unallocated grant appends its approved -1 only if balance stays non-negative. For an allocated grant, atomically resolve its redemption, reverse it once, release all allocations, then append -1. A second grant from that redemption is now unallocated, so a multi-revocation pass refunds once and compensates each grant normally; never partially rewrite a redemption.

Allowed operations are finite: manual +1 corrects once; entitlement changes only through SPEC-0004 transitions; redemption reverses once; refund cannot reverse; compensation has no generic correction; arbitrary negative adjustment and generic ledger-correction endpoints do not exist. A later manual +1 is a new request.

**Proof:** A+B fund cost 2. Revoking A refunds +2, releases A/B, then adds A's -1: B remains eligible/unallocated, balance is 1, and later spending can allocate B—not the refund.

## 4. Contracts and affected implementation

`0005_coins_assessment_advantages.sql` and Drizzle mirror the FKs/partial uniques above. Existing Fastify/Zod/cookie/idempotency, ownership-as-404, context/archive, and `{code,message,requestId}` safe errors remain.

```ts
type CoinSummaryDto = { studentId: string; academicYearId: string; balance: number };
type CoinLedgerEntryDto = { id: string; amount: number; source: string; createdAt: string; correctionOfId: string | null };
type CoinRewardDto = { id: string; name: string; cost: 2 | 3; type: 'ASSESSMENT_ADVANTAGE' };
type AssessmentContextDto = { id: string; groupId: string; name: string; archivedAt: string | null };
type AdvantageRedemptionDto = { id: string; studentId: string; assessmentContextId: string; rewardId: string; cost: 2 | 3; createdAt: string; reversedAt: string | null };
type AutomaticReversalDto = { redemptionId: string; rewardId: string; cost: 2 | 3; trigger: 'ENTITLEMENT_REVOKED'; refundLedgerEntryId: string; reversedAt: string };
```

Allocation internals never enter DTOs or projection. Working set remains `apps/api/drizzle/0005_coins_assessment_advantages.sql`, `apps/api/src/coins/{repository,service,routes,mapper,entitlement-reconciler}.ts`, DB schema/migrations, XP port/roster seams, contracts, and focused API/workspace/E2E tests.

## 5. Acceptance evidence and rollout

| AC | RED-first deterministic evidence |
|---|---|
| AC-06 | Cost-2 uses two distinct +1 grants; normal reversal refunds once/releases all; surviving grants re-spend; refund cannot allocate. |
| AC-11 | One spent entitlement revoke reverses whole redemption; two spent entitlements revoked in one pass produce one refund; duplicate reversal cannot refund twice; released allocation does not block future spending. |
| AC-13 | REINSTATE yields exactly one spendable entitlement without reopening old redemption; balance/allocation mismatch rolls back to safe `500`; generic correction/deduction is impossible. SQLite proves FKs/partial uniques; domain, Fastify, workspace, and Playwright cover settled AC-01–12. |

No migration runs now; later use one reviewed forward migration, no flag/backfill. Threat matrix: N/A — no shell, subprocess, VCS/PR automation, executable classification, or process integration. **Simplicity Check:** allocations answer only consumed-grant revocation; fixed sources/costs avoid an accounting engine. C-01 remains production-only.

**Lifecycle:** Archived after Apply and Verify completion. The next repository-native step is the SPEC-0005 Health Report.
