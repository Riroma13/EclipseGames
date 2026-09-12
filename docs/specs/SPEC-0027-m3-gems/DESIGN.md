# SPEC-0027 - M3 Gems and Advantages

## Scope and ownership

**Level C.** Migration, private student history, currency lineage, and XP/RT
cross-domain seams justify required separate Terra review. The maintainer has
resolved the former XP authority blocker: L8 is permanently the maximum level,
while annual XP continues accumulating above 175. A fresh
`sdd-lite-review-terra` must review this completed Design before Luna Build
resumes;
blockers return to Sol. The approved route is then Luna Build and Terra Verify. M3 adds
Emerald, Ruby, and Diamond as the canonical replacement
for future coin writes. It does not convert or dual-write coins, alter grades,
XP evidence values, RT values, Classroom projection, M4 behaviour, student accounts,
rankings, or narrative. Its only XP adaptation is the narrow transition seam
and canonical L8 progress/validation contract below: M3 consumes XP-owned facts
but does not add levels. Existing React/Vite, Fastify, SQLite/Drizzle,
cookie-session, server-DTO, Vitest, and Playwright boundaries remain in force.

This revision closes the private-UI reload blocker with one narrow read-only
contract for the selected student, year, and assessment. Mutation responses are
not browser persistence: after reload, the server remains the sole authority for
the reward/redemption IDs and finalized states that govern correction, spend,
and reversal controls. This material Level C API/privacy amendment requires a
fresh separate Terra review before the remaining UI Build resumes.

Coins have a strict no-write rule after deployment. Coin mutation routes,
mutation UI, coin seed writes, and the coin reconciler call path are removed;
legacy `coin_ledger`, catalogue, and history remain queryable only as labelled
**Historial de monedas (solo lectura)**. M3 does not modify projection
mapper/repository/routes/fixtures/assertions and does not claim gem projection.
Legacy coin projection remains the existing historical behaviour until M8,
which owns the canonical Classroom projection change. SPEC-0017, as clarified
by the maintainer's permanent-L8 decision here, and SPEC-0019 remain
authoritative, including all previously resolved lineage, correction,
ownership, preflight, rollback, and projection boundaries below.

## Retained legacy coin contract

Legacy coin tables are immutable evidence after `0013_gems`: no application,
seed, reconciliation, API, or UI path may insert, update, delete, debit, refund,
allocate, release, or compensate `coin_ledger`, `coin_rewards`,
`advantage_redemptions`, or `coin_spend_allocations`. These existing
authenticated reads and DTO shapes remain:

| Route | Exact read-only response |
|---|---|
| `GET /api/v1/coin-rewards` | `CoinRewardDto[] {id,name,cost:2|3,type:'ASSESSMENT_ADVANTAGE'}` from the two fixed legacy catalogue rows. |
| `GET /api/v1/students/:studentId/coins` | `CoinSummaryDto {studentId,academicYearId,balance}` for the owned student's year, including archived history. |
| `GET /api/v1/students/:studentId/coin-ledger?academicYearId=` | Existing ordered `CoinLedgerEntryDto[] {id,amount,source,createdAt,correctionOfId}`; an owned student with a different year selector returns `[]`. |

All return `401` without a session. The two student reads return `404` for
absent/non-owned lineage and `422` for malformed UUID/query input. None exposes names, assessment
details, request keys/fingerprints, allocations, or another teacher's records.
`packages/contracts` retains the coin read DTOs required by these routes and
client reads; mutation-only coin schemas/types are removed. Assessment-context
GET/POST/PATCH routes remain shared, teacher-owned infrastructure and are not
disabled as coin mutations.

`POST /api/v1/students/:studentId/coin-grants` and
`POST /api/v1/coin-grants/:grantId/reversal` are unregistered and return
Fastify's ordinary `404`, regardless of body or idempotency header, with every
legacy table unchanged. The existing advantage URLs become gem-owned: an old
coin reward ID sent to `POST /api/v1/students/:studentId/advantages` is `404`,
and an old coin redemption ID sent to its reversal URL is `404`; neither falls
back to coin services. No `405`, `410`, compatibility mutation, trigger, or
hidden dual-write route is added.

The private student panel replaces `CoinActions` with gem actions plus a
separate **Historial de monedas (solo lectura)** section, also available for an
owned archived/historical student. It reads the three contracts above and
shows **Saldo histórico**, **Catálogo histórico de ventajas**, and **No se
pueden otorgar, gastar, corregir ni revertir monedas.** It has no coin mutation
buttons or forms. States are **Cargando historial de monedas…**, **Sin
movimientos históricos**, **Sin ventajas históricas**, and **No se pudo cargar
el historial. Reintentar**. Gem failure does not erase loaded legacy history;
legacy-read failure does not disable gem actions.

Fresh demo seed removes coin planning, collision preflight, writes, return
values, and console claims; it seeds only fixed gem catalogue rows. Existing
databases retain coin rows untouched. Delete/disconnect the coin entitlement
reconciler and every call/import; XP and RT reconciliation write only gems. The
remaining coin repository/service/mapper surface is read-only and exports no
mutation helper.

## Ledger and lineage

`gem_ledger` is append-only and unitized: every amount is exactly `+1` or `-1`.
Balances are the sum for `(student, academic year, currency)` and every completed
operation leaves all three balances non-negative. Source-state lineage and
redemption lineage are separate linear chains. `correction_of_id` is the
immediate predecessor only within one chain; `gem_spend_allocations` is the sole
link from a spend unit to the positive source unit that funded it:

```text
source:     +1 GRANT -> -1 REVOKE/CORRECTION -> +1 REINSTATE
redemption: -1 SPEND -> +1 SPEND_REVERSAL
                   allocation -> funded source positive
```

`UNIQUE(correction_of_id)` permits at most one direct descendant. The service
requires equal student, year, currency, `source_kind`, `source_family_id`, and
`unit_index` between predecessor and successor. A spend deliberately has no
`correction_of_id`, so it never occupies the funded grant's source chain.

### Allowed predecessor and source-family matrix

No transition outside this complete matrix is valid. “Current” means the unique
tip of the named `(source_kind, source_family_id, unit_index)` chain: a row with
no successor. Every successor copies the predecessor's student, year, currency,
owner, source kind, family, and unit; its `correction_of_id` names that tip.
Every root has `correction_of_id = NULL`. The service validates these rules and
the exact amount/kind pairing before insertion; the database CHECKs are a second
boundary, not a substitute:

| `movement_kind` | Amount | Allowed predecessor | Allowed `source_kind` | Required family rule |
|---|---:|---|---|---|
| `GRANT` | +1 | none | `XP_TRANSITION`, `RT_REVISION`, `RESULT_REWARD` | Opens one source family/unit; no other root may exist for that family/unit. |
| `REVOKE` | -1 | current `GRANT` or `REINSTATE` | `XP_TRANSITION`, `RT_REVISION` | Same source family/unit; closes its active positive only after every active allocation funded by it has been refunded and released. |
| `REINSTATE` | +1 | current `REVOKE` | `XP_TRANSITION`, `RT_REVISION` | Same source family/unit; creates the new active positive and never reopens an old allocation. |
| `CORRECTION` | -1 | current `GRANT` | `RESULT_REWARD` | Same source family/unit; closes it only after funded redemptions are refunded; terminal because result correction is once-only. |
| `SPEND` | -1 | none | `REDEMPTION` | Opens one redemption family/unit and has exactly one active allocation to a distinct current source positive of the same owner/student/year/currency. It is never a source-chain successor. |
| `SPEND_REVERSAL` | +1 | current `SPEND` | `REDEMPTION` | Same redemption family/unit and unit index; exactly one released allocation links this row to that spend; terminal. |

An XP unlock family is `xp:unlock:<unlock-id>`; an RT family is
`rt:entitlement:<entitlement-id>`; a result family is
`result:reward:<reward-id>`; and a redemption family is
`redemption:<redemption-id>`. The exact ledger `source_id` is the operation
identity: `xp:transition:<transition-id>`,
`rt:entitlement:<entitlement-id>:revision:<revision>:<ACTIVE|INACTIVE>`,
`result:operation:<operation-id>`, `redemption:spend:<redemption-id>`, or
`redemption:reversal:<reversal-operation-id>`. The first three source families
may fund a spend; `REDEMPTION` never may. Each operation uses unit indexes
`1..n`, stable across replay; XP and RT always use unit 1. These values are
coordinator-derived, never client input. The service validates the namespace,
the owning referenced row, and all copied lineage fields. A fundable positive is
a current `GRANT` or `REINSTATE` with no active allocation.
`UNIQUE(source_kind, source_id, unit_index)` identifies an operation unit;
`UNIQUE(correction_of_id)` keeps each chain linear.

All replay fingerprints use one canonical function: SHA-256 over UTF-8 JSON with
the field order stated by this Design, lowercase 64-character hex output, exact
string/number/boolean/null values, and arrays already sorted by the stable IDs
specified here. No generic object serialization, locale ordering, timestamp,
request ordering, random ID, correlation ID, cursor, raw score, source mark, or
secret enters a fingerprint unless a later paragraph explicitly names a stored
ID. On replay the service recomputes the canonical semantic fingerprint from
authoritative rows, then separately validates every stored generated ID and
link. Same identity and fingerprint returns the existing business result; same
request key or semantic identity with a changed fingerprint/link is `409`.

### Atomic revocation of a spent source grant

Before `REVOKE` or `CORRECTION`, the coordinator collects every distinct active
redemption allocated to any source unit being closed, ordered by redemption ID;
target source units and their active allocations are ordered by
`(source_kind,source_family_id,unit_index,funding_movement_id)`. One redemption
funded by several target units appears once.
For each, it validates `ACTIVE`, exactly `cost` unreleased allocations, exactly
one linked `SPEND` per allocation, matching student/year/currency, and no prior
spend reversal. It then atomically:

1. appends one `SPEND_REVERSAL` successor for every spend unit in unit-index
   order, using the stable automatic operation ID
   `source-revocation:<redemption-id>` and ledger source ID
   `redemption:reversal:source-revocation:<redemption-id>`;
2. marks every allocation released with `ENTITLEMENT_REVOKED`, records its exact
   spend-reversal movement, and finalizes the whole redemption as `REVERSED`
   with trigger `SOURCE_REVOKED`;
3. only after all affected redemptions are refunded, appends each requested
   source `REVOKE` or `CORRECTION` in stable family/unit order; and
4. asserts the refunded unit count equals `cost`, every target allocation is
   released exactly once, every target source tip is now closed, and every
   resulting currency balance is a non-negative safe integer before commit.

The entire advantage is reversed because partial payment is invalid. Refunding
all of its spend units before closing the source unit means a zero balance rises
by the full cost before any source debit and cannot become negative. Unaffected
funding grants become eligible for a later new allocation; released allocation
rows and reversed redemptions are immutable and never reused. A teacher-requested
advantage reversal performs steps 1, 2 (with `ADVANTAGE_REVERSED` and trigger
`MANUAL`), and 4 without a source debit. Missing/mismatched linkage, partial
refund, duplicate successor, already-finalized incompatible state, or a negative
postcondition is `409` and rolls back redemption, allocation, ledger, receipt,
cursor, XP, RT, and result-reward changes together. Exact replay validates and
returns the already-finalized business resource without new rows.

An automatic reversal uses the stable `reversal_operation_id` above; a manual
reversal stores its preallocated UUID operation ID and owner-scoped request key.
The fixed-order reversal fingerprint fields are
`{operation:'SPEND_REVERSAL',redemptionId,ownerTeacherId,studentId,
academicYearId,assessmentContextId,currency,cost,trigger,reason,
allocations:[{fundingMovementId,spendMovementId,unitIndex}]}`. `reason` is null
for `SOURCE_REVOKED`; allocations are in unit-index order. Same identity plus
fingerprint and exact linked rows is inert; changed linkage, trigger, or reason
is `409`.

## Canonical annual-level transition source

The permanent canonical levels are exactly L1=0, L2=10, L3=25, L4=45, L5=70,
L6=100, L7=135, and L8=175. There is no L9, no threshold above 175, and no
formula or extension point from which one may be invented. Annual effective XP
is not capped: every non-reversed event continues contributing after 175 and
the exact total remains derivable from persisted evidence and returned, while the derived level
stays L8. Every derived or accepted XP total must be a finite, non-negative safe
integer (`0..Number.MAX_SAFE_INTEGER`, exactly `9007199254740991`); fractional,
negative, `NaN`/infinite, unsafe, SQLite-to-JavaScript precision-losing, or
overflowing arithmetic fails with `422` before a request write and with `409`
during stored-state replay/startup reconciliation, atomically.

One shared XP-owned threshold/validation source must drive domain calculations,
repository individual/group summaries, DTO mapping, and transition derivation.
The summary progress contract is the discriminated union
`{isMaxLevel:false,progressPercent:number,nextLevel:2|3|4|5|6|7|8,xpToNextLevel:number}`
or `{isMaxLevel:true,progressPercent:100,nextLevel:null,xpToNextLevel:null}`.
Below L8, `nextLevel` is the next canonical value, `xpToNextLevel` is its
threshold minus the total, and `progressPercent` is integer floor of progress
within the current level interval, clamped to 0-100. At and above 175 the second
MAX_LEVEL variant is exact.
No API or UI may synthesize a future threshold. M3 changes no XP event request,
award value, badge, rubric, route URL, projection DTO, or teacher action.

For every `(studentId, academicYearId, level)` with `level` in L2-L8, XP
continues to own exactly one unlock identity under the existing unique key. Its immutable UUID `id` is
allocated only on first crossing; each immutable transition has its own UUID
`id` and the next global integer `sequence`. A source operation evaluates every
threshold strictly between `beforeTotal` and `afterTotal`: upward levels in
ascending level order, downward levels in descending level order. First crossing
emits `GRANT`; falling below emits `REVOKE`; regaining emits `REINSTATE` on that
same unlock. The IDs returned for an XP create/reverse are exactly the rows
appended by that source operation, ordered by ascending `sequence`; exact
idempotent replay resolves those same IDs and never derives a second unlock or
transition. XP added while both totals are at least 175 emits no transition and
no Emerald. A correction from at least 175 to below 175 emits the L8 `REVOKE`;
a later valid recrossing of 175 emits `REINSTATE` through that same L8 unlock and
linear gem lineage. It never creates L9.

The XP adapter also owns a one-time `completeAuthoritativeLevelTransitions(db)`
operation used before M3 gem catch-up. Its exact result is
`{throughSequence,appendedTransitions}`: `throughSequence` is the non-negative
safe-integer maximum transition sequence visible after completion, or zero when
the table is empty; `appendedTransitions` is exactly the `{id,sequence}` rows
created by this invocation in ascending sequence order. An inert rerun returns
the same `throughSequence` and an empty list. A non-empty appended list is the
contiguous suffix from the pre-call maximum plus one through `throughSequence`;
the result never omits, repeats, or returns an already-present row as appended.
The operation replays immutable XP events and reversals per student/year,
derives only missing L2-L8 transitions from the canonical thresholds, and globally
orders the resulting rows by `(occurredAt, ownerTeacherId, academicYearId,
studentId, source-kind EVENT before REVERSAL, source UUID, direction-aware level
order)` before appending them after the existing maximum sequence. It derives
only L2-L8 transitions, including all thresholds crossed by a total that rises
past 175; XP above 175 creates no additional unlock or transition. Transitions
sharing one source use the level ordering above. Existing
L2-L8 unlocks/transitions are verified and never rewritten; coin rows are never
read. The completion and all gem consumption run in one runner-owned immediate
transaction. Exact rerun verifies and is inert. Duplicate/mismatched unlocks,
source lineage, kind/order, unsafe integers, noncontiguous new sequence, or a
partially present derived chain, a result whose suffix or `throughSequence` does
not match the authoritative table, or a precision-losing sequence is `409` and
rolls back XP completion, gem movements, receipts, and cursor together. The
returned appended list is diagnostic/verification output, not the catch-up work
list: startup enumerates the complete authoritative table as specified below so
pre-existing historical rows cannot be skipped. This bounded completion makes
every historical and future L2-L8 transition authoritative and consumable
exactly once without transferring XP ownership to gems.

## Transaction-aware XP and RT orchestration

XP and RT remain the sole owners of their facts, derivation, corrections, and
ports. M3 owns only the synchronous application coordinator
`apps/api/src/gems/source-orchestrator.ts`. `server.ts` constructs it once and
injects it as a required dependency when registering XP and RT routes and when
constructing their mutation services. The route/service signatures do not make
it optional, provide a default, branch around it, or expose a source-only
mutation entry point in production or tests. Focused source-domain tests must
inject a real coordinator against the same in-memory SQLite database; only pure
domain/repository tests may bypass application services. Neither source domain
imports gem repositories. The coordinator consumes the completed canonical XP transition
port and the
SPEC-0019 `RtStreakEmeraldEntitlementPort`; it does not update XP events,
unlocks, RT entries, eligibility, or revision numbers.

The shared transaction runner supplies one explicit, runner-owned token:

```ts
declare const gemSourceTxBrand: unique symbol; // module-private
type GemSourceTx = Readonly<{
  db: Database.Database;
  mode: 'IMMEDIATE';
  correlationId: string;
  [gemSourceTxBrand]: true;
}>;
runImmediateTransaction<T>(db, correlationId, work: (tx: GemSourceTx) => T): T;
interface GemSourceOrchestrator {
  applyXp(tx: GemSourceTx, transitionIds: readonly string[]): void;
  applyRtScope(tx: GemSourceTx, studentId: string, termId: string): void;
  applyRtBaselineEntitlement(
    tx: GemSourceTx,
    expected: RtStreakEmeraldBaselineState,
  ): void;
}
interface CanonicalXpTransitionPort extends XpLevelGrantTransitionPort {
  completeAuthoritativeLevelTransitions(db: Database.Database): Readonly<{
    throughSequence: number;
    appendedTransitions: readonly Readonly<{id: string; sequence: number}>[];
  }>;
}
type RtStreakEmeraldBaselineState = Readonly<
  RtStreakEmeraldEntitlementState & {
    ownerTeacherId: string;
    academicYearId: string;
  }
>;
interface RtStreakEmeraldEntitlementPort {
  listCurrentForBaselineAfter(
    afterEntitlementId: string | null,
    limit: number,
    db: Database.Database,
  ): readonly RtStreakEmeraldBaselineState[];
  getCurrentForBaseline(
    entitlementId: string,
    db: Database.Database,
  ): RtStreakEmeraldBaselineState | null;
  // Existing scope/get/CAS members remain RT-owned and unchanged.
}
```

`runImmediateTransaction` is the token's sole factory. It rejects a nested run
for the same database, invokes the current better-sqlite3 API as
`db.transaction(() => work(token)).immediate()`, and alone commits or rolls
back. A module-private active-token `WeakSet` registers the frozen token only
for the synchronous callback and removes it in `finally`; every gem coordinator
entry asserts membership before doing I/O. This is the runtime ownership proof:
no code reads or depends on `db.inTransaction`, and a forged, nested, retained,
or post-callback token fails closed. Source repositories and the existing XP/RT
ports receive `tx.db`; gem writes additionally require the same active token.
`correlationId` groups diagnostics only, is not unique or an idempotency/source
identity, and is excluded from fingerprints. Live calls use an opaque stable
digest of source operation, owner, and owner-scoped idempotency key; raw keys
and owner IDs are not copied into this value or logs. Startup/manual runs use a
fresh opaque run ID. SQL remains synchronous; no callback or token may escape.

### XP invocation and ordering

The XP repository continues to create/reverse evidence, uses the one canonical
threshold function for summaries and unlock state, and appends transitions, but
returns the exact transition IDs emitted by that operation. `xp.create` and
`xp.reverse` validate only syntax before entering `runImmediateTransaction`.
Ownership, mutable-state, source, and idempotent-replay reads all occur after
`BEGIN IMMEDIATE`; no pre-transaction replay or source lookup may return a
response. Both new and replay paths execute, in order:

1. validate ownership and writable state, then look up the owner-scoped request
   key and compare the XP request fingerprint;
2. create the XP event/reversal and XP-owned transitions, or load the original
   event/reversal and resolve all transitions whose authoritative source column
   names that operation; validate that none is missing, foreign, or additional;
3. resolve its complete L2-L8 transition IDs through the
   transaction-aware XP adapter and call `applyXp(tx, ids)` in ascending
   `sequence`;
4. derive the response summary and commit.

No level crossing means an empty call and no gem movement. `GRANT` appends one
Emerald source root; `REVOKE` first runs the complete spent-source revocation
procedure above, then appends the single negative successor of that unlock's
current positive unit; `REINSTATE` appends its positive successor without
resurrecting a released allocation or reversed redemption. The stream
`xp-level-grant-transitions` starts at cursor zero. Every
new sequence must equal `cursor + 1`; multiple transitions from one XP action
must also be contiguous. For sequence `s <= cursor`, an exact receipt and linked
movement must already exist and are verified without changing the cursor; for
`s > cursor`, `s` must be exactly `cursor + 1`, its movement and receipt are
inserted, then the cursor advances to `s`. A receipt can never exist above the
cursor, the cursor can never exceed the maximum receipted sequence, and every
XP transition sequence `1..cursor` must have exactly one receipt. Each receipt
stores transition ID, sequence, unlock ID, kind, event/reversal source, unique
movement ID, and fingerprint; owner, student, year, and level are re-derived
from its authoritative XP lineage on every application. The cursor row is
updated only after the movement and receipt validate, in the same transaction.

An exact request replay still calls `applyXp` before returning. Its fixed-order
receipt fingerprint is
`{stream,transitionId,sequence,unlockId,kind,sourceEventId,sourceReversalId,
ownerTeacherId,studentId,academicYearId,level,ledgerSourceId,
sourceFamilyId,unitIndex,amount,movementKind,predecessorMovementId}`; nullable
source/predecessor fields are explicit nulls. The receipt stores its unique
`movement_id`; replay validates that exact movement and source-chain tip/history.
A missing transition/unlock/source,
noncontiguous sequence, duplicate sequence with another ID, receipt without its
movement, or any changed stored field/fingerprint is `409`; the source action,
all transitions, gem rows, allocation releases, receipts, and cursor all roll
back. Thus an XP route cannot commit a transition without its required gem
movement, or a gem movement without the XP fact that caused it.

### RT invocation and ordering

`rt.upsertEntries` retains SPEC-0019 ownership. It canonicalizes affected
students by stable ID, writes every submitted entry, then replays every affected
term scope and creates/deactivates/reactivates all RT-owned entitlements. Only
after the complete source set is established, and still inside the one bulk
request's `GemSourceTx`, it calls `applyRtScope` once for every affected student
in that order before inserting `rt_requests`, deriving the response, and
committing. One bulk request may therefore produce any number of revisions
across students and entitlements, all sharing one non-unique `correlationId`.
Exact request replay repeats every affected scope check before returning `200`;
it cannot bypass consistency checking.

The coordinator reads the complete active/inactive, consumed/unconsumed scope
through `RtStreakEmeraldEntitlementPort`, ordered by stable ID. Every revision
has the globally stable receipt operation identity
`rt-revision:<entitlementId>:<revision>`; it is independent of request/batch
shape and is used as the initial grant's `consumerId`. The unique semantic key
remains `(entitlementId, revision)`, and both keys must resolve to the same row.
For each current `(entitlementId, revision, ACTIVE|INACTIVE)` the fixed-order
revision fingerprint is
`{receiptOperationId,entitlementId,sourceKey,sourceEntryId,ownerTeacherId,
studentId,academicYearId,termId,revision,state,consumptionBefore,
movementKind,ledgerSourceId,sourceFamilyId,unitIndex,predecessorMovementId,
consumptionAfter}`. A consumption value is null or
`{consumerId,grantId,consumedRevision}`. The persisted `consumedAt` is excluded
from every fingerprint but must be a valid immutable UTC timestamp and is
compared separately on replay. A prospective first consumption's
`consumptionAfter` is
`{consumerId:receiptOperationId,grantId:preallocatedGrantMovementId,
consumedRevision:revision}`. No request/batch order or correlation enters it.
For a new grant, receipt-operation/grant movement IDs are preallocated before
CAS and the post-CAS authoritative consumption must contain those exact IDs:

- active and unconsumed: preallocate the grant movement UUID; CAS
  `UNCONSUMED -> CONSUMED` at the exact revision with
  `consumerId=receiptOperationId` and `grantId=movement UUID`; reread and verify
  the immutable linkage, append one Emerald `GRANT`, then store its receipt;
- inactive and consumed: require the preceding receipted state to be `ACTIVE`,
  resolve `consumption.grantId` to this entitlement's unit-1 linear chain,
  require its current tip to be `GRANT`/`REINSTATE`, run the complete
  spent-source refund, append `REVOKE`, and store its receipt without changing
  first-consumption linkage;
- active and consumed: require the preceding receipted state to be `INACTIVE`
  and the same chain tip to be its `REVOKE`; append `REINSTATE` and store its
  receipt without changing first-consumption linkage or reopening allocations;
- inactive and unconsumed: require no grant chain and store a null-movement
  receipt; a later active revision performs the CAS/`GRANT` case above.

Receipts are idempotent: finding both stable keys with the same canonical
fingerprint, exact nullable movement, chain state, and consumption linkage is a
no-op, regardless of which transaction first wrote it; its original correlation
and timestamps are not rewritten. Either key resolving to another revision, the
same revision with a different fingerprint, or one key existing without the
other is `409`. Outside the one deployment baseline exception below, revision
`n > 1` is accepted only if revision `n-1` has a receipt and its state is the
opposite state; revision 1 must have no predecessor receipt. A gap, stale snapshot/CAS,
different state, changed immutable source/consumption linkage, missing
grant/predecessor, or receipt/movement disagreement is also `409`. Any conflict
rolls back the complete bulk set: every submitted RT entry, every entitlement
revision/consumption change, request row, gem movement, allocation release, and
receipt for every affected student. Source facts and gem movements therefore
have one commit boundary while the SPEC-0019 seam remains the only M3 write
access to RT consumption linkage.

### Startup and manual reconciliation

Before first M3 traffic, `server.ts` calls exactly one
`runImmediateTransaction`. Inside that same synchronous callback it first calls
`completeAuthoritativeLevelTransitions(tx.db)` and validates its exact result.
It then reads the persisted XP cursor `C`, requires `0 <= C <= throughSequence`,
sets an independent scan position `S = 0`, and repeats:

1. while `S < throughSequence`, call the XP-owned
   `listAfter(S, 100)`; require a non-empty page of at most 100 rows whose first
   sequence is `S + 1`, whose remaining sequences increase by exactly one, and
   whose final sequence is at most `throughSequence`;
2. call `applyXp(tx, page.map(row => row.id))` in that exact order, then require
   the gem cursor to equal `max(C, page.last.sequence)` and set
   `C` to that value and `S` to `page.last.sequence`; and
3. on termination require `S === C === throughSequence` and require
   `listAfter(throughSequence, 1)` to return empty.

Starting `S` at zero is intentional. It enumerates and revalidates every
pre-existing historical transition at or below the initial cursor, then applies
every pre-existing or completion-appended row above it. `applyXp` verifies
receipts/movements without advancing for sequences at or below `C`; the first
unreceipted row must be `C + 1` and each subsequent row remains contiguous.
Therefore neither completion output, page boundaries, a pre-existing cursor,
nor an empty intermediate page can skip a row or conceal a sequence gap. Any
empty/overlapping/out-of-order/gapped page, cursor mismatch, row above the
completion boundary, or non-empty terminal probe is `409`.

Only after XP reaches that exact boundary does startup baseline RT. RT owns the
global enumeration port `listCurrentForBaselineAfter`: with `null` it starts at
the first entitlement; otherwise it returns only IDs lexically greater than the
supplied entitlement ID, ordered by entitlement ID using SQLite binary order,
limited to `1..100`. Across repeated calls it exposes every current entitlement
exactly once, including active/inactive and consumed/unconsumed state, and
returns `[]` only at exhaustion. Each item also carries the authoritative
`ownerTeacherId` and `academicYearId` lineage required by the receipt
fingerprint. The coordinator may not query
`rt_streak_emerald_entitlements`, students, terms, or other RT tables to discover
or enrich baseline work; only the RT port may perform those source joins.
Startup uses pages of 100, rejects a non-increasing, duplicate,
oversized, or cursor-inconsistent page, and for every returned ID invokes
`applyRtBaselineEntitlement(tx, listedSnapshot)` once in that exact global order
before advancing the enumeration cursor to that ID.

`applyRtBaselineEntitlement` rereads that one current snapshot through the
RT-owned `getCurrentForBaseline` port, requires every listed state and lineage
field to match, and applies the ordinary canonical fingerprint, stable
`rt-revision:<entitlementId>:<revision>` identity, movement, receipt, and CAS
rules. The coordinator uses only that RT snapshot and the existing RT-owned CAS
method for source facts; its direct SQL is confined to gem-owned tables. For an
entitlement with no receipt, this is the sole
continuity exception: its current revision may be greater than 1 and startup
records only that revision, without inventing predecessors. Active/unconsumed
performs the exact CAS then `GRANT` and receipt; inactive/unconsumed writes the
null-movement receipt. Any pre-baseline consumption linkage without its exact
existing gem receipt is foreign state and fails `409`; it is never adopted.
An entitlement with any receipt follows normal continuity: an exact current
receipt is verified inertly, or the current revision must be the next opposite
state after the latest receipt. Mixed/partial history fails. The enumeration is
complete only after a page returns empty; a final RT-owned probe after the last
ID must also return empty. After baseline, the next state change is current
revision plus one and has the baseline receipt as predecessor.

XP completion, the full XP scan/catch-up, the full RT enumeration/baseline, and
their final probes are one immediate transaction. A test-only startup seam may
throw after each completed XP page and after each RT receipt; production exposes
no hook. One mandatory test throws after XP completion and full XP catch-up and
after the first of at least two RT entitlement receipts. Relative to a captured
pre-run snapshot it must prove rollback of newly completed XP unlocks and
transitions; every gem movement, spend reversal/allocation release, XP receipt,
RT receipt, and XP cursor change; and every RT CAS/consumption field. The server
must reject readiness and register/serve no routes for that failed attempt. This
is one failure in the same `BEGIN IMMEDIATE`, not cleanup or compensating work.

The baseline completes before route registration/readiness and fails startup
closed on any conflict. Later startup runs execute the same complete scans and
therefore verify/drain historical or interrupted deployment state with the same
receipts and cursor.
Manual reconciliation is an internal operator recovery action after gem writes
have been disabled; it exposes no HTTP/UI endpoint and uses the same coordinator.
Neither startup nor manual reconciliation is the normal consistency mechanism,
repairs changed sources, skips gaps, or compensates a failed live request: every
post-baseline XP/RT mutation must invoke the coordinator synchronously in its own
source transaction.

RT request syntax is the only work allowed before its immediate transaction.
Inside it, the service re-resolves session ownership/state, computes the
student-ID-sorted canonical request fingerprint, performs the replay lookup, and
on both new and exact-replay paths reconciles **all submitted student scopes** in
stable student-ID order before returning. A replay never short-circuits scope
validation. For a new request, all RT entry writes and entitlement revisions are
finished for the complete submitted set before the coordinator applies those
same scopes in stable order; `rt_requests` is inserted only after all receipts
succeed. Any failure rolls back every submitted student's entry, entitlement,
CAS linkage, grant/revoke/reinstate, refund, allocation, receipt, request row,
and balance change—not merely the current student's work.

## Result reward correction

`gem_result_rewards` has exactly one row per
`(student_id, assessment_context_id, academic_year_id)` and stores tier and
state (`ACTIVE`/`REVERSED`), never score. `gem_result_reward_operations` is
append-only with `operation_id`, operation (`GRANT`/`CORRECTION`), request key,
fingerprint, created timestamp, reason (max 500 chars), prior tier, resulting
tier, and movement IDs. A correction is allowed once, marks the single reward
row `REVERSED`, and closes every granted unit with a `CORRECTION`. If any unit
funds an active advantage, all distinct affected redemptions are first reversed
in full by the atomic spent-source procedure; only then are corrections appended
in unit order. It does not replace the row or create a second reward. Its reason
is required and score-free.

The tier is selected from canonical hundredths: `<7` NONE, `7.00-7.99`
Emerald x1, `8.00-8.99` Emerald x2, `9.00-9.99` Ruby x1, `10.00` Diamond x1.
The exact grammar is `^(?:0|[1-9](?:[0-9])?)(?:\.[0-9]{1,2})?$`, range
`0.00..10.00`; whitespace, signs, exponent, leading zero, and excess precision
are rejected. The raw score is transient only and never reaches logs, errors,
metrics, audit, storage, DTOs, or fingerprints. The fixed-order grant
fingerprint is `{operation:'RESULT_GRANT',ownerTeacherId,studentId,
academicYearId,assessmentContextId,tier,currency,units}`. The fixed-order
correction fingerprint is `{operation:'RESULT_CORRECTION',ownerTeacherId,
rewardId,studentId,academicYearId,assessmentContextId,priorTier,
resultingState:'REVERSED',reason,grantMovementIds}` with grant IDs ordered by
unit index. Each operation UUID is preallocated, its ledger source ID is
`result:operation:<operationId>`, and its movement IDs are separately stored and
verified.

For grant: same key/fingerprint replays; different key with the same semantic
fingerprint returns the existing reward; different tier is `409`. For
correction: same key/fingerprint replays; a different key for the same already
applied correction returns the existing operation; a different reason/tier or
second correction is `409`. The invariant after correction is exactly one
reward row in `REVERSED` state and zero active reward units.

Advantage spend uses fixed-order fingerprint
`{operation:'SPEND',ownerTeacherId,studentId,academicYearId,
assessmentContextId,catalogueRewardId,currency,cost,fundingMovementIds}` with
funding IDs in `(created_at,id)` allocation order. The redemption UUID is
preallocated; its unit `source_id` is
`redemption:spend:<redemptionId>`. Exact owner-scoped key replay validates the
same redemption, allocations, spend rows, and fingerprint. A different key for
the already occupied student/context/year returns that existing redemption only
when the semantic fingerprint is identical; any changed catalogue, funding,
cost, currency, owner, or linkage is `409`. Manual and source-triggered reversal
use the reversal fingerprint already defined and never recompute funding from a
new balance.

## Migration `0013_gems`

With `PRAGMA foreign_keys=ON`, one `BEGIN IMMEDIATE` migration after `0012`
retains the existing XP tables unchanged. There is no XP-table rebuild, copy,
rename, broadened check, L9 row, or threshold migration. Before the first DDL
statement, inside that transaction, preflight requires exactly one migration
marker for every repository migration `0001` through
`0012_rt_absent_term_energy`, no `0013_gems` marker, and no SQLite object whose
name starts `gem_`.

Preflight compares SQLite metadata—not permissive substring presence—against
the exact `0012`-effective XP contract. `PRAGMA table_xinfo`,
`foreign_key_list`, `index_list`, `index_xinfo`, and whitespace/quote-normalized
`sqlite_master.sql` must jointly prove:

- `xp_level_unlocks` has exactly the `0004` columns, nullability, defaults,
  PK, FKs, `active IN (0,1)`, `level BETWEEN 2 AND 8`, unique
  `(student_id,academic_year_id,level)`, and named index
  `idx_xp_unlocks_student_year_active(student_id,academic_year_id,active)`;
- `xp_level_grant_transitions` has exactly the `0004` columns in their original
  order followed by nullable `source_transition_id TEXT`, its original PK/FKs,
  kind/source CHECK, unique sequence, partial unique
  `uq_xp_grant_transition_unlock(unlock_id) WHERE kind='GRANT'`, index
  `idx_xp_grant_transitions_sequence(sequence)`, and the `0005` partial unique
  `uq_xp_grant_transition_source(source_transition_id) WHERE
  source_transition_id IS NOT NULL`; and
- the referenced XP event/reversal tables retain the columns, PK/unique keys,
  FKs, and CHECKs needed by those two tables. Extra/missing/reordered columns,
  changed affinity/nullability/default/FK action, renamed/missing/extra XP
  index, changed indexed-column order/uniqueness/partial predicate, or altered
  CHECK SQL is drift and aborts before DDL.

Data preflight requires `PRAGMA integrity_check` to return exactly `ok` and
`PRAGMA foreign_key_check` to return no rows; all XP IDs and transition
sequences are unique; a non-empty sequence set is exactly contiguous
`1..COUNT(*)`; every unlock is L2-L8 and resolves to a same-student/year first
source event; every transition resolves to one unlock and to exactly the source
shape required by its kind; its event/reversal resolves through the same owner,
student, and year; each unlock has at most one GRANT; and non-null
`source_transition_id` values are unique. The preflight may not require
historically missing valid L2-L8 transitions—that bounded completion belongs to
the startup transaction—but every row already present must be coherent. Any
failure aborts before mutation.

The migration runner's one transaction has these exact injectable stages:
`preflight`; each table in the SQL block below in declaration order; each named
index in declaration order; `catalogue-emerald`, `catalogue-ruby`,
`catalogue-diamond`; `xp-cursor-zero`; `postflight`; and
`migration-marker-before-commit`. The production runner has no failure hook;
tests inject a throw only through an explicit migration-test seam after each
named stage. Every injected failure must roll back to a captured `0012`
snapshot with identical `sqlite_master` rows and complete ordered row values for
XP and all four legacy coin tables, no `gem_*` object, and no `0013` marker.

Postflight repeats `integrity_check`, `foreign_key_check`, and the complete XP
metadata/data comparison, then validates every gem table against the declared
columns, affinity, nullability, defaults, PK/unique/FK/CHECK clauses and every
named index including column order and partial predicate. All gem fact tables
are empty; the catalogue contains exactly the three declared rows; and
`gem_reconciliation_cursors` contains exactly
`('xp-level-grant-transitions',0,<valid UTC timestamp>)`. Only then is the
`0013_gems` marker inserted. Existing XP rows, IDs, timestamps, sequences,
constraints, columns, indexes, `source_transition_id` values, and all coin rows
remain value-for-value/schema-SQL equivalent.

The transaction creates the following (all referenced columns are
indexed unique keys):

```sql
CREATE TABLE gem_ledger (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
 academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
 currency TEXT NOT NULL CHECK(currency IN ('EMERALD','RUBY','DIAMOND')),
 amount INTEGER NOT NULL CHECK(amount IN (-1,1)),
 movement_kind TEXT NOT NULL CHECK(movement_kind IN ('GRANT','REVOKE','REINSTATE','CORRECTION','SPEND','SPEND_REVERSAL')),
 source_kind TEXT NOT NULL CHECK(source_kind IN ('XP_TRANSITION','RT_REVISION','RESULT_REWARD','REDEMPTION')),
 source_id TEXT NOT NULL, source_family_id TEXT NOT NULL,
 unit_index INTEGER NOT NULL CHECK(unit_index >= 1),
 correction_of_id TEXT REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 request_key TEXT, request_fingerprint TEXT, created_at TEXT NOT NULL,
 owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
 UNIQUE(source_kind,source_id,unit_index), UNIQUE(correction_of_id),
 CHECK((movement_kind='GRANT' AND amount=1 AND correction_of_id IS NULL AND source_kind<>'REDEMPTION') OR
       (movement_kind='REVOKE' AND amount=-1 AND correction_of_id IS NOT NULL AND source_kind IN ('XP_TRANSITION','RT_REVISION')) OR
       (movement_kind='REINSTATE' AND amount=1 AND correction_of_id IS NOT NULL AND source_kind IN ('XP_TRANSITION','RT_REVISION')) OR
       (movement_kind='CORRECTION' AND amount=-1 AND correction_of_id IS NOT NULL AND source_kind='RESULT_REWARD') OR
       (movement_kind='SPEND' AND amount=-1 AND correction_of_id IS NULL AND source_kind='REDEMPTION') OR
       (movement_kind='SPEND_REVERSAL' AND amount=1 AND correction_of_id IS NOT NULL AND source_kind='REDEMPTION'))
);
CREATE TABLE gem_reconciliation_cursors (
 stream TEXT PRIMARY KEY, last_sequence INTEGER NOT NULL CHECK(last_sequence >= 0), updated_at TEXT NOT NULL
);
CREATE TABLE gem_xp_transition_receipts (
  transition_id TEXT PRIMARY KEY, sequence INTEGER NOT NULL UNIQUE, unlock_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('GRANT','REVOKE','REINSTATE')),
  source_event_id TEXT REFERENCES xp_evidence_events(id) ON DELETE RESTRICT,
  source_reversal_id TEXT REFERENCES xp_evidence_reversals(id) ON DELETE RESTRICT,
  movement_id TEXT NOT NULL UNIQUE REFERENCES gem_ledger(id) ON DELETE RESTRICT,
  fingerprint TEXT NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY(unlock_id) REFERENCES xp_level_unlocks(id) ON DELETE RESTRICT
);
CREATE TABLE gem_reconciliation_revisions (
 receipt_operation_id TEXT PRIMARY KEY,
 entitlement_id TEXT NOT NULL REFERENCES rt_streak_emerald_entitlements(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK(revision >= 1), state TEXT NOT NULL CHECK(state IN ('ACTIVE','INACTIVE')),
 transaction_correlation_id TEXT NOT NULL,
 movement_id TEXT REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 revision_fingerprint TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(entitlement_id,revision),
 CHECK(receipt_operation_id = 'rt-revision:' || entitlement_id || ':' || revision)
);
CREATE TABLE gem_reward_catalogue (
 id TEXT PRIMARY KEY, currency TEXT NOT NULL CHECK(currency IN ('EMERALD','RUBY','DIAMOND')),
 cost INTEGER NOT NULL CHECK(cost IN (1,2)), UNIQUE(currency),
 CHECK((currency='EMERALD' AND cost=2) OR (currency IN ('RUBY','DIAMOND') AND cost=1))
);
CREATE TABLE gem_result_rewards (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
 assessment_context_id TEXT NOT NULL REFERENCES assessment_contexts(id) ON DELETE RESTRICT,
 academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
 tier TEXT NOT NULL CHECK(tier IN ('NONE','EMERALD_1','EMERALD_2','RUBY_1','DIAMOND_1')),
 state TEXT NOT NULL CHECK(state IN ('ACTIVE','REVERSED')), owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
 created_at TEXT NOT NULL, UNIQUE(student_id,assessment_context_id,academic_year_id)
);
CREATE TABLE gem_result_reward_operations (
 operation_id TEXT PRIMARY KEY, reward_id TEXT NOT NULL REFERENCES gem_result_rewards(id) ON DELETE RESTRICT,
 owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
 operation TEXT NOT NULL CHECK(operation IN ('GRANT','CORRECTION')), request_key TEXT NOT NULL,
 request_fingerprint TEXT NOT NULL, reason TEXT CHECK(reason IS NULL OR length(reason)<=500),
 prior_tier TEXT NOT NULL, resulting_tier TEXT NOT NULL, movement_ids TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(owner_teacher_id,request_key), UNIQUE(reward_id,operation)
);
CREATE TABLE gem_advantage_redemptions (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
 assessment_context_id TEXT NOT NULL REFERENCES assessment_contexts(id) ON DELETE RESTRICT,
 academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
 currency TEXT NOT NULL CHECK(currency IN ('EMERALD','RUBY','DIAMOND')), cost INTEGER NOT NULL CHECK(cost IN (1,2)),
 request_key TEXT NOT NULL, request_fingerprint TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('ACTIVE','REVERSED')),
 owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT, created_at TEXT NOT NULL,
 reversal_operation_id TEXT UNIQUE, reversal_request_key TEXT, reversal_fingerprint TEXT,
 reversal_trigger TEXT CHECK(reversal_trigger IN ('MANUAL','SOURCE_REVOKED')),
 reversal_reason TEXT CHECK(reversal_reason IS NULL OR length(reversal_reason)<=500), reversed_at TEXT,
 UNIQUE(student_id,assessment_context_id,academic_year_id), UNIQUE(owner_teacher_id,request_key),
 UNIQUE(owner_teacher_id,reversal_request_key),
 CHECK((state='ACTIVE' AND reversal_operation_id IS NULL AND reversal_request_key IS NULL AND
        reversal_fingerprint IS NULL AND reversal_trigger IS NULL AND reversal_reason IS NULL AND reversed_at IS NULL) OR
       (state='REVERSED' AND reversal_operation_id IS NOT NULL AND reversal_fingerprint IS NOT NULL AND reversed_at IS NOT NULL AND
        ((reversal_trigger='MANUAL' AND reversal_request_key IS NOT NULL AND reversal_reason IS NOT NULL) OR
         (reversal_trigger='SOURCE_REVOKED' AND reversal_request_key IS NULL AND reversal_reason IS NULL))))
);
CREATE TABLE gem_spend_allocations (
 id TEXT PRIMARY KEY, redemption_id TEXT NOT NULL REFERENCES gem_advantage_redemptions(id) ON DELETE RESTRICT,
 funding_movement_id TEXT NOT NULL REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 spend_movement_id TEXT NOT NULL UNIQUE REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 spend_reversal_movement_id TEXT UNIQUE REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 created_at TEXT NOT NULL, released_at TEXT,
 release_reason TEXT CHECK(release_reason IS NULL OR release_reason IN ('ADVANTAGE_REVERSED','ENTITLEMENT_REVOKED')),
 UNIQUE(redemption_id,funding_movement_id),
 CHECK((released_at IS NULL AND release_reason IS NULL AND spend_reversal_movement_id IS NULL) OR
       (released_at IS NOT NULL AND release_reason IS NOT NULL AND spend_reversal_movement_id IS NOT NULL))
);
INSERT INTO gem_reconciliation_cursors(stream,last_sequence,updated_at)
VALUES ('xp-level-grant-transitions',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
```

Add indexes `idx_gem_ledger_student_year_currency_created(student_id,
academic_year_id,currency,created_at,id)`, `idx_gem_ledger_source(source_kind,
source_id)`, `idx_gem_ledger_family(source_kind,source_family_id,unit_index,
created_at,id)`, `idx_gem_result_rewards_student_year(student_id,academic_year_id)`,
`idx_gem_reconciliation_revisions_correlation(transaction_correlation_id)`,
`idx_gem_spend_allocations_movement(funding_movement_id,released_at)`, and the
partial unique active-allocation index on `funding_movement_id WHERE released_at
IS NULL`. Build implements the exact preflight/postflight and stage seam
above; malformed schema/data, collisions, or failed checks abort before commit.
After the first gem write rollback is forward-only:
preserve history and compensate; no normal Build claim of backup-restore proof.

## API, ownership, and UI

Every route requires the authenticated teacher and derives year/group/context
ownership server-side. `academicYearId` is a query/body selector only after the
server verifies the student belongs to that teacher's group and year.
Existing authenticated XP summary routes retain their URLs, ownership, and
privacy while replacing the nested progress fields with the canonical
`{isMaxLevel,progressPercent,nextLevel,xpToNextLevel}` contract. Individual and
group summaries preserve the uncapped safe annual XP total, report L8 for every
total at or above 175, and expose MAX_LEVEL exactly as defined above. The same
XP-owned source drives both summaries and L2-L8 transitions so they cannot
disagree. Projection routes and DTOs remain untouched.

### Exact gem DTO allowlists

These are closed server-mapped contracts; unknown fields are rejected in
contract tests and never spread from repository rows:

```ts
type GemCurrency = 'EMERALD' | 'RUBY' | 'DIAMOND';
type GemBalancesDto = {
  studentId: string;
  academicYearId: string;
  balances: { EMERALD: number; RUBY: number; DIAMOND: number };
};
type GemLedgerEntryDto = {
  currency: GemCurrency;
  amount: 1 | -1;
  kind: 'GRANT' | 'REVOKE' | 'REINSTATE' | 'CORRECTION' | 'SPEND' | 'SPEND_REVERSAL';
  createdAt: string;
};
type GemLedgerPageDto = {
  studentId: string;
  academicYearId: string;
  entries: GemLedgerEntryDto[];
  nextCursor: string | null;
};
type GemCatalogueItemDto = {
  id: 'emerald-assessment-advantage' | 'ruby-assessment-advantage' | 'diamond-assessment-advantage';
  currency: GemCurrency;
  cost: 1 | 2;
  type: 'ASSESSMENT_ADVANTAGE';
};
type GemActionStateDto = {
  studentId: string;
  academicYearId: string;
  assessmentContextId: string;
  resultReward: null | {
    id: string;
    tier: 'NONE' | 'EMERALD_1' | 'EMERALD_2' | 'RUBY_1' | 'DIAMOND_1';
    state: 'ACTIVE' | 'REVERSED';
  };
  advantageRedemption: null | {
    id: string;
    currency: GemCurrency;
    cost: 1 | 2;
    state: 'ACTIVE' | 'REVERSED';
  };
};
type ApiErrorResponse = {
  code: 'VALIDATION_FAILED' | 'INTERNAL_ERROR' | 'AUTH_INVALID' |
    'AUTH_RATE_LIMITED' | 'AUTH_REQUIRED' | 'ORIGIN_FORBIDDEN' |
    'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT';
  message: string;
  requestId: string;
};
```

Catalogue values are exactly Emerald/2, Ruby/1, and Diamond/1 under the fixed
IDs above, ordered Emerald, Ruby, Diamond. Balances are safe non-negative
integers. Ledger pages are ordered by `(created_at,id)` ascending; `limit`
defaults to 50 and accepts only `1..100`. An omitted `cursor` starts at the
first row; an empty or longer-than-1024-character value is invalid; and
`nextCursor` is `null` at the end.

### Gem cursor secret and cryptographic contract

The API process reads one required environment variable,
`GEM_CURSOR_KEYS`, before opening the database, registering routes, or becoming
ready. Its exact grammar is an ordered comma-separated keyring
`<kid>:<secret>[,<kid>:<secret>...]`. The first entry is the active encryption
key. A `kid` is a unique `^[A-Za-z0-9_-]{1,32}$` public identifier. Each
`secret` is canonical unpadded base64url that decodes to exactly 32
cryptographically random bytes (256 bits); whitespace, padding, empty entries,
duplicate IDs or secret material, non-canonical encoding, and every other
decoded length fail server construction. The value and derived keys must never
be logged, returned, persisted, or exposed to the browser.

Node 22 `node:crypto` is the approved implementation; no dependency or session
secret is introduced or reused. For each keyring entry, derive one 32-byte key
with HKDF-SHA-256 using the decoded secret as IKM, UTF-8
`EclipseGames/gem-cursor/hkdf-salt/v1` as salt, and UTF-8
`EclipseGames/gem-ledger-cursor/aes-256-gcm/v1` as info. Encrypt the canonical
UTF-8 JSON payload `{v:1,ownerTeacherId,studentId,academicYearId,createdAt,id}`
with AES-256-GCM, a fresh 12-byte CSPRNG nonce per token, and a 16-byte tag.
Authenticate as AAD the fixed-order UTF-8 JSON
`{purpose:"gem-ledger-cursor",v:1,ownerTeacherId,studentId,academicYearId}`
constructed from the authenticated request scope. `createdAt` and `id` are the
last returned persisted ordering tuple; decode requires the stored
`YYYY-MM-DDTHH:mm:ss.sssZ` UTC timestamp form and UUID. The wire format is exactly
`v1.<kid>.<nonce>.<ciphertext>.<tag>`, with each binary part canonical unpadded
base64url. The version and `kid` are routing metadata only; the scope and tuple
remain encrypted.

Decode selects only the named configured key, authenticates before parsing,
then verifies every payload field and exact request-scope equality. Rotation
prepends a new key while retaining prior entries: new cursors always use the
first key, and old cursors remain accepted only while their `kid` remains in
the configured keyring. Reordering retained keys is safe. Removing an old key
intentionally makes its cursors invalid; the client receives the same `422` as
for every invalid cursor and must restart pagination without a cursor. There is
no plaintext, unsigned, alternate-key trial, session-key fallback, or cursor
migration path.

Production and normal development have no generated, checked-in, session-based,
or hard-coded default: deployment or the developer's untracked environment must
supply `GEM_CURSOR_KEYS`. `.env.example` documents the grammar and only the
empty non-secret placeholder `GEM_CURSOR_KEYS=`. Tests inject an explicit deterministic
32-byte fixture keyring through `createServer` options or directly into the
cursor codec; production entrypoint construction cannot select that test path.
Every server instance serving one deployment must receive the same ordered
keyring. Migration, bootstrap, and seed processes do not decode cursors and do
not require this variable unless they construct the HTTP server.

Malformed structure/base64url/JSON, unknown or retired version/`kid`, wrong
nonce/tag length, authentication failure, invalid tuple, and owner/student/year
reuse all return only `422 VALIDATION_FAILED` with **Cursor is invalid.** and
the normal request ID. They do not reveal whether a key, scope, tuple, student,
or year exists. Unexpected encryption failure returns the existing generic
`500 INTERNAL_ERROR`; no plaintext cursor is emitted. Audit/logging contains
only request ID and error code—never cursor text, `kid`, scope, payload, secret,
derived key, nonce, ciphertext, or tag.

This generic cursor boundary applies equally to an empty cursor parameter,
length above 1024, malformed query encoding, token parsing/authentication/scope
failure, retired key, and a validly encrypted tuple that is not in canonical
timestamp/UUID form. Query validation and the codec throw one private typed
`InvalidGemCursorError` carrying no input or cause; the route/error boundary
maps only that type to the exact public `ApiError` above. It must not map an
arbitrary codec, programming, or database exception to `422`; those remain the
generic `500`. Authentication and owned student/year resolution precede decode,
so unauthenticated and non-owned resources preserve `401`/`404`; for every
owned scope, all invalid cursor classes are indistinguishable and execute no
ledger query.

#### Executable HTTP logging boundary

Fastify is constructed with `disableRequestLogging: true`; its built-in
`incoming request` and `request completed` records must never receive the raw
`request.url`/`request.raw.url`. M3 replaces them with exactly these
application-owned records through the root `app.log` captured when hooks and the
error boundary are registered—not `request.log`, `reply.log`, a child logger,
or any logger carrying implicit request bindings:

| Point | Level/message | Allowed structured fields |
|---|---|---|
| first `onRequest` hook | `info` / `http request incoming` | `event:'http.request.incoming'`, `requestId`, `method` |
| `onResponse` hook | `info` / `http request completed` | `event:'http.request.completed'`, `requestId`, `method`, `statusCode`, `responseTimeMs:reply.elapsedTime` |
| error handler | `error` / `http request failed` | `event:'http.request.error'`, `requestId`, `method`, `statusCode`, `code` |

The logger configuration owns closed `req` and `request` serializers that
return `{method}` only. Its exact defence-in-depth Pino redaction is
`{paths:['req.url','req.raw.url','request.url','request.raw.url','raw.url','rawReq.url','url','query','params','body','headers','req.headers','request.headers'],remove:true}`.
Each call passes one newly constructed allowlist object containing exactly the
fields in the table; the error path emits the error record and `onResponse`
still emits the completed record. No HTTP log call may pass a request, reply,
raw request, URL, query, params,
headers, body, cursor-codec value, or caught error object. Therefore query
values are omitted by the event allowlist/serializers and removed by redaction
before any log bytes are emitted rather than merely masked afterward; no
cursor or idempotency key, owner/student/year scope, payload, secret, derived
key, `kid`, nonce, ciphertext, tag, cookie, score, source mark, replay
fingerprint, or
transaction correlation can enter incoming, completed, or error output. The
existing audit callback remains `{code,requestId}` only and does not replace
this boundary. `createServer` keeps `logger:false` for silent tests and accepts
an optional writable destination for capture tests; logger-enabled production
and capture modes both use this one configuration factory, with production
omitting the destination so output remains standard Fastify/Pino stdout.

Missing and invalid `GEM_CURSOR_KEYS` take one indistinguishable pre-Fastify
failure path. Before database opening, logger construction, route registration,
or listen, the production entrypoint writes exactly
`GEM_CURSOR_KEYS invalid or missing; server startup aborted.\n` to stderr and
sets a non-zero exit status. The typed configuration error has that same
constant message and carries no cause, input, `kid`, parser reason, secret, or
derived material; the entrypoint never prints the caught object or stack.

No gem response includes ledger IDs, predecessor/family/source IDs or kinds,
unit indexes, allocation IDs/linkage, movement ID arrays, idempotency/request
keys or fingerprints, transaction correlations, reconciliation cursors,
receipt IDs/fingerprints, raw score, source marks, owner IDs, names, grades, or
private history. The standard error `requestId` is the existing transport
diagnostic only; it is not an idempotency key or gem transaction correlation,
and error/audit logs retain only that ID plus the closed error fields above.

| Route | Request | Response/status |
|---|---|---|
| `GET /api/v1/students/:studentId/gems?academicYearId=` | none | `GemBalancesDto`; `200` |
| `GET /api/v1/students/:studentId/gem-ledger?academicYearId=&cursor=&limit=` | none | `GemLedgerPageDto`; `200` |
| `GET /api/v1/gem-rewards` | none | `GemCatalogueItemDto[]`; `200` |
| `GET /api/v1/students/:studentId/gem-action-state?academicYearId=&assessmentContextId=` | none | `GemActionStateDto`; `200` |
| `POST /api/v1/students/:studentId/gem-result-rewards` | `{assessmentContextId,score}`, UUID-v4 `Idempotency-Key` | `{id,tier,state}`; `201` or replay `200` |
| `POST /api/v1/gem-result-rewards/:rewardId/correction` | `{reason}`, UUID-v4 key | `{rewardId,state:'REVERSED'}`; `201` or replay `200` |
| `POST /api/v1/students/:studentId/advantages` | `{assessmentContextId,rewardId}`, UUID-v4 key | redemption `{id,currency,cost,state}`; `201` or replay `200` |
| `POST /api/v1/advantage-redemptions/:redemptionId/reversal` | `{reason}`, UUID-v4 key | `{redemptionId,state:'REVERSED'}`; `201` or replay `200` |

Use `401` unauthenticated, `404` for hidden ownership/not-found, `422` invalid
input, and `409` key/fingerprint, invariant, stale revision, insufficient
balance, or already-finalized conflicts. No response contains score, names,
grades, private history, or any excluded field above. Spanish UI
states are **Gemas**, **Esmeraldas**, **Rubíes**, **Diamantes**, **Recompensa de
resultado**, **Ventaja**, **Gastar**, **Revertir**, **Corregir recompensa**,
**Cargando gemas…**, **Sin movimientos**, **No se pudo cargar. Reintentar**,
**Guardando…**, **Guardado**, **No se pudo guardar. Reintentar**, **Saldo
insuficiente**, **Ya utilizada**, **Recompensa revertida**, and **Corrección
aplicada**. Loading, empty, error/retry, disabled explanation, success, spend,
reversal, correction, reload, responsive, and private states are intentional.
At L8 the private XP UI shows **Nivel máximo**, a 100% progress bar, the uncapped
annual XP total, and no “next level” number or invented threshold. Below L8 it
uses only the API's canonical progress fields. M4 behaviour is excluded.

#### Private gem action rehydration

`GET .../gem-action-state` is an authenticated, non-paginated point read, not a
history feed. The server first validates both query UUIDs, then proves that the
student belongs to the authenticated teacher in `academicYearId` and that the
assessment context belongs to that same group. Missing, foreign, or cross-group
student/context/year lineage is the same hidden `404`; malformed input is `422`.
Owned archived students or contexts remain readable so persisted facts do not
disappear, but the existing mutation rules and read-only UI keep them
non-editable. The repository reads at most the unique reward and unique
redemption rows for that exact tuple and the mapper constructs only the closed
DTO above. Null means no such resource exists. Rows are never inferred from the
ledger, mutation receipts, browser storage, or URL state.

The private UI loads this state whenever the selected assessment changes and
after every successful reward, correction, spend, or reversal, alongside—but
failure-isolated from—balances, catalogue, contexts, gem ledger, and legacy coin
history. Until the selected assessment state loads, all four mutation paths are
disabled with a useful loading/error explanation and a focused **Reintentar**;
already loaded balances and either history remain visible. A state-read failure
must never optimistically expose a mutation control because absence and failure
are different facts. The client stores no action ID/state in URL,
`localStorage`, or `sessionStorage`.

For the selected assessment, null reward shows the result-reward form; an
`ACTIVE` reward replaces grant with **Corregir recompensa** and its required
reason; `REVERSED` shows **Corrección aplicada** and disables both grant and
correction. Null redemption permits catalogue spend subject to balance;
`ACTIVE` shows **Ya utilizada**, disables every spend choice, and enables
**Revertir** with its required reason; `REVERSED` shows **Recompensa revertida**
and disables spend and reversal. Currency/cost identify the fixed catalogue
choice without exposing funding linkage. Each action retains one generated
idempotency key across an ambiguous failure and its retry until definitive
success, conflict, or assessment/student change. After success, balances and
action state are reread before finalized feedback is announced; if that refresh
fails, controls stay disabled and retry rehydrates rather than repeating the
mutation.

### Finalized application route ownership

M3 does not redesign navigation. Fastify remains the production owner of the
built application document: when `apps/web/dist` exists it serves static assets
and explicit `GET /` → `index.html`; no `/workspace` server route or SPA
fallback is added. React retains the existing `HashRouter`: `/` is the existing
application/projection entry and `/#/workspace` is the authenticated private
workspace where gem and legacy-history UI lives. The fragment is never sent to
Fastify, so direct navigation, reload, and copy/paste of
`/#/workspace?year=<UUID>&group=<UUID>&student=<UUID>` request `/`, boot the
built React artifact, and then resolve the workspace client-side. M3 must not
move the workspace to `/workspace`, replace `/`, edit projection route
ownership, or make Vite development fallback the only proof.

## Build actions, tests, rollout

Build removes only coin mutation paths/types/UI/seed writes/reconciler, retains
the exact legacy reads above, and adds the gem module, adapter, reconciler,
routes, DTOs, migration, and private teacher UI. Coin-owned assessment-context
registration may be moved to a cohesive existing/shared route module only to
keep those unchanged routes alive; their contract is not redesigned.
It does not touch `apps/api/src/projection/*` or projection fixtures/assertions.

| Existing area | Build effect |
|---|---|
| `apps/api/src/coins/{routes,service,repository,mapper}.ts` | Reduce to the three authenticated legacy reads; preserve DTO mapping and remove all writer exports/handlers. |
| `apps/api/src/coins/entitlement-reconciler.ts` | Delete after gem reconciliation replaces it; no startup/manual/test import remains. |
| `packages/domain/src/xp/levels.ts`, `packages/contracts/src/index.ts`, `apps/api/src/xp/{repository,service,level-grant-transition-port}.ts`, `apps/web/src/workspace/{workspace-api.ts,StudentPanel.tsx}` | Centralize permanent L1-L8 thresholds, safe-integer validation, uncapped totals, MAX_LEVEL progress, and L2-L8 transition derivation. No L9/formula, XP route, evidence, badge, rubric, or projection expansion. |
| `apps/api/src/{xp,rt}/{service,routes}.ts`, `services/transactions.ts` | Thread the required injected coordinator and one runner-owned immediate transaction token; invoke gem orchestration on new and replayed XP/RT writes without transferring source ownership. Extend only the RT-owned entitlement port with global binary-ID baseline pages and exact baseline lineage lookup; no coordinator source SQL. |
| `apps/api/src/gems/source-orchestrator.ts` | Own synchronous XP/RT gem application, receipts, cursor checks, RT revision checks, and startup/manual reconciliation using only the named source ports. |
| `apps/api/src/gems/cursor.ts`, `apps/api/src/server.ts`, `apps/api/src/http/errors.ts`, `.env.example` | Implement the Node-crypto cursor codec and strict keyring parser; validate configuration before database/server construction; replace Fastify default request logs with the closed HTTP log allowlists and constant pre-logger configuration diagnostic; inject explicit test keys; and document only the empty non-secret environment placeholder. |
| `packages/contracts/src/index.ts`, `packages/domain/src/coins/*` | Add the closed private `GemActionStateDto`; retain coin read DTOs, remove mutation-only coin contracts/rules, and keep read-only/forbidden-write regression. |
| `apps/api/src/demo/seed-service.ts`, `apps/api/scripts/seed-demo.ts` | Remove coin plan/preflight/write/result/logging; add no historical coin backfill. |
| `apps/api/src/gems/{repository,routes}.ts` | Add only the owned tuple-scoped `gem-action-state` read and explicit mapper; do not add schema, history, pagination, mutation, or projection fields. |
| `apps/web/src/workspace/workspace-api.ts`, `apps/web/src/workspace/StudentPanel.tsx` | Add the typed action-state read plus result/correction/spend/reversal clients; rehydrate selected-assessment controls after load, mutation, and reload; keep isolated typed legacy GET history and no browser persistence. |
| `apps/api/src/server.ts`, `apps/web/src/main.tsx` | Register gem/read-only routes while preserving Fastify static `/` and existing HashRouter ownership; no projection or SPA-fallback change. |

TDD covers grammar/tier/privacy, every allowed matrix row and every forbidden
predecessor/source-family pairing, source/redemption non-branching, balance and
allocation linkage, full-redemption refund before spent-source revocation,
every permanent L1-L8 boundary, MAX_LEVEL above 175, safe-integer
validation, XP completion-result and complete contiguous page-drain semantics,
XP replay/changed-source rollback, RT-owned global baseline paging, RT revision
CAS, result and spend idempotency/correction, ownership, exact SQL FKs/checks/
indexes/preflight, and all application-only invariants above. Migration tests
apply actual repository migrations `0001..0012`, then populate coherent L2-L8
unlocks and GRANT/REVOKE/REINSTATE rows, non-null
`source_transition_id` values, and all four legacy coin tables. Separate
single-drift cases mutate each required column/FK/CHECK/index/predicate and each
data-integrity rule; every case fails before gem DDL. The success case proves
the complete pre/post metadata and ordered-row comparison, exact empty gem fact
tables, exact catalogue/cursor seed rows, both PRAGMAs, unchanged direct L1/L9
rejection, and inert rerun. A parameterized test enumerates every named stage
from `preflight` through `migration-marker-before-commit`, injects one failure
per run, and proves the complete rollback snapshot—sampling only “after DDL” is
insufficient. Integration tests prove zero partial writes and
persistence/reload. Legacy regression tests seed
pre-existing coin rows directly, prove all three reads and exact DTO allowlists
for active/archived owners, `401`/`404`/`422`, ordinary `404` for removed coin
mutations and old IDs on gem handlers, and byte-for-byte/count equality of all
four legacy tables after every forbidden request, XP/RT reconciliation, demo
seed, startup, and gem journey. Contract/client tests prove coin mutation APIs
are absent and exact gem allowlists reject repository lineage, source,
allocation, request, correlation, receipt, score, and owner fields. Cursor tests
prove stable multi-page order, `null` termination, 1/50/100 limits, exact token
shape, nonce uniqueness, ciphertext opacity, tamper rejection for every segment,
and cross-owner/student/year rejection without disclosure. Route tests prove
empty, overlength, malformed encoding/structure/JSON, unknown/retired key,
tamper, bad tuple, and cross-scope cursors all return the same exact `422` body
and execute no ledger query, while an injected unexpected codec error is the
generic `500`. Configuration tests
prove missing/malformed/weak/duplicate keyrings fail before database opening and
route registration; explicit test injection cannot become a production default.
Rotation tests prove retained old-key cursors decode, every newly issued cursor
uses the first key, removed/unknown keys return the same generic `422`, and the
client can restart from page one. No test or failure output may contain secret,
derived-key, payload, scope, or cursor material.
Capture-based logger tests run the enabled production logger configuration into
an in-memory NDJSON writable and exercise a successful cursor page plus
malformed, tampered, cross-owner, cross-student, cross-year, retired-key, and
injected unexpected-error requests. They prove the exact incoming/completed/
error messages and field allowlists above (including completed logging after an
error), prove the records contain no implicit request-bound fields, and assert
both parsed records and the complete captured bytes omit the
raw URL, every query value, full token and each token segment, fixture `kid`,
secret, derived key encodings, decrypted payload/tuple, all scope UUIDs,
cookies, idempotency keys, score/source marks, fingerprints, correlations,
request/reply/error objects, and forbidden field names. A separate serializer
probe attempts `req`, `request`, and top-level raw-URL/query/body/header fields
and proves URL/query values are removed before emission. Captured stderr tests
cover missing and every malformed keyring class: each emits only the exact
constant diagnostic once, with no input, reason, stack, or cryptographic
material, while spies prove database opening, Fastify/logger construction,
route registration, and listen never occur; valid configuration emits no such
diagnostic.
Focused route/privacy tests seed all combinations of null, `ACTIVE`, and
`REVERSED` reward/redemption state and prove the exact action-state key order and
allowlist, owned active/archived reads, `401`, malformed `422`, hidden
cross-owner/cross-year/cross-group `404`, and no ledger/operation/reason,
reversal-trigger, timestamp, score, name, or owner leakage. Client tests prove
the exact encoded query, no mutation during rehydration, retained idempotency key
on ambiguous retry, and disabled-safe behavior when the state read fails.
Playwright uses the real Fastify API and built React application with directly
seeded historical coin rows and normal gem APIs. The acceptance journey logs in,
opens `/#/workspace?year=<owned>&group=<owned>&student=<owned>`, and proves:

1. **Gemas** and **Historial de monedas (solo lectura)** render as separate
   labelled regions; the latter shows **Saldo histórico**, the two legacy
   catalogue rows, ordered legacy movements, and the no-mutation explanation;
2. no coin grant/spend/correct/reverse button, form, mutation request, or
   unlabelled coin balance exists, while result reward, spend, reversal, and
   correction gem actions remain operable with disabled reasons and finalized
   states; the journey creates one result reward, spends one advantage, reloads,
   and proves the real action-state GET restores the same reward/redemption IDs
   and `ACTIVE` controls before correction/reversal; it then finalizes both,
   reloads again, and proves both `REVERSED` states remain non-repeatable;
3. one intercepted transient gem-read failure leaves already loaded coin
   history visible and its retry recovers; one intercepted transient coin-read
   failure leaves gem actions enabled and **No se pudo cargar el historial.
   Reintentar** recovers without reload;
4. direct navigation to an owned archived student's URL renders the same
   read-only history and no mutation controls, while gem mutations remain
   unavailable for archived lineage; and
5. successful gem state and both histories persist after page reload at laptop
   and tablet viewports, with keyboard-reachable retry/actions, visible focus,
   dialog focus containment/return, no horizontal clipping, no ranking, and no
   private data in projection.

Network interception is permitted only to inject the two existing transient GET
failures and one action-state GET failure; success/persistence, action-state
rehydration, and every mutation use the real API/database. The
test asserts observed methods/URLs so a removed coin mutation cannot be hidden
only by UI rendering.

Routing regression uses a real web build served by Fastify, not only Vite: `/`
keeps the existing entry; initial navigation, reload, and a newly pasted
`/#/workspace?...` URL each request `/` and render the authenticated workspace;
static JS/CSS assets resolve; no `/workspace` fallback exists; projection DTO,
routes, fixtures, and assertions remain unchanged.

### Required RED and integration proof for the source commit boundary

These tests are RED before orchestration is wired and use the real SQLite
services/ports, not mocked post-commit callbacks:

| Case | Required proof |
|---|---|
| XP success | Using the shared canonical source (never test-local thresholds), boundary tests prove every L1-L8 threshold at `threshold-1`, `threshold`, and `threshold+1`; 175, 176, and `Number.MAX_SAFE_INTEGER` all return L8 with uncapped total and exact MAX_LEVEL progress. Domain, repository, individual/group DTOs, and L2-L8 transition derivation agree. One XP create crossing one/multiple real thresholds commits its event, ascending contiguous transitions, one Emerald per crossing, receipts, and cursor together; post-L8 XP commits evidence/total only, with no L9 row, transition, receipt, or Emerald. |
| XP reversal/reinstatement | Reversal from at/above 175 to below it commits XP reversal + the existing L8 `REVOKE` atomically. If its grant is spent, the complete linked advantage is first refunded by one `SPEND_REVERSAL` per spend, all allocations are released/finalized, then the source debit is appended; balances never become negative. A later valid recrossing commits `REINSTATE` on the same unlock/linear source chain without reopening the old redemption. Corrections that remain at/above 175 produce no level transition. |
| XP numeric boundary | Domain/repository/DTO tests accept integer totals `0`, `175`, and `9007199254740991`; reject fractional, negative, non-finite, `9007199254740992`, precision-losing database reads, and addition overflow. Request-time rejection is `422`; persisted/reconciliation corruption is `409`; neither changes XP, transition, receipt, cursor, or gem state. |
| RT bulk success/correction | One request containing at least two students causes at least three entitlement revisions, with at least two distinct entitlements in one student's reconciled scope. It commits all entries, entitlement states/CAS links, distinct `rt-revision:<entitlementId>:<revision>` receipts and movements, and one request row in one transaction; every new receipt shares the correlation ID without a uniqueness collision. Correction that invalidates then later restores eligibility commits each `INACTIVE` revoke then `ACTIVE` reinstatement against its own grant chain. |
| Injected failure rollback | In that multi-student/multi-entitlement request, throw after source inserts, after multiple revision creations, after a non-final CAS/allocation release, and after a non-final gem/receipt insert but before the remaining receipts/request row. Each failure leaves a byte/count-equal pre-request snapshot across all affected XP/RT, gem, allocation, receipt, cursor, and request state—no earlier student or entitlement commits. |
| Replay | Repeat the successful bulk RT key with original and reordered request entries, and repeat XP keys. Responses are replays; every scope is checked; stable receipt IDs, stored first-write correlations/fingerprints, source/gem rows, and balances are identical. A later startup/manual pass over those revisions is also inert despite a different correlation ID. |
| Conflict | Changed request fingerprint; XP source/receipt mismatch; RT revision gap, stale CAS/snapshot, changed source/consumption linkage, receipt ID collision, either receipt key resolving inconsistently, or missing/wrong movement each returns `409`. Inject each RT conflict after at least one earlier student/sibling entitlement was processed and prove the complete durable bulk snapshot unchanged. |
| Startup/manual limit | Practical historical totals 174, 175, and above 175 are replayed without capping XP. Seed coherent pre-existing transitions both below/at the gem cursor and above it, plus historical evidence that makes completion append a multi-row suffix; use pages small enough to cross several boundaries. Assert the completion result names only its exact contiguous appended suffix, the `listAfter(0,limit)` loop visits every sequence `1..throughSequence` exactly once in order, rows at/below the cursor are verified, rows above it are applied contiguously, and the terminal probe is empty. Empty intermediate, duplicate, overlapping, out-of-order, gapped, or post-boundary pages fail `409` with no write. Only real L2-L8 crossings yield ordered unlocks/transitions and exactly one receipt/Emerald each; all totals at/above 175 remain L8 and produce no L9 threshold, row, transition, receipt, or Emerald. Exact rerun is inert. Historical L8 fall/regain reconstructs `GRANT -> REVOKE -> REINSTATE` on existing lineage. RT-owned pages contain at least two globally ID-ordered entitlements across different student/term scopes and cover active/inactive plus consumed/unconsumed current states; every current ID is invoked once without coordinator SQL discovery, baselined under the exact receipt/CAS rules, and an empty terminal page proves exhaustion. Unsafe totals, malformed/partial lineage, foreign RT consumption, or an L9 row block readiness. Equivalent live crossing/fall/regain and post-L8 tests prove the same identities without startup/manual hooks; the numeric-bound row above proves `Number.MAX_SAFE_INTEGER` without manufacturing an impractical event history. |
| Startup partial-baseline rollback | Capture the complete pre-run ordered state, then inject failure only after authoritative XP completion has appended missing transitions, all XP pages have produced movements/receipts and advanced the cursor, and the first of at least two RT baselines has performed its receipt plus any active-entitlement CAS/grant. The failed single immediate transaction restores byte/count-equal XP unlock/transition rows, gem ledger and allocations, XP/RT receipts, XP cursor, and all RT `consumer_id`, `grant_id`, `consumed_revision`, and `consumed_at` fields; no route is registered/served and readiness fails. |

### Threat matrix

| Boundary | Applicability and required RED proof |
|---|---|
| Application routing | Applicable: Fastify owns `/` and built assets; HashRouter owns `/` and `/workspace`. Prove direct/reload/copy-paste built-artifact behaviour and unchanged projection ownership. |
| Documentation-like/executable paths | N/A: no file classification or execution. |
| Git repository, commit, push, PR | N/A: no VCS or Ship automation. |
| Shell/subprocess/process integration | N/A: no command or process boundary. |

Roll out migration and gem routes/UI together behind no conversion or dual-write;
seed only fixed gem catalogue rows. Existing coin data is read-only and remains
historical until M8 projection work. No event bus, scheduler, generic reward
engine, score storage, conversion, or projection rewrite is introduced.

Deployment first supplies one generated 32-byte `GEM_CURSOR_KEYS` entry through
the deployment secret environment; a missing or invalid keyring blocks startup.
Rotation deploys the new active entry first while retaining old entries for the
operator's chosen pagination overlap, then removes retired entries in a later
deployment; removal invalidates only outstanding cursors and changes no ledger
data. Deployment order is then backup/preflight, transactional `0013_gems` without XP-table
rebuild, mandatory
startup XP authoritative-transition completion followed by XP gem catch-up and RT
current-revision baseline in one immediate transaction before readiness, then
one application release that simultaneously removes coin writers and enables
gem writes; do not accept traffic or deploy gem writes while completion/baseline
fails or any coin writer/reconciler remains. No separate XP migration release or
feature flag is permitted.
Preflight failure leaves the prior application/database untouched. After the
first gem write, rollback is forward-only: disable gem mutations, preserve both
histories, and repair by compensating gem movements rather than reverse DDL or
coin conversion. C-01 remains a separate production gate.

## Acceptance

- [ ] A fresh, separate Terra review approves this revised Level C Design before
  Luna Build resumes; review blockers return to Sol.
- [ ] Gem lineage, XP/RT reconciliation, result correction, spending, ownership,
  idempotency, migration preflight, rollback, and projection boundaries satisfy
  every contract above with zero partial or academic/coin mutation.
- [ ] Ledger persistence and services accept exactly the predecessor/source-
  family matrix above: source chains and redemption chains remain linear,
  spends are roots linked through allocations rather than grant successors, and
  every unlisted transition fails atomically with `409`.
- [ ] Revoking or correcting any spent source unit first reverses every affected
  advantage in full, links each `SPEND_REVERSAL` to its spend/allocation,
  releases all allocations, then appends source debits; zero-balance, multi-unit,
  multi-redemption, replay, and injected-failure cases never produce a negative
  balance or partial finalization.
- [ ] Every new or replayed XP transition and every RT entitlement revision is
  synchronously reconciled through the required coordinator in the same
  `BEGIN IMMEDIATE`; success, injected failures, replay, reversal/correction,
  gap, stale, and changed-source tests prove source facts and gem movements
  cannot diverge. No optional/default/bypass service seam exists, XP/RT replay
  lookup occurs inside the transaction, and startup/manual reconciliation is
   baseline/recovery only.
- [ ] Startup completion returns the exact authoritative `throughSequence` and
  contiguous invocation-appended suffix; startup enumerates sequences
  `1..throughSequence` through XP-owned `listAfter` pages, verifies rows at/below
  the prior cursor, applies every row above it without gaps, and reaches an empty
  terminal probe with the cursor exactly at the completion boundary.
- [ ] RT owns the global binary-ID-ordered, paged enumeration of every current
  entitlement. Startup invokes one baseline application per enumerated ID,
  creates or verifies its exact current-revision receipt/CAS/movement under the
  sole documented continuity exception, reaches an empty terminal page, and the
  coordinator performs no SQL discovery of RT work.
- [ ] One injected startup failure after completed XP catch-up and at least one
  RT baseline receipt proves that the single immediate transaction restores XP
  unlocks/transitions, gem movements/allocations/receipts/cursor, and RT
  CAS/consumption fields together and leaves server readiness/routes unavailable.
- [ ] XP uses only the permanent L1-L8 thresholds. Annual XP accumulates without
  capping through `Number.MAX_SAFE_INTEGER`; at/above 175, summaries remain L8
  with exact MAX_LEVEL fields and UI **Nivel máximo**, and no L9 threshold,
  unlock, transition, receipt, or Emerald can exist. Invalid/overflowing totals
  fail atomically under the specified `422`/`409` boundary.
- [ ] Each real L2-L8 first crossing has one XP-owned unlock/`GRANT` consumed into
  exactly one Emerald root. Post-L8 XP grants none. Falling below and validly
  recrossing 175 uses ordered L8 `REVOKE`/`REINSTATE` on existing lineage; replay
  is inert and malformed/partial completion fails without coin, XP-evidence, RT,
  or partial gem mutation.
- [ ] Migration `0013` preserves the exact `0012`-effective L2-L8 XP schema and
  every XP row/index unchanged, including
  `xp_level_grant_transitions.source_transition_id` and
  `uq_xp_grant_transition_source`; it rejects L1/L9 rows, adds only gem
  schema/catalogue/cursor-zero state, passes exact metadata, DDL-coherence,
  foreign-key, and integrity checks, and restores the complete pre-migration
  schema/data with no marker or gem object under one injected failure at every
  named migration stage.
- [ ] A multi-student/multi-entitlement RT bulk transaction stores one distinct,
  stable receipt operation ID per revision and may store one shared non-unique
  correlation ID; exact/reordered replay is inert, identity/fingerprint reuse
  conflicts atomically, active-unconsumed CAS grants, consumed-inactive revokes,
  consumed-active reinstates, inactive-unconsumed records no movement, baseline
  and revision continuity are exact, and failure after partial iteration rolls
  back every submitted student.
- [ ] The three legacy coin reads and exact DTOs remain private and usable for
  active and archived owned history; all former coin writes are unreachable,
  old coin IDs cannot enter gem mutations, and all legacy tables remain equal.
- [ ] Gem balance, ledger-page, catalogue, mutation, cursor, and error responses
  contain exactly their declared allowlists. Internal lineage/source/allocation,
  request/fingerprint/correlation, receipt, score/source-mark, and owner/private
  fields are absent; every owned-scope invalid cursor class returns exactly
  `422 VALIDATION_FAILED` / **Cursor is invalid.** without a ledger query, while
  unexpected failures remain generic `500`.
- [ ] The private tuple-scoped action-state GET returns exactly the declared
  nullable reward/redemption IDs and current states for owned active or archived
  lineage; it hides malformed/foreign/cross-scope access under the stated
  `401`/`422`/`404` boundaries and exposes no score, reason, operation, ledger,
  timestamp, owner, name, or projection field.
- [ ] `GEM_CURSOR_KEYS` has no production/development default, is validated before
  database/server construction at 256-bit strength, and drives only the specified
  HKDF-SHA-256/AES-256-GCM codec. Rotation accepts retained keys, encrypts with
  the first key, and rejects removed keys with the generic cursor `422`; startup,
  codec, privacy, and rotation tests expose no secret or cursor contents.
- [ ] Fastify default request logging is disabled; capture-based success and
  failure tests prove the exact application-owned incoming/completed/error log
  calls use only root `app.log`, carry no implicit request bindings, erase raw
  URLs and all query values before serialization, and leak no
  cursor/key/scope/payload/derived or other forbidden material. Missing or
  invalid `GEM_CURSOR_KEYS` emits only the one constant pre-logger stderr
  diagnostic and performs no database/server/listen work.
- [ ] The private Spanish UI cleanly separates gems from labelled read-only coin
  history for active and archived owned students, includes independently proven
  loading/empty/error/retry/disabled/finalized states, exposes no coin mutation
  request or control, and passes the real-built-app laptop/tablet, keyboard,
  persistence/reload, and failure-isolation journey without ranking, score
  storage, or projection leakage.
- [ ] Real-API browser proof creates reward and redemption resources, reloads to
  restore their IDs and `ACTIVE` correction/reversal controls, finalizes both,
  reloads to restore both `REVERSED` non-repeatable states, and proves a failed
  action-state read disables mutations until retry without repeating a write or
  storing action state in the URL or browser storage.
- [ ] A production-like Fastify-served web build proves `/` plus HashRouter
  `/#/workspace` initial/reload/copy-paste ownership, resolved assets, and no
  projection implementation or ownership change.

## Simplicity Check

M3 adds one explicit gem module and reuses SQLite transactions, authenticated
ownership, assessment identity, XP transition and RT entitlement ports, and the
existing HashRouter/Fastify topology. Legacy coins receive only a narrow
read-only adapter/UI section—not conversion, dual-write, a compatibility
engine, trigger, feature flag, event bus, scheduler, new dependency, projection
rewrite, or configurable reward engine. This is the smallest design that
preserves audit evidence while making gems the sole future currency. One
synchronous coordinator is justified because it closes the two-source atomic
commit boundary; a scheduler, outbox, distributed transaction, or periodic
repair loop would add complexity while permitting temporary divergence in this
single-process SQLite architecture.
The selected-assessment action-state point read reuses the two existing unique
fact rows and ownership joins. It is smaller and safer than expanding the stable
balance DTO, returning operation history, duplicating state in React storage, or
adding a client cache/state engine; no migration, table, cursor, setting,
dependency, or projection contract is added.
The runner-owned branded token and per-revision receipt key add no framework or
generic unit of work: they are the minimum explicit ownership and idempotency
contracts needed for one existing synchronous bulk transaction to commit all
affected revisions safely.
The bounded XP and RT `listAfter` ports are narrow source-owned enumerators, not
a generic reconciliation engine: they reuse stable persisted IDs/sequences and
one transaction, prevent coordinator SQL ownership leaks, and add no scheduler,
checkpoint table, or second durable cursor.
Separate source and redemption chains plus one allocation link avoid a generic
accounting engine while making spends, refunds, and source correction
unambiguous. Full advantage reversal reuses the canonical indivisible redemption
rule and is simpler and safer than partial repricing. Cursor confidentiality adds
one small Node-crypto codec and one required environment keyring, not a dependency,
settings screen, persisted key store, or reuse of the unrelated opaque-session
token. HKDF domain separation, AEAD scope binding, and bounded rotation are the
minimum reliable privacy contract; plaintext signing alone would expose private
ledger ordering metadata. Disabling Fastify's URL-bearing defaults and adding
three closed records plus one constant startup diagnostic is smaller and safer
than a general logging wrapper; serializer/redaction defence and capture tests
make the privacy boundary executable without adding a dependency or log schema
engine.
The small XP adaptation reuses one maintainer-approved threshold source and the
existing unlock/transition seam; it does not add an XP subsystem, route, teacher
action, setting, event bus, or parallel level ledger. Retaining the existing
L2-L8 database cap avoids a needless linked-table rebuild and enforces the
permanent maximum at the storage boundary. Uncapped XP remains one derived annual
total rather than another level or ledger. No L9 formula, row, migration, reward,
or UI state exists. A new independent `sdd-lite-review-terra` review is required
before Luna Build resumes.
