# SPEC-0003 Apply Summary

## Result

Corrective Apply pass 2 is complete on `spec/0003-teacher-classroom-workspace`. The failed Verify report remains preserved as the corrective defect source and was not silently discarded. No VCS delivery actions, server/contract changes, migrations, dependencies, or projection implementation changes were made. A fresh Verify is required.

## Corrective work units

### Unit A — Task 3.3 workspace contract/UI remediation

- Fixed missing tablet focus transfer/restoration, stale selection after empty/removing refresh, external-only action pending and untyped results, display-only undo, and incomplete `401` private-state clearing.
- Added local immediate action pending and duplicate suppression; typed result/undo seam; stale year/group/student completion suppression; transient undo timer/pending/callback/result/failure lifecycle; dialog/origin focus handling; selection invalidation announcement/hash removal; centralized private-state clearing for year/group/roster `401`.
- Focused command: `pnpm exec vitest run apps/web/src/workspace/*.test.ts` — PASS, 2 files / 13 tests.
- Runtime harness: N/A for pure contracts; browser focus/auth behavior is covered by Unit B.
- Rollback: `apps/web/src/workspace/{WorkspaceApp,StudentPanel,FastActionShell,UndoBanner,workspace-state}.tsx` and focused tests.
- Provenance: approved Design AC-07–AC-10, AC-12 and Sections 3.1–3.4/4.1–4.3; Task 3.3.

### Unit B — Task 4.1 E2E evidence

- Added copied `/#/workspace?...` navigation and document-request assertion for `/`; retained `/` projection smoke.
- Added canonical-roster evidence for no years, zero groups, empty group, historical-only archived read-only records, one/many groups, stale opaque selection, tablet focus restoration, and group-load `401` recovery without stale cards.
- Exact built-artifact command: `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts` — PASS, 8 tests, Fastify serving the built web artifact.
- Rollback: `apps/web/e2e/teacher-workspace.spec.ts` only; no config change required.
- Provenance: approved Design AC-01, AC-03, AC-04, AC-07, AC-10, AC-12, C-02; Task 4.1.

### Unit C — Task 3.3/4.1 corrective runtime and edge evidence

- Added a localhost-only controlled runtime harness that executes the actual `FastActionShell` and `UndoBanner` components in the built web artifact. It proves immediate pending, duplicate suppression, typed result delivery, stale context suppression, expiry announcement/removal without callback, undone/invalid/failure results, pending disablement, and replacement invalidation. No production action provider or domain mutation was introduced.
- Added built-artifact authenticated Playwright coverage for valid stale year/group reconciliation, one-group auto-selection, selected-student removal after refresh with URL/panel invalidation and announcement, and post-401 sign-in recovery/reload without stale private cards.
- Corrected workspace request gating so stale URL contexts are reconciled before dependent group/roster reads; refresh selection reconciliation preserves the selected URL context until the returned roster proves it absent. Stabilized `UndoBanner` callback delivery across parent rerenders.
- Runtime command: `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "selected student removed|actual FastAction"` — PASS, 2 tests.
- Full built-artifact command: `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts` — PASS, 12 tests, Fastify serving the built web artifact.
- Rollback: workspace implementation/tests, runtime harness, E2E, and directly necessary test-build config only.
- Provenance: approved Design AC-03, AC-07, AC-08, AC-09, AC-10, Sections 3.1–3.4/4.2, Task 3.3 and Task 4.1.

## Cumulative verification commands

- `pnpm exec vitest run apps/web/src/workspace/*.test.ts` — PASS, 2 files / 13 tests.
- `pnpm exec vitest run` — PASS, 13 files / 51 tests.
- `pnpm typecheck` — PASS (web and API).
- `pnpm build` — PASS (web and API).
- `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts` — PASS, 12 tests, built Fastify artifact.

## Acceptance, privacy, rollback, and conditions

- AC-01/03/04/07/08/09/10/12 and C-02 corrective evidence is recorded above; existing AC-02/05/06/11/13/14 evidence remains cumulative. AC-03 now includes valid stale year/group and one-group selection; AC-07 includes returned-student removal; AC-08/09 include actual component runtime; AC-10 includes post-401 recovery and reload.
- No projection endpoint/table, browser storage, private logging, client-side projection filter, API/server change, URL payload containing names, domain mutation, persistence, history, or global undo mechanism was introduced.
- C-01 remains unchanged: production use requires approved retention/deletion and encrypted-restic restore work in SPEC-0014/0016.
- Rollback removes the workspace corrective implementation/tests and E2E evidence while leaving API, contracts, migrations, Fastify serving, and `/` projection untouched.

## Phase handoff

Tasks 3.3 and 4.1 remain checked. **Ready for next phase: YES — fresh Verify required.** Run a fresh Verify; do not replace or discard the prior failed Verify report until fresh Verify produces its report.
