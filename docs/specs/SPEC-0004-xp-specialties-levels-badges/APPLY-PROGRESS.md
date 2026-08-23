# SPEC-0004 Apply Progress

Status: complete; correction work complete; ready for Verify.

## Work units

1. **Domain/schema/migration** — Completed. Added pure XP rules, level/badge derivation, migration `0004_xp_specialties_levels_badges`, Drizzle declarations, and transaction tests. Verification: `pnpm exec vitest run packages/domain apps/api/test/integration/migrations.test.ts apps/api/src/xp/repository.test.ts` passed. Runtime harness: N/A (domain/persistence unit). Rollback boundary: XP domain files, migration, schema and repository files.
2. **Private API/seams** — Completed. Added roster context adapters, contracts, idempotent private routes, mapper, bonus seam, transition-port seam, summaries and cursor validation. Verification: full Vitest suite and recursive typecheck passed. Runtime harness: Fastify-backed XP repository tests and authenticated browser API use passed. Rollback boundary: `apps/api/src/xp`, contracts, roster adapter, server registration.
3. **Workspace reconciliation** — Completed. Added Register XP category/value flow, optional note, authoritative summary replacement, feedback, pending guard and 10-second reversal capability. Verification: workspace Vitest tests plus recursive typecheck passed. Runtime harness: N/A; browser boundary covered by Unit 4. Rollback boundary: workspace API/app/panel/state changes.
4. **E2E/privacy proof** — Completed. Added focused SPEC-0004 browser flow and preserved existing projection/privacy tests. Verification: `pnpm exec playwright test apps/web/e2e/spec-0004-xp.spec.ts` and selected existing workspace specs passed. Runtime harness: authenticated browser flow passed. Rollback boundary: focused SPEC-0004 E2E file and workspace integration.

## Verify correction work units

5. **Migration ordering constraint** — Added `UNIQUE (sequence)` to the applied transition migration and a regression assertion that the SQLite table declaration enforces it. Focused verification: `pnpm exec vitest run apps/api/test/integration/migrations.test.ts apps/api/src/xp/repository.test.ts` — 7 tests passed. Runtime harness: N/A; migration/repository unit boundary. Rollback boundary: migration constraint and migration regression assertion.
6. **Workspace create-key replay** — Preserved the create idempotency key for timeout/network retries, cleared it after authoritative success or final 4xx failure, and invalidated it on student/year/group context changes. Added focused API-key replay coverage and retained existing pending/undo/context reducer coverage. Focused verification: `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts apps/web/src/workspace/workspace-state.test.ts` — 10 tests passed. Runtime harness: SPEC-0004 Playwright flow passed. Rollback boundary: workspace API key parameter, StudentPanel retry state, and focused test.
7. **Bounded group summary read** — Replaced per-student `repository.summary` mapping with one roster-left-joined aggregate read including zero-XP students and stable alias/id ordering. Added zero-row summary coverage. Focused verification: repository/API migration set — 17 tests passed. Runtime harness: authenticated SPEC-0004 Playwright flow passed. Rollback boundary: group aggregate query/read mapping and regression test.
8. **Verify coverage correction** — Added focused migration, API session/ownership/validation/replay/conflict/cursor, idempotency timeout, zero-row/no-N+1, transition REVOKE/REINSTATE, and workspace retry tests without changing the approved Design or adding a task. Full verification: `pnpm test` — 18 files / 62 tests passed; `pnpm --recursive typecheck` passed; `pnpm --recursive build` passed; `pnpm exec playwright test apps/web/e2e/spec-0004-xp.spec.ts` — 1 passed. Runtime harness: authenticated browser flow passed. Rollback boundary: correction tests and their localized implementation support.

## Conditions preserved

- C-01 remains production-only; no production data gate was relaxed.
- XP stores durable ordered GRANT/REVOKE/REINSTATE transitions only. SPEC-0005 must transactionally reconcile the transition sequence/cursor into its own ledger and prove replay safety before consuming level-up coin entitlements.
- No coins, behaviour, RT/Energy, rubric, projection contract, history/export, or new runtime dependency was introduced.

## Verification record

- `pnpm test` — 16 files / 57 tests passed.
- `pnpm --recursive typecheck` — passed.
- `pnpm --recursive build` — passed.
- `pnpm exec playwright test apps/web/e2e/spec-0004-xp.spec.ts` — passed.
- `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts --grep "canonical hash route boots|historical-only|actual FastActionShell"` — 3 passed.
- Correction focused set — 5 files / 19 tests passed.
- Correction Playwright — 1 passed.
