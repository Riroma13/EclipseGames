# SPEC-0004 Health Report

**Health verdict:** **PASS WITH CONDITIONS**  
**Status:** success  
**Date:** 2026-08-22  
**Branch:** `spec/0004-xp-specialties-levels-badges`

The repository passes the relevant post-Archive health gate. Runtime, typecheck, build, browser, migration, privacy, scope, and diff-hygiene evidence is current. No health blocker was found.

## Evidence

| Area | Command / inspection | Result |
|---|---|---|
| Full tests | `pnpm test` | Exit 0; 18 files / 62 tests passed |
| Typecheck | `pnpm --recursive typecheck` | Exit 0; API and web passed |
| Build | `pnpm --recursive build` | Exit 0; API and web passed |
| SPEC-0004 browser flow | `pnpm exec playwright test apps/web/e2e/spec-0004-xp.spec.ts` | Exit 0; 1 passed |
| Workspace browser evidence | `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts --grep "canonical hash route boots\|historical-only\|actual FastActionShell"` | Exit 0; 3 passed |
| Diff hygiene | `git diff --check` | Pass |
| Branch | `git branch --show-current` | Expected SPEC-0004 branch |
| Coverage | `package.json`, `VERIFY-REPORT.md` | No coverage threshold configured |

The focused browser results remain authoritative and were re-run during this health phase. The full-suite result is also fresh; it confirms the prior Verify evidence.

## Health checks

### Migration and schema state

- `apps/api/drizzle/0004_xp_specialties_levels_badges.sql` is registered after migrations `0001`–`0003`.
- Migration tests passed for ordered application, repeatability, transaction rollback, and failure-closed startup behavior.
- `openDatabase()` runs `migrateDatabase()` before exposing the database; migration failure closes the database and blocks startup.
- The SPEC-0004 schema preserves forward-only evidence: immutable events, target-unique reversals, durable level transitions with unique sequence, and badge/unlock uniqueness constraints.

### Privacy and domain boundaries

- Projection/privacy tests passed, including allowlist behavior and Show Student restrictions.
- XP routes are authenticated teacher-private routes; the focused browser flow confirms XP feedback in the private workspace.
- Source inspection found no XP fields added to projection DTOs/routes.
- Source inspection found no forbidden expansion into coins, behaviour, assessment, projection, history/export, or a generic event bus.

### Dependency and configuration drift

- No package manifest or lockfile dependency changes are present.
- No CI workflow files are present; this repository has no additional CI configuration to validate.
- The only test configuration change in scope adds `apps/api/src/**/*.test.ts` to Vitest discovery, matching the preserved SPEC-0004 repository tests.

### SDD lifecycle and handoff

- Archive, Design, Tasks, Apply, and Verify artifacts are present and internally consistent: 15/15 tasks, 14/14 acceptance criteria, zero critical findings.
- `.ai/context/SESSION.md` records the Health result and the exact next step as `Repository Ready`.
- `.ai/context/ROADMAP.md` still names Health Report as the SPEC-0004 next step because this phase is constrained to update `SESSION.md` only; this is a documentation follow-up outside the permitted health side effects, not an implementation or health blocker.

### Diff and scope hygiene

- The working tree is intentionally not clean because the SPEC-0004 implementation and preserved SDD artifacts are the current branch work set.
- The inspected modified/untracked paths are limited to the SPEC-0004 implementation, its tests/schema, required test discovery, expected lifecycle context, and `docs/specs/SPEC-0004-xp-specialties-levels-badges/` artifacts.
- No VCS delivery action was performed.

## Preserved conditions

- **C-01 remains production-only:** real student data and production use remain blocked until the approved SPEC-0014/0016 retention/deletion, backup-expiry, and encrypted-restic restore conditions are complete. This is not a health failure.
- **SPEC-0005 transition condition remains:** SPEC-0005 must transactionally reconcile the ordered transition ledger/cursor and prove replay safety before consuming level-up coin entitlements. This is not a health failure.

## Remaining conditions and recommendation

The repository is ready for the next workflow gate. The production-only C-01 and the downstream SPEC-0005 reconciliation condition remain explicitly preserved. The next exact step is **Repository Ready**. No commit, push, merge, PR, release, tag, or other VCS delivery is authorized by this report.

## Changed paths

- `docs/specs/SPEC-0004-xp-specialties-levels-badges/HEALTH-REPORT.md`
- `.ai/context/SESSION.md`
