# SPEC-0004 Apply Summary

## Scope delivered

Implemented the approved XP evidence domain, annual levels, specialties, badges, private API, durable transition seam, and teacher workspace action without introducing coin, behaviour, RT, rubric, projection, history, or export scope.

## Files and rollout

- Added XP domain modules/tests and migration `0004_xp_specialties_levels_badges`.
- Added XP repository/service/routes/contracts and transition-port seam.
- Exported only the roster-owned academic context adapters needed by XP.
- Added workspace registration, summary reconciliation, feedback and correction capability.
- Added focused API/domain/workspace/browser verification.

Migration is forward-only and runs before API startup through the existing migration runner. Existing evidence/history must not be deleted for rollback; post-write correction is forward-only or restore-based.

## Verification

`pnpm test`, `pnpm --recursive typecheck`, `pnpm --recursive build`, focused Playwright SPEC-0004 flow, and selected existing workspace E2E scenarios pass.

## Verify correction evidence

- Migration now enforces `UNIQUE (sequence)` in SQLite, with a regression test.
- Workspace create retries retain the original idempotency key across timeout/network failure, while success, final 4xx failure, and context invalidation clear stale operation state.
- Group summaries use one bounded roster-left-joined aggregate read, include zero-XP students, and preserve `alias COLLATE NOCASE, id` ordering.
- Added focused API contract/cursor, replay/conflict, migration, zero-row summary, transition revoke/reinstate, and workspace key tests. Correction validation: `pnpm test` — 18 files / 62 tests; `pnpm --recursive typecheck`; `pnpm --recursive build`; `pnpm exec playwright test apps/web/e2e/spec-0004-xp.spec.ts` — 1 passed.

## Conditions and risks

C-01 remains a production-only privacy/recoverability gate. SPEC-0005 must transactionally reconcile the ordered XP transition sequence/cursor into its own ledger, using unique source transition identity, before consuming level-up coin entitlements; XP intentionally does not implement that ledger.
