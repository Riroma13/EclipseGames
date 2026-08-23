# SPEC-DEMO-001 — Refreshed Post-Archive Health Report

**Change:** `spec-demo-001-client-preview-mvp`  
**Branch:** `spec/demo-001-client-preview-mvp`  
**Health date:** 2026-08-23  
**Artifact store:** hybrid (repository-native artifact plus Engram)  
**Status:** **PASS WITH CONDITIONS**  
**Phase status:** `success`  
**Next recommended:** `Repository Ready`  
**Skill resolution:** `paths-injected`
**Engram observation:** `2085` — `sdd/spec-demo-001-client-preview-mvp/health-report`

## Executive summary

SPEC-DEMO-001 remains healthy for fictional development/demo evidence after a localized test-harness stabilization. The only post-Health source correction is a per-test 15-second timeout on the nested production-guard `spawnSync('pnpm seed:demo')` test. Fresh canonical tests, direct Vitest, typecheck, and production-seed refusal pass; the corrected focused seed file passed three consecutive runs. Seed behavior and assertions are unchanged.

The correction is **NON-BLOCKING** and test-only: it accommodates proven process/CPU contention that exceeded Vitest's default five-second budget. It introduces no product behavior, dependency, schema, migration, privacy, auth, projection, or scope drift. Prior Health, Verify, and Archive evidence remains preserved and authoritative for the archived build and Playwright runs.

**C-01 remains exactly a production-only privacy/recoverability condition.** It does not block fictional demo evidence or this Health phase, but real student data and production use remain blocked until the approved retention/deletion, backup-expiry, and encrypted-restic restore work is complete.

## Evidence summary

| Area | Result | Classification | Current evidence |
|---|---|---|---|
| Package/runtime/workspace | PASS | NON-BLOCKING | Root pnpm workspace remains React/Vite, Fastify, SQLite/Drizzle, TypeScript, Vitest, and Playwright across the existing five projects. |
| Dependency/configuration hygiene | PASS | NON-BLOCKING | `package.json` retains the approved `seed:demo` script; `pnpm-lock.yaml` and workspace dependency configuration are unchanged; no dependency was added. |
| Database path/migrations/schema | PASS | NON-BLOCKING | Existing database-path, migration, transaction, and schema tests pass; the demo seed still guards production before opening the database and adds no migration/schema change. |
| Production seed refusal | PASS | NON-BLOCKING | Fresh `NODE_ENV=production DATABASE_URL=<fresh /tmp path> pnpm seed:demo` exited 1 with `Demo seed refused in production.`; the configured database path remained absent. |
| Privacy/auth/projection | PASS | NON-BLOCKING | Fresh full suite includes auth, roster DTO, projection, XP-route, ownership, and 401 recovery contracts; no privacy or projection surface changed. |
| Test-harness correction | PASS | NON-BLOCKING | `seed-demo.test.ts` has only the localized 15-second timeout on the nested production-guard process test; seed behavior/assertions are unchanged. Three focused runs passed. |
| Scope/dependency/privacy drift | PASS | NON-BLOCKING | Bounded review found no product, route, auth bypass, direct-table seed shortcut, projection expansion, future-domain UI, ranking, dependency, migration, or private-data drift. |
| Tests and discovery | PASS | NON-BLOCKING | Fresh `pnpm test`: 20 files / 68 tests; fresh `pnpm exec vitest run`: 20 files / 68 tests; both exited 0. |
| Typecheck | PASS | NON-BLOCKING | Fresh `pnpm typecheck` passed for API and web, exit 0. |
| Build and Playwright | PASS (archived evidence) | NON-BLOCKING | Archive/Verify preserve `pnpm build` exit 0, full Chromium Playwright 18/18, and focused workspace/SPEC-0004 Chromium 17/17. They were not rerun because this refresh is read-only health evidence. |
| SDD lifecycle consistency | PASS | NON-BLOCKING | Archive remains successful; Verify remains PASS WITH WARNINGS; AC 15/15 and Tasks 10/10 remain current. No lifecycle artifact was modified by the harness correction. |
| Diff/working-tree hygiene | PASS | NON-BLOCKING | `git diff --check` passed. The expected active SPEC implementation/context/artifact working set remains; no staging or VCS mutation was performed. |
| Rollback/readiness | CONDITION | CONDITION | Rollback remains removal of the SPEC working set and seed command without data rollback. Repository Ready was not run. |
| C-01 | CONDITION | CONDITION | Production-only retention/deletion, backup-expiry, and encrypted-restic restore proof remain outstanding. This is not a fictional-demo Health blocker. |
| Lint tooling | N/A | NON-BLOCKING | No lint script or lint configuration is present in the inspected workspace; no lint command was invented. |

## Fresh command evidence

| Command | Exit | Result |
|---|---:|---|
| `pnpm test` | 0 | PASS — 20 files / 68 tests |
| `pnpm exec vitest run` | 0 | PASS — 20 files / 68 tests |
| `pnpm typecheck` | 0 | PASS — API and web TypeScript checks |
| `pnpm exec vitest run apps/api/test/integration/seed-demo.test.ts` (run 1) | 0 | PASS — 3 tests |
| Same focused seed command (run 2) | 0 | PASS — 3 tests |
| Same focused seed command (run 3) | 0 | PASS — 3 tests |
| `NODE_ENV=production DATABASE_URL=<fresh isolated /tmp path> pnpm seed:demo` | 1 | PASS by expected refusal; no database file created |

## Archived evidence preserved

- `pnpm build`: exit 0, SHA-256 recorded in `VERIFY-REPORT.md` and `ARCHIVE-REPORT.md`.
- `CI=1 pnpm exec playwright test`: 18 Chromium tests passed, exit 0, SHA-256 recorded in the archived reports.
- Focused workspace/SPEC-0004 Playwright suite: 17 Chromium tests passed, exit 0, SHA-256 recorded in the archived reports.
- The prior failed Verify and successful authorized rerun remain historical/current evidence respectively; neither was rewritten.

## Findings and classification

### BLOCKER

None found.

### CONDITION

- **C-01 production privacy/recoverability:** encrypted-restic execution/restore proof, retention/deletion controls, and backup-expiry controls remain required before real student data or production use.
- **Repository Ready:** Health is complete, but Repository Ready remains a separate next phase and was intentionally not run. No Git handoff is authorized in this run.

### NON-BLOCKING

- **Localized test-harness stabilization:** the 15-second timeout is limited to the nested process test and addresses observed runner contention. It does not alter seed logic, data, assertions, product code, dependencies, or lifecycle artifacts.
- **No lint tooling:** no repository lint command/configuration is available. This is a tooling gap, not a SPEC health blocker; typecheck, Vitest, archived build, and archived Playwright evidence remain available.

## Lifecycle result

```yaml
status: success
change: spec-demo-001-client-preview-mvp
health_verdict: PASS WITH CONDITIONS
artifacts:
  repository: docs/specs/SPEC-DEMO-001-client-preview-mvp/HEALTH-REPORT.md
  session_context: .ai/context/SESSION.md
  engram_topic: sdd/spec-demo-001-client-preview-mvp/health-report
  engram_observation: 2085
requirements_assessed: 15
requirements_passed: 15
tasks_checked: 10/10
fresh_test_command: pnpm test
fresh_test_exit_code: 0
fresh_test_files: 20
fresh_test_count: 68
fresh_vitest_command: pnpm exec vitest run
fresh_vitest_exit_code: 0
typecheck_command: pnpm typecheck
typecheck_exit_code: 0
focused_seed_stability: 3 consecutive passes, 3 tests each
production_seed_refusal: expected exit 1; fresh path absent
build_evidence: archived PASS
playwright_evidence: archived PASS (18 full, 17 focused Chromium tests)
blockers: 0
conditions: 2
c01: production-only privacy/recoverability condition preserved
test_harness_correction: localized non-product stabilization; no behavior/assertion change
repository_ready: not_run
vcs_actions: none
next_recommended: Repository Ready
risks:
  - C-01 remains a production-only privacy/recoverability condition.
  - No repository lint tooling is configured.
skill_resolution: paths-injected
```

## Artifacts and traceability

- Repository artifact: `docs/specs/SPEC-DEMO-001-client-preview-mvp/HEALTH-REPORT.md`
- Authoritative prior artifacts: `DESIGN.md`, `TASKS.md`, `APPLY-PROGRESS.md`, `APPLY-SUMMARY.md`, `VERIFY-REPORT.md`, `ARCHIVE-REPORT.md`
- Engram topic: `sdd/spec-demo-001-client-preview-mvp/health-report`

**Exact next step:** `Repository Ready`. Do not run Repository Ready or Automated Git Handoff in this task.
