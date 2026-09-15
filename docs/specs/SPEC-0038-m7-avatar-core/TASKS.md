# Tasks: SPEC-0038 M7 Avatar Core

## Expected Change Surface

- `apps/api/drizzle/0017_avatar_core.sql`; `apps/api/src/db/{schema,migrations}.ts`.
- New `apps/api/src/avatar-core/` domain, repository, service, mapper, routes, ports, and focused tests; bounded roster creation/route updates, route registration in `apps/api/src/server.ts`, and `packages/contracts/src/index.ts`.
- New `apps/web/src/workspace/AvatarPreview.tsx`; bounded `StudentCard.tsx`, `StudentPanel.tsx`, `workspace-api.ts`, styles, and focused tests. Projection files are read-only test observations.

## Explicit Read Order

1. `DESIGN.md` §§2–4, 6–9: scope, contracts, privacy, rollout, acceptance, and slicing.
2. `apps/api/src/db/{schema,migrations,migrate}.ts`, existing migration SQL, and roster/XP/auth route-service-mapper tests.
3. `packages/contracts/src/index.ts` and `apps/api/src/server.ts` for DTO and registration conventions.
4. `apps/web/src/workspace/{StudentCard,StudentPanel,workspace-api}.tsx/ts` and adjacent tests/styles.
5. Projection mapper/routes/fixtures only to assert unchanged boundaries.

## Review Workload Forecast

Estimated changed lines: 700–1,000; 400-line budget risk: High; chained PRs recommended: Yes.
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## Bounded Implementation Slices

1. **Catalogue/domain contracts (RED → GREEN):** test exact IDs, legacy mappings, specialty/XP rules, DTO allowlists, availability seam, and renderer fallback; implement `avatar-core` domain plus contract types. Depends on existing domain/roster/XP conventions.
2. **Migration and backfill (RED → GREEN):** add `0017_avatar_core`, schema/migration registration, and tests for fresh/populated installs, five-token mapping, inert repeat startup, constraints/indexes, bad-data atomic rollback, and transactional new-student creation. Depends on slice 1.
3. **Persistence and service (RED → GREEN):** implement profile head/immutable versions/request receipts, create/update/revert, ownership/archive rules, expected-revision concurrency, UUID-v4 idempotency and exact/conflicting replay tests. Depends on slices 1–2.
4. **HTTP and privacy boundary (RED → GREEN):** add catalogue and teacher avatar routes, server-derived XP fields, owner-as-404, year validation, allowlist mappers, roster compatibility freeze, route registration, and API/SQLite integration tests including Projection invariance. Depends on slice 3.
5. **Shared web workflow (RED → GREEN):** add deterministic `AvatarPreview`, card/panel integration, Spanish editor/history labels, loading/disabled, cancel, retained-draft retry, stale, archived, invariant-error, responsive/accessibility, and selected-student race tests. Depends on slice 4.
6. **Focused end-to-end evidence:** after all slices, run the built-artifact teacher edit/save/reload/revert/stale journey and confirm Classroom/Projection privacy; record evidence in the later verification phase. Depends on slices 1–5; no Playwright in planning.

## Acceptance / Evidence Mapping

- Slices 1–2 prove catalogue, mappings, L8/excess XP, DTO privacy, exactly one profile/revision, migration safety, and B-01/C-01 remain open.
- Slices 3–4 prove append-only history, revert reason, idempotency/concurrency, ownership/archive/invalid-input fail-closed behavior, and no academic/Projection mutation.
- Slice 5 proves renderer parity and all specified teacher UI states; slice 6 proves persistence, recovery, and no restricted-data leakage.
- Threat matrix is explicitly N/A; no threat-specific RED test is required.

## Critical Terra Verification Gate

Critical Terra Verification Gate: REQUIRED

Design explicitly requires the Level C Terra review before Build because this combines a populated migration with a student-data allowlist and restricted-consumer seam. Terra is not invoked in this planning-only task.
