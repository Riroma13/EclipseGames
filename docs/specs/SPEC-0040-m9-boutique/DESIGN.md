# SPEC-0040 — M9 Boutique / Avatar Cosmetics

**Phase:** Design (Sol)
**Level:** C — additive/rebuild migration, cross-domain atomic spend, and student-data boundary
**Status:** DESIGN READY
**Dependencies:** M3 Gems, M4 behaviour policy, M7 Avatar Core, M8 Teacher Workspace/Classroom Mode
**Rollout conditions:** B-01 and C-01 remain open; see Section 9

## 1. Outcome and repository evidence

M9 adds a teacher-operated boutique where a student spends annual Emeralds to permanently own cosmetics for that school year, then explicitly equips an owned item through Avatar Core. It extends the canonical M3 `gem_ledger`, M7 profile revisions/availability port, and M8 workspace; it creates no second wallet, avatar, projection, or audit system.

Repository evidence fixes the design: Gems already uses append-only unit movements, funding allocations, owner-scoped UUID-v4 idempotency, and `BEGIN IMMEDIATE`; `behaviour/domain.ts` is the spending-policy authority. Avatar Core already owns full-snapshot revisions and calls `AvatarAvailabilityPort`, although revert must be brought through the same check. `students -> groups -> academic_years` is current lineage, so purchases must snapshot durable year ownership rather than derive it later from a changed group. `RestrictedAvatarDto` and Classroom projection are server allowlists and must remain unchanged.

## 2. Scope

### In scope

- One code-owned, deterministic M9 avatar catalogue with base and purchasable items, exact order, Emerald prices, level/specialty gates, and cumulative term availability.
- Durable per-student/per-school-year cosmetic purchases; canonical Gem spend allocations; owner-scoped idempotency; atomic purchase and balance update.
- Explicit equip through existing Avatar Core update/history/revert contracts, with boutique availability enforced on every profile write.
- Spanish teacher UX inside the existing `AvatarWorkflow`/`StudentPanel`, including loading, empty, locked, insufficient-balance, policy-denied, stale, retry, archived, and purchased-not-equipped states.
- Bounded teacher-private read models and stable purchase evidence usable by M10 history.

### Non-goals

Ruby/Diamond cosmetics, gifts, bulk/group purchases, discounts, rotating/date-configured inventory, stock, refunds/reversals, sale administration, uploads, free-form colours, student purchasing/accounts, public rankings, marketplace/trading, cross-year carry-forward, automatic equip, loot/random rewards, analytics, notifications, generic commerce/event-sourcing infrastructure, or M10 history UI.

## 3. Twenty-six required design decisions

| # | Decision | Contract and rationale |
|---|---|---|
| D01 | Ownership boundary | Avatar Core continues to own profile state/revisions/rendering; Gems owns balances and `gem_ledger`; Boutique owns catalogue purchase rules, purchases, request receipts, and boutique allocations. Roster/calendar/XP/behaviour remain authoritative inputs. No module writes another domain's state except through narrow service/transaction ports. |
| D02 | Catalogue source | `apps/api/src/avatar-core/catalogue.ts` is the single code source for visual IDs, category/order, Spanish labels, and access metadata. Avatar Core consumes visual membership; Boutique consumes access metadata. `domain.ts` no longer duplicates the list. Persist IDs and purchase snapshots, never labels/CSS classes. |
| D03 | Catalogue schema | Each item is `{id,category,label,order,access}` where access is `{kind:'BASE'}` or `{kind:'BOUTIQUE',currency:'EMERALD',cost,minLevel,requiredSpecialtyCategory:null|XpCategory,availableFromTerm:'T1'|'T2'|'T3'}`. Catalogue version becomes `m9-v1`; categories remain `faceId, skinToneId, hairId, featureId, clothingId, accessoryId, frameId, backgroundId` in that order. |
| D04 | Exact items and order | Preserve every M7 item first in its existing order. Append: hair `hair-braids`/ **Trenzas** (1, L2, T1); feature `feature-eclipse-mark`/ **Marca Éclipse** (1, L2, T1); clothing `clothing-orbit`/ **Traje orbital** (2, L4, T2); accessories `accessory-comet`/ **Cometa** (1, L2, T1), then `accessory-signal`/ **Señal** (1, L3, T2, COMMUNICATION), `accessory-compass`/ **Brújula** (1, L3, T2, PRECISION), `accessory-anchor`/ **Ancla** (1, L3, T2, CONSISTENCY), `accessory-alliance`/ **Alianza** (1, L3, T2, COLLABORATION); frame `frame-emerald`/ **Marco esmeralda** (2, L5, T2); background `background-dawn`/ **Amanecer** (3, L6, T3). Parentheses are Emerald cost, minimum level, first term, and optional specialty category. Faces/skin remain identity-safe base items. |
| D05 | Term availability | `availableFromTerm` is cumulative (`T1 <= T2 <= T3`), not a rotating window. The server resolves the current canonical term from calendar dates/timezone; clients cannot nominate a later term. With no current canonical term, reads show term-locked and purchase returns `409 BOUTIQUE_TERM_UNAVAILABLE`. Holidays do not close an otherwise current term. |
| D06 | Level/specialty rules | Purchase and every equip/revert evaluate current annual XP level and current roster specialty category. `level >= minLevel` and exact required category are mandatory. Client claims are ignored. XP or specialty later changing does not revoke ownership or rewrite the current profile, but an unavailable item cannot be newly equipped or restored; the next profile edit must replace any now-unavailable selection. |
| D07 | Base versus owned availability | Base items always pass availability. A boutique item passes only when a matching purchase exists for `(studentId, academicYearId, itemId)` and current D05/D06 gates pass. `AvatarAvailabilityPort` therefore receives student, school year, and item context; no caller may fall back to catalogue membership for boutique items. |
| D08 | Durable school-year ownership | `boutique_purchases` snapshots `id, owner_teacher_id, student_id, academic_year_id, term_id, item_id, catalogue_version, currency, cost, min_level, required_specialty_category, available_from_term, level_at_purchase, specialty_category_at_purchase, purchased_at, actor_teacher_id`. Ownership is unique by `(student_id,academic_year_id,item_id)`, survives same-year group correction, and is read from the stored year. A future rollover/new student ID starts with no purchases; no alias/name matching or carry-forward occurs. |
| D09 | Group correction/archive | Same-owner, same-year canonical group correction preserves purchases and equipped profile. Purchase/equip are denied for archived students/years; historical boutique reads remain available and read-only. Existing roster rules continue to prohibit cross-year correction. A purchase is durable annual evidence and calls the existing roster group-correction lock in the same transaction, without inventing another lock. |
| D10 | Canonical spend | A purchase appends exactly `cost` `gem_ledger` rows: `currency=EMERALD`, `amount=-1`, `movement_kind=SPEND`, `source_kind=REDEMPTION`, `source_id='redemption:boutique:' + purchaseId`, `source_family_id='redemption:' + purchaseId`, and `unit_index=1..cost`. The purchase ID is the canonical redemption/reference; no balance column or boutique ledger is added. |
| D11 | Funding allocations | `boutique_spend_allocations(id,purchase_id,funding_movement_id,spend_movement_id,created_at)` links each spend unit to one active M3 grant/reinstatement. Funding selection remains FIFO `(created_at,id)`. The canonical Gems funding query excludes active allocations from both advantage and boutique allocation tables. |
| D12 | Atomicity/rollback | One `runImmediateTransaction` validates lineage, archive state, term, XP/specialty, behaviour, uniqueness, and authoritative funds; inserts purchase, unit spends, allocations, receipt, and group-correction lock; then returns balances. Any error rolls back every row and lock. Avatar equip is deliberately a separate explicit operation and cannot be partially hidden inside purchase. |
| D13 | Idempotency | Purchase requires a syntactically valid UUID-v4 `Idempotency-Key`, unique by `(owner_teacher_id,key)` in `boutique_purchase_requests`. The SHA-256 fingerprint covers operation, owner, student, stored year, item, and resolved term; the receipt stores `purchase_id` and `resulting_emerald_balance`. Exact replay returns `200` with the original purchase DTO and original resulting balance, creates no spend/equip, and does not re-evaluate policy. Same key with any semantic difference returns `409 IDEMPOTENCY_CONFLICT`. First success is `201`; failed transactions leave no receipt and are retryable with the same key. |
| D14 | Concurrency/stale balance | The API accepts no expected balance. `BEGIN IMMEDIATE`, authoritative unallocated funding selection, unique ledger source units, unique spend links, and allocation constraints serialize competing purchases. Insufficient funds or a race returns `409 INSUFFICIENT_EMERALDS`; no negative balance, duplicate ownership, reused funding, or partial receipt may commit. |
| D15 | Behaviour spending policy | Reuse `canSpendGem` and the Gems active-session validation: if a group has an active session, its `sessionId` is required and the student must be in that session roster. NORMAL and VIGILANCE allow purchase; ALERT and RED_CODE return `409 BEHAVIOUR_RESTRICTED`. With no active session, `sessionId:null` is allowed. Boutique never changes lives, grades, XP, RT, or behaviour evidence. |
| D16 | Purchase versus equip | Purchase grants annual ownership only. It never edits `avatar_profiles`. UI changes from **Comprar** to **Equipar** after success; only a separate, explicit teacher action calls existing `PUT /students/:studentId/avatar` with `expectedRevision`, a new UUID-v4 key, and the full profile. Cancel leaves the purchased item unequipped. |
| D17 | Avatar revision integration | Equip is a normal Avatar Core `UPDATE`, appending the complete snapshot and actor through existing revision/head/request atomicity. History needs no new operation. Revert must run the target snapshot through the same catalogue and boutique availability checks before appending; unavailable targets return `409 AVATAR_ITEM_UNAVAILABLE`. Purchase history and avatar history remain linked by stable item/student/year identity, not a fragile revision FK. |
| D18 | Restore and no bypass | Direct PUT, boutique-driven equip, and revert all use one injected availability adapter. Unknown/wrong-category IDs remain `422`; known but unowned, level-locked, specialty-locked, or term-locked IDs return `409 AVATAR_ITEM_UNAVAILABLE`. Database checks include every M9 ID, but DB membership never substitutes for entitlement checks. |
| D19 | Database constraints | Migration `0018_m9_boutique` adds FK `RESTRICT`s, `currency='EMERALD'`, `cost BETWEEN 1 AND 3`, non-empty IDs/fingerprints, unique purchase identity, owner/key receipt PK, unique `(purchase_id,funding_movement_id)`, unique `spend_movement_id`, unique `funding_movement_id` within boutique, and indexes for student/year reads. Service validation enforces cross-table owner/year/source lineage and cross-allocation exclusivity that SQLite cannot express across two tables. |
| D20 | Teacher read model | `GET /api/v1/students/:studentId/boutique?academicYearId=` returns exactly `{studentId,academicYearId,catalogueVersion,currentTerm:'T1'|'T2'|'T3'|null,emeraldBalance,editable,items:[...]}`. Each ordered item is `{id,category,label,cost,minLevel,requiredSpecialtyCategory,availableFromTerm,owned,equipped,status}` where status is the current eligibility `AVAILABLE|LOCKED_LEVEL|LOCKED_SPECIALTY|LOCKED_TERM`; `owned` independently records annual ownership. Only boutique items appear. No ledger rows, funding IDs, request keys, teacher IDs, or history are returned. |
| D21 | Purchase API | `POST /api/v1/students/:studentId/boutique-purchases?academicYearId=` accepts strict `{itemId,sessionId:null|UUID}` and returns exactly `{purchaseId,studentId,academicYearId,itemId,currency:'EMERALD',cost,emeraldBalance,purchasedAt,replay}`. Auth/owner absence is indistinguishable `404`; malformed/key/unknown item is `422`; conflicts use typed `409`; unexpected/SQLite busy is safe `500/503` and never reported as success. |
| D22 | Spanish teacher UX/errors | Add **Boutique del avatar**, **Esmeraldas disponibles**, **Comprar por N esmeralda(s)**, **Comprado**, **Equipar**, **Equipado**, **Disponible desde Tn**, and clear level/specialty requirements inside `AvatarWorkflow`. Pending copy is **Comprando…** and disables duplicate actions. Map insufficient funds, behaviour restriction, term/level/specialty lock, stale avatar, archived context, and session expiry to specific Spanish messages; ambiguous network failure retains the same purchase key and offers **Reintentar**. Context change aborts/suppresses stale completion. |
| D23 | Workspace integration | Extend the existing student panel; do not add a route or parallel shop. Load boutique state with avatar data for the selected student/year using existing request-generation isolation. Purchase refreshes boutique and Gem summaries; equip refreshes avatar/history and classroom cards on their next canonical read. Empty means “no purchasable items for this catalogue,” not a fabricated entitlement. |
| D24 | Projection/privacy | `RestrictedAvatarDto`, `ClassroomStudentDto`, Show Student, and projection routes remain shape-identical. They may render an equipped M9 profile ID through shared `AvatarPreview`, but expose no catalogue access metadata, ownership, price, purchase ID/time, request receipt, funding allocation, or avatar history. Server allowlists remain the boundary; no client filtering is accepted. |
| D25 | Audit and M10 evidence | Immutable purchase/rule/eligibility snapshots + request receipt + canonical spend/allocation rows prove who bought what, for which student/year/term, under which level/specialty rule and observed eligibility, at what catalogue price, and with which Emerald units. Avatar revision history separately proves equip/revert. M10 may compose these stable records read-only; M9 adds no generic audit feed and logs no student name, DTO body, key, or funding details. |
| D26 | No refund workflow | M9 exposes no cancel/refund/delete/reversal endpoint and emits no `SPEND_REVERSAL`. Purchases and allocations are immutable. Operational correction requires a future explicit design because reversing currency while an item is equipped creates entitlement and history semantics that this milestone must not guess. |

## 4. Architecture, data flow, and contracts

```text
AvatarWorkflow -> Boutique API -> boutique service ----------------------+
                                  | roster/calendar/XP/behaviour reads  |
                                  + Gems funding port -> gem_ledger      |
                                  + boutique purchases/allocations       |
                                  + roster correction lock               |
                                  `---- one IMMEDIATE transaction -------+

Explicit Equip -> Avatar Core PUT -> catalogue membership
                                  -> BoutiqueAvailabilityPort
                                  -> immutable avatar revision/head

Classroom/Show Student -> existing restricted mapper -> equipped profile only
```

Expected implementation boundary:

| Path | Change |
|---|---|
| `apps/api/drizzle/0018_m9_boutique.sql`, `apps/api/src/db/{schema,migrations,migrate}.ts` | Add purchase/request/allocation tables; rebuild avatar-version checks safely. |
| `apps/api/src/avatar-core/{catalogue,domain,service,routes}.ts` | Single catalogue, contextual availability injection, revert validation; preserve profile authority. |
| `apps/api/src/boutique/{domain,repository,service,routes}.ts` | Purchase rules, read model, atomic orchestration, mappings. |
| `apps/api/src/gems/{service,repository}.ts`, `apps/api/src/services/transactions.ts` | Narrow reusable spend/funding port inside the existing immediate transaction; account for both allocation tables. |
| `packages/contracts/src/index.ts` | M9 catalogue/profile IDs and exact boutique DTOs; restricted DTO shape unchanged. |
| `apps/web/src/workspace/{AvatarPreview,AvatarWorkflow,StudentPanel,workspace-api}.tsx/ts`, `apps/web/src/styles.css` | Render new IDs and integrate Spanish boutique states. |
| Focused existing/new tests beside those modules | Domain, migration, API, UI, projection privacy, and browser journey evidence. |

### Invariants

1. A successful purchase has one immutable purchase, one request receipt, exactly `cost` canonical Emerald spends, and exactly `cost` allocations; none exists partially.
2. Annual Emerald balance is always the sum of `gem_ledger`; Boutique stores no balance.
3. A funding grant is active in at most one advantage or boutique allocation.
4. At most one purchase exists per student/year/item; group correction does not change its owner year.
5. Every avatar write is valid catalogue state and every boutique selection is currently owned and eligible.
6. Purchase never equips; equip never spends; neither mutates academic, XP, RT, behaviour, rubric, grade, or narrative evidence.

## 5. Failure and privacy boundaries

- All routes require the existing teacher cookie session. Owner/year/student mismatches use `404`; archived writes fail closed. Responses use `Cache-Control: no-store` where student boutique state is returned.
- Validation order does not disclose another owner's student, purchase, balance, or catalogue status. Logs contain route/error codes and correlation only, not names, aliases, idempotency keys, request bodies, or allocation IDs.
- An ambiguous client timeout retries the same key. The UI must not infer success or locally decrement balance; it reloads authoritative state after a response.
- SQLite busy/constraint/invariant failures roll back and surface safely. Startup/migration integrity checks reject contradictory purchase/spend/allocation/avatar chains rather than repairing them silently.
- Threat matrix: N/A — normal authenticated HTTP/database work only; no shell, subprocess, executable-file classification, VCS/PR automation, or process-integration boundary is introduced.

## 6. Focused test strategy

| Layer | Required evidence |
|---|---|
| Domain/unit | Exact catalogue IDs/order/metadata; term ordering; level/specialty statuses; base/owned availability; Spanish error mapping; DTO key allowlists; renderer support/fallback. |
| Migration/SQLite | Fresh and populated `0017 -> 0018`; exact profile preservation/head FKs; expanded checks; no purchase backfill; constraint/index/FK shape; bad preflight and copy failure roll back with no marker/partial tables. |
| Service/integration | `201` purchase and `200` exact replay; key conflict; duplicate item; insufficient funds; NORMAL/VIGILANCE allowed and ALERT/RED_CODE denied; active-session matching; archived/cross-owner `404`; current-term clock boundaries; level/specialty changes; simultaneous last-Emerald purchases; exact source/reference/unit/allocation lineage; rollback injection; balance/reload; same-year group correction preservation/lock. |
| Avatar integration | Purchase does not revise; explicit equip appends once; direct PUT cannot bypass ownership/gates; unavailable revert fails; valid revert appends; stale revision/key semantics remain canonical; M7 base profiles remain valid. |
| Web component/integration | Spanish labels; ordered states; buy/equip separation; save/cancel; pending disabled state; same-key retry; balance refresh; stale selected-student suppression; archived/read-only; responsive/keyboard/focus/live-region behavior. |
| Privacy/regression | Exact restricted/classroom/show-student DTOs remain unchanged; an equipped cosmetic renders, while purchase/catalogue metadata and representative private values are absent from payloads, DOM, URLs, storage, and logs. |
| Focused built-artifact Playwright before Ship | Teacher opens one student, observes locks, purchases with Emeralds, confirms no auto-equip, explicitly equips, reloads persistence, sees Classroom/Show Student render only the equipped profile, and exercises insufficient/policy-denied/retry states. This is planned evidence only; Design runs no Playwright. |

## 7. Acceptance criteria

- [ ] **AC-01:** The exact D04 `m9-v1` catalogue is the only source for API order, validation, purchase metadata, and rendering IDs; M7 base items remain available.
- [ ] **AC-02:** Purchases are immutable, unique per student/year/item, survive same-year group correction, remain readable when archived, and never carry to another year/student.
- [ ] **AC-03:** Every successful purchase atomically commits the D10 purchase/reference, unit spends, allocations, request receipt, and correction lock; every failure commits none.
- [ ] **AC-04:** Emerald balance remains canonical `gem_ledger` sum; concurrent/stale clients cannot overspend, reuse funding, create negative balance, or create duplicate ownership.
- [ ] **AC-05:** Required UUID-v4 exact replay returns the original semantic result without another spend/equip; changed-key semantics return `409` without leakage or partial state.
- [ ] **AC-06:** NORMAL/VIGILANCE purchases are permitted and ALERT/RED_CODE purchases are denied through the existing policy; no boutique action alters behaviour or academic evidence.
- [ ] **AC-07:** Term, level, specialty, ownership, archive, and catalogue gates cannot be bypassed by direct Avatar PUT or revert.
- [ ] **AC-08:** Purchase and equip are separate explicit teacher actions; equip/revert use Avatar Core revision/history/CAS and no second avatar state exists.
- [ ] **AC-09:** The bounded D20/D21 contracts, Spanish UX, loading/empty/error/retry/disabled/read-only states, persistence reload, accessibility, and responsive layouts behave as specified.
- [ ] **AC-10:** Projection and Show Student render equipped cosmetics through the shared renderer while their DTO shapes expose no boutique metadata or private audit evidence.
- [ ] **AC-11:** No refund, reversal, Ruby/Diamond sale, account, ranking, upload, stock, scheduler, marketplace, generic commerce/audit engine, or M10 UI is introduced.
- [ ] **AC-12:** Migration preserves all M7 revisions/heads and existing Gem evidence, adds no synthetic purchase/spend, and fails atomically on contradictory data.
- [ ] **AC-13:** Purchase, ledger/allocation, receipt, and avatar revision records provide stable M10-compatible evidence without making M10 a runtime dependency.
- [ ] **AC-14:** B-01 and C-01 remain explicit rollout conditions.

## 8. Migration and rollout

`0018_m9_boutique` is forward-only. It preflights all profile IDs/heads and owner/year lineage, creates boutique tables/indexes, and transactionally rebuilds `avatar_profile_versions` (and its head FK as required by SQLite) with the expanded exact ID checks while copying every value unchanged. It verifies row counts, revision heads, `foreign_key_check`, and zero seeded purchases/spends before writing the migration marker. Existing M7 items are BASE; there is no entitlement or ledger backfill.

Deploy migration/API before web. Smoke one base edit, locked item, purchase/replay, explicit equip/reload/revert, same-year group correction, and unchanged classroom/show-student payload. Rollback is application rollback only after migration; additive boutique tables and expanded checks may remain unused. Do not down-migrate, delete purchase evidence, or synthesize refunds.

**B-01 remains open:** legacy XP without trustworthy term identity stays annual-only; Boutique uses annual level plus the canonical current calendar term and never timestamp-infers historical term attribution.
**C-01 remains open:** real student data/production use remain blocked until retention/deletion including backup expiry and executed encrypted-restic restore verification are complete.

## 9. Risks, review, and Simplicity Check

| Risk | Control |
|---|---|
| Dual wallet or overspend | Existing ledger only; immediate transaction; shared funding selector; cross-allocation invariant tests. |
| Entitlement bypass | One contextual availability adapter on PUT and revert; DB checks are defense, not authorization. |
| Group/year drift | Purchase snapshots canonical year/owner; same-year correction tests; existing correction lock. |
| Projection leakage | Restricted DTOs unchanged; server allowlist and negative key/value tests. |
| Catalogue/profile drift | One ordered code catalogue; exact migration checks; shared renderer. |

**Level C / Terra:** Level C is warranted by the populated SQLite table rebuild and atomic cross-domain spend/entitlement/privacy boundaries. A targeted Terra review would be justified before Build, but the maintainer did not request it; this phase does not invoke Terra or make review a prerequisite inside this task.

**Simplicity Check:** M9 adds only one static catalogue extension, one immutable purchase aggregate, one request receipt, and one allocation table while reusing the canonical Gem ledger, behaviour policy, Avatar Core history/CAS, workspace, renderer, and restricted DTOs. Static cumulative term gates avoid inventory scheduling; purchase/equip separation avoids a distributed transaction; no refund is safer than guessing reversal semantics. No material design question remains unresolved.

**DESIGN READY — stop after Sol Design; do not enter review, Build, Verify, Ship, Playwright, or Git/VCS in this task.**
