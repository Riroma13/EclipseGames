# SPEC-0019 — RT, ABSENT, Term Average, and Energy

## Design

**Level C — Sol Design → Terra review → Luna Build → Terra Verify.** Migration, private data, lineage, and the M2→M3 seam justify review. DEC-001/011/016 and shipped SPEC-0018 remain authoritative: RT never mutates XP, behaviour, narrative, coins, or gems.

## Behaviour and scope

RT is `10 | 5 | 0 | ABSENT`; Spanish UI uses `Ausente`. Term average is `sum(10|5|0) / evaluated count`; `ABSENT` is excluded. No evaluated entry yields `average:null`, `energy:null` (“Sin datos”), not Critical. Unrounded-average bands are Critical `[0,3)`, Low `[3,5)`, Stable `[5,6.5)`, High `[6.5,8.5)`, Maximum `[8.5,10]`; display rounding is one decimal only.

Term sessions replay by `started_at, id`. `10` increments streak, `5/0` reset, and `ABSENT` does nothing. Each fourth consecutive `10` creates one RT-owned Emerald entitlement and resets streak. Only an owned active session accepts create/replacement; ending freezes its rows. Omitted bulk students remain unchanged and never imply `ABSENT`; deletion is unsupported.

**In:** private bulk correction, summaries, Energy/streak, the durable revisioned eligibility seam described below, migration, API/UI, tests, and proof that M2 performs zero currency writes. **Out:** `NOT_EVALUATED` conversion, attendance, post-close correction, all M3 gem-ledger writes and `GRANT`/`REVOKE`/`REINSTATE` action atomicity, projection, export, rubric/close, rankings, behaviour, and narrative. The future M3 Design owns those ledger actions and their transactional proof.

## Ownership, data, and integrity

| Decision | Contract and rationale |
|---|---|
| Session authority | Extend `getOwnedRealClassSessionContext` to return verified `{id, ownerTeacherId, academicYearId, groupId, termId, endedAt}`. RT never accepts client lineage. |
| Frozen roster | First mutation snapshots every active group student and calls `lockStudentGroupCorrection` in the same `BEGIN IMMEDIATE`. Later writes use that roster; archive preserves history. |
| Derived state | Entries are facts; average, Energy, streak, and entitlement activity use full ordered term replay. No mutable aggregate. |
| M3 seam | M2 owns only durable revisioned eligibility, discovery, stable source identity, consumption/grant linkage representation, and CAS consumption. Actual gem-ledger actions and their atomic orchestration are explicitly deferred to the future M3 Design; no generic reward engine or dual-write enters M2. |

Migration `0012_rt_absent_term_energy` adds Drizzle declarations and:

| Table/change | Enforced invariant |
|---|---|
| Existing tables | Unique session `(id,owner,year,group,term)` and student `(id,group)` parent keys. |
| `real_class_session_rt_roster` | PK `(session_id,student_id)`; server-copied owner/year/group/term; composite FKs to the session and student group. |
| `rt_entries` | UUID, timestamps, value CHECK, unique session/student, composite roster FK, and unique `(id,student_id,term_id)` for entitlement lineage. |
| `rt_requests` | Unique `(owner_teacher_id,idempotency_key)`, operation, session, canonical fingerprint. |
| `rt_streak_emerald_entitlements` | Stable ID plus `(source_entry_id,student_id,term_id)` composite FK; unique immutable source, `active`, `revision`, and nullable immutable first-consumption `{consumer_id, grant_id, consumed_revision, consumed_at}` linkage. Initial revision is 1; replay increments it only when active state changes, never deletes, and never clears consumption. A changed fourth-entry source deactivates the old identity and creates/reuses the entitlement for the new unique source. |

Writes/replay use one `BEGIN IMMEDIATE`; session end and roster correction share its serialization. Foreign keys are enabled; malformed lineage and partial batches fail atomically.

## API, UI, privacy, and failure boundaries

- `GET /api/v1/real-class-sessions/:sessionId/rt-entries` returns snapshotted student IDs and current private entries.
- `POST /api/v1/real-class-sessions/:sessionId/rt-entries` accepts `{ entries: [{ studentId, value }] }` plus UUID-v4 `Idempotency-Key`; create/update is `201`, exact replay is `200` without reapplying, and changed reuse is `409`. Fingerprint canonicalizes operation, session, and student-ID-sorted entries.
- `GET /api/v1/groups/:groupId/rt-summaries?academicYearId=&termId=` verifies owned lineage and returns roster-ordered `RtTermSummaryDto { studentId, termId, average, energy, streak }`; archived history remains readable.

The private workspace adds a compact `10/5/0/Ausente` roster grid, dirty-row save, pending-key retry, correction feedback, and term summaries. Closed sessions are read-only; no comments or confirmations.

Authentication failure is `401`; absent/non-owned lineage `404`; malformed, duplicate, empty, or non-roster input `422`; closed/archived writes, races, and replay mismatch `409`. Logs omit names, RT values, and bodies. RT stays absent from `TeacherStudentDto`, projection DTOs/routes, and `toProjectionStudentDto`; M8 alone may allowlist qualitative Energy. C-01 still blocks real-data production.

`RtStreakEmeraldEntitlementPort` has no active-only read. Every method accepts a caller-supplied SQLite transaction so a future M3 implementation can compose the seam with its own ledger transaction, and every read exposes the same revisioned snapshot:

```ts
type RtStreakEmeraldEntitlementState = {
  id: string; sourceKey: `RT_STREAK:${string}`; sourceEntryId: string;
  studentId: string; termId: string; active: boolean; revision: number;
  consumption: null | { consumerId: string; grantId: string; consumedRevision: number; consumedAt: string };
};
listForReconciliation(studentId, termId, tx): RtStreakEmeraldEntitlementState[];
getForReconciliation(entitlementId, tx): RtStreakEmeraldEntitlementState | null;
consumeActive(entitlementId, expectedRevision, consumerId, grantId, tx): RtStreakEmeraldEntitlementState;
```

The list includes active and inactive, consumed and unconsumed rows, ordered by stable ID; `sourceKey` is immutable and globally unique. `consumeActive` compare-and-sets only an active, unconsumed matching revision and stores the caller's preallocated consumer/grant linkage without writing currency. Later M2 correction deactivates an invalidated entitlement or reactivates the same entitlement when that stable source becomes eligible again; each active-state change increments `revision`, remains discoverable, and never clears first-consumption linkage.

Actual Emerald `GRANT`, `REVOKE`, and `REINSTATE` ledger actions, action uniqueness, crash replay, and cross-ledger/seam atomicity are **not M2 Build responsibilities**. The future M3 Design must define and prove its own atomic grant/revoke/reinstate transaction using this seam, including rollback and idempotency behavior. M2 never calls M3 and writes no currency.

## Tests and acceptance

TDD covers average/null/bands/rounding, ABSENT, and streak replay. SQLite proves 0011→0012 preservation, FKs, snapshot/lock races, ordering ties, atomic subsets, correction/finalization, and idempotency. Every M2 mutation test also proves the existing `coin_ledger` is unchanged; schema/migration inspection proves M2 introduces no gem currency table or write path. Port contract tests prove active/inactive and consumed/unconsumed discovery, immutable stable source and first-consumption linkage, semantic revision increments, CAS success and stale/conflicting-consume rejection, consumed-active → inactive → active correction discovery, and rollback of seam mutations on transaction failure. They do not simulate or claim proof of M3 ledger actions. Fastify proves ownership/status/privacy and archived reads; Playwright proves bulk, `Ausente`, subsets, retry, correction, close lock, and empty-term UI.

- [ ] Canonical RT, average, Energy, and streak results are deterministic by term.
- [ ] Only active owned sessions mutate; roster lineage and retries are atomic and enforceable.
- [ ] Teacher workflow meets deliberate bulk/correction behaviour without projection leakage.
- [ ] The M2 seam durably exposes every active or inactive entitlement revision, immutable stable source identity, immutable first-consumption/grant linkage, and CAS consumption semantics across correction deactivate/reactivate cycles; M2 writes zero currency. The future M3 Design, not this Build, must define and prove atomic `GRANT`/`REVOKE`/`REINSTATE` ledger transactions using the seam.

## Rollout, files, and simplicity

Deploy migration before API/UI; no flag, seed, backfill, conversion, or reverse DDL. Backout disables RT and restores a verified pre-migration backup. Create `apps/api/src/rt/*`, migration/tests; modify schema/migrations/server, calendar/roster seams, contracts, workspace UI/API/styles, and E2E only. **Threat matrix:** N/A—no routing, shell, subprocess, VCS, executable, or process boundary. **Simplicity Check:** one RT module, four tables, existing locks/transactions, pure replay; no dependency, scheduler, event bus, reward engine, setting, or projection work.
