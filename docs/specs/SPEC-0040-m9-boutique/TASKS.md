# Tasks: SPEC-0040 M9 Boutique / Avatar Cosmetics

## Expected Change Surface

- API: `apps/api/drizzle/0018_m9_boutique.sql`; `apps/api/src/db/{schema,migrations,migrate}.ts`; `apps/api/src/avatar-core/{catalogue,domain,service,routes}.ts`; new `apps/api/src/boutique/{domain,repository,service,routes}.ts`; `apps/api/src/gems/{service,repository}.ts`; `apps/api/src/services/transactions.ts`.
- Contracts/web: `packages/contracts/src/index.ts`; `apps/web/src/workspace/{AvatarPreview,AvatarWorkflow,StudentPanel,workspace-api}.tsx/ts`; `apps/web/src/styles.css`; focused tests beside changed modules.

## Read Order

1. This Design, especially D02–D25, Sections 4–8, and AC-01–AC-14.
2. `apps/api/src/db/{schema,migrations,migrate}.ts` and `apps/api/drizzle/0017_avatar_core.sql`.
3. Avatar Core, Gems, behaviour policy, roster/calendar/XP services and transaction tests.
4. `packages/contracts/src/index.ts` and existing Avatar/workspace tests/components.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## Bounded Cohesive Task Slices

### Slice 1 — Migration and persistence foundation

- [x] 1.1 Add `0018_m9_boutique` tables, indexes, FKs/checks, and safe avatar-version rebuild; register schema declarations/migration preflight/postflight without backfill.
- [x] 1.2 Test fresh/populated `0017→0018`, preservation/head FKs, rollback on bad preflight/copy failure, integrity checks, constraints, and zero synthetic purchases/spends. Evidence: focused migration/SQLite Vitest tests.

### Slice 2 — Catalogue, contracts, and availability rules

- [x] 2.1 **RED first:** add domain tests for exact `m9-v1` order/metadata, cumulative terms, level/specialty/ownership statuses, DTO allowlists, and base-item compatibility.
- [x] 2.2 Implement the single catalogue in `avatar-core/catalogue.ts`, M9 contract schemas/types, and contextual `AvatarAvailabilityPort`; preserve renderer fallback. Evidence: domain/contract tests green.

### Slice 3 — Atomic boutique purchase/read APIs

- [x] 3.1 **RED first:** cover 201 purchase/exact 200 replay, key conflict, duplicate/insufficient funds, policy/session/archive/term/gate failures, concurrency, lineage, and injected rollback.
- [x] 3.2 Implement boutique repository/domain/service/routes plus reusable FIFO Gems funding/spend allocation inside `runImmediateTransaction`; add exact D20/D21 mappings, receipts, locks, no-store, and private read model. Evidence: focused API/service integration tests.

### Slice 4 — Avatar integration and privacy boundary

- [x] 4.1 Update direct PUT, boutique equip, and revert to one contextual availability adapter; ensure purchase never revises and equip/revert retain CAS/history semantics.
- [x] 4.2 Test ownership/gate bypass prevention, unavailable revert, valid revert, stale keys, M7 profiles, unchanged restricted/classroom/show-student DTOs, and negative private-field leakage. Evidence: Avatar integration and privacy regression tests.

### Slice 5 — Teacher workspace journey

- [x] 5.1 Extend workspace API/types and `AvatarWorkflow`/`StudentPanel` with Spanish catalogue states, explicit Comprar→Equipar flow, retry-key retention, refresh/isolation, archived/read-only, keyboard/focus/live-region and responsive states. Evidence: `workspace-api.ts`, `AvatarWorkflow.tsx`, and focused web tests.
- [x] 5.2 Test loading/empty/locked/insufficient/policy/stale/retry/purchased-not-equipped journeys and persistence/reload using focused web component/integration tests. Built-artifact Playwright remains planned before Ship, not run here. Evidence: focused `AvatarWorkflow`, `StudentPanel.failure-isolation`, and `workspace-api` Vitest tests; 27 tests passed.

## Critical Terra Verification Gate: NOT REQUIRED
