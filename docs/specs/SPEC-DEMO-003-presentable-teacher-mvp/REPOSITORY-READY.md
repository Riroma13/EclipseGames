# Repository Ready Report: SPEC-DEMO-003 — Presentable Teacher MVP

## Decision

**Repository Ready: YES**

The archived SPEC satisfies the repository-native Repository Ready gate. This authorizes only the recorded terminal state for this evaluation; the current terminal policy explicitly keeps Commit, Push, Pull Request, CI, Merge, Release, Tag, branch changes, and all other VCS handoff actions out of scope.

## Prerequisites and evidence

| Gate prerequisite | Result | Evidence |
|---|---|---|
| Repository-native archive exists | PASS | `ARCHIVE-REPORT.md` exists in `docs/specs/SPEC-DEMO-003-presentable-teacher-mvp/`; no `openspec/` tree was created. |
| Design lifecycle is archived/verified | PASS | `DESIGN.md` is marked `Archived / verified after PASS WITH WARNINGS`. |
| Verify acceptance coverage | PASS | `VERIFY-REPORT.md`: 8/8 requirements, 9/9 scenarios, 13/13 tasks, zero CRITICAL. |
| Fresh Verify runtime evidence | PASS | Default Playwright: 30/30; focused Playwright: 5/5; focused Vitest: 6 files/37 tests. |
| Repository health | PASS WITH CONDITIONS | `HEALTH-REPORT.md`: unit, typecheck, build, focused checks, and `git diff --check` pass; no BLOCKER/CRITICAL. |
| Documentation and stable routing | PASS | Archive, Verify, Health, this report, `SESSION.md`, and `ROADMAP.md` are present/updated; `DECISIONS.md` and `KNOWN_ISSUES.md` remain unchanged. |
| Scope and drift | PASS | Audited change set contains only approved workspace, browser evidence, deterministic demo seed, SDD artifacts, and stable routing files; no unapproved dependency, schema, migration, API, privacy, projection, or seed drift. |

## Current changed-file scope

The implementation/evidence scope is limited to:

- `apps/api/src/demo/seed-service.ts`
- `apps/api/test/integration/seed-demo.test.ts`
- `apps/web/src/workspace/{ClassroomSetup.tsx,StudentPanel.tsx,WorkspaceApp.tsx,WorkspaceShell.tsx,workspace-api.test.ts,workspace-api.ts,demo-presentation.test.ts}`
- `apps/web/src/styles.css`
- `apps/web/e2e/{auth-projection.spec.ts,teacher-workspace.spec.ts}`

Repository-native artifacts are under `docs/specs/SPEC-DEMO-003-presentable-teacher-mvp/`. Stable routing updates are limited to `.ai/context/SESSION.md` and `.ai/context/ROADMAP.md`. No application code, tests, seed, package/config, schema, migration, or historical artifact was modified by this gate.

## Test, build, and typecheck results

Evidence is reused from the fresh Verify and Health reports; tests were not rerun merely to force a green result.

| Command | Exit | Result | Output hash |
|---|---:|---|---|
| `pnpm test` | 0 | 24 files / 97 tests passed | `sha256:51d1825248ee7caee2327bfe1fe0d266e6ab244b8b3fde6e69fede3d87c30f4b` |
| `pnpm typecheck` | 0 | Web and API typechecks passed | `sha256:2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c3244` |
| `pnpm build` | 0 | Web and API builds passed | `sha256:e2f328d3a4910ebb13aa2a8541fb3efffcd4648e15b80654320aea453d0e0a1f` |
| `pnpm exec playwright test` | 0 | Fresh Verify default run: 30/30 passed | `sha256:a71b19519449f4e87a1d35cf808c9ef14d32ba4e67ae6a17d1228656db6159bd` |
| `git diff --check` | 0 | Passed | — |

```yaml
strict_result_envelope:
  test_command: pnpm test
  test_exit_code: 0
  test_output_hash: sha256:51d1825248ee7caee2327bfe1fe0d266e6ab244b8b3fde6e69fede3d87c30f4b
  build_command: pnpm build
  build_exit_code: 0
  build_output_hash: sha256:e2f328d3a4910ebb13aa2a8541fb3efffcd4648e15b80654320aea453d0e0a1f
  typecheck_command: pnpm typecheck
  typecheck_exit_code: 0
  playwright_command: pnpm exec playwright test
  playwright_exit_code: 0
  playwright_output_hash: sha256:a71b19519449f4e87a1d35cf808c9ef14d32ba4e67ae6a17d1228656db6159bd
```

## Privacy, security, and C-01

- Projection remains a separate fixture-backed `/` route with a server allowlist; no real names, grades/RT, rubric, comments, incidents, disciplinary reports, or history enter the projection.
- Private workspace state remains limited to opaque context identifiers in the hash; private data is not placed in URLs or browser storage.
- Existing ownership, archive/read-only, alias, batch atomicity, correction-lock, idempotency, and reversal contracts remain authoritative.
- XP remains evidence rather than a grade; teacher-facing **Eclipse Points** remains separate from internal `coin` contracts.
- **C-01 remains production-only.** Encrypted restic execution and production recoverability were not demonstrated. Real student data and production use remain blocked pending approved SPEC-0014/0016 work.

## Warnings and conditions

1. **Health full-suite warning:** the distinct Health run recorded 29/30 (and a serial diagnostic 28/30) because shared demo SQLite/fixture/order interaction caused hard-coded coin-loading/assessment tests to lose the seeded Camille roster. The affected tests pass in isolation, and fresh Verify independently recorded 30/30 with exit 0. This is accepted as known non-blocking harness instability for Repository Ready; it is not hidden or represented as a green Health full-suite result.
2. **C-01:** production-only privacy/recoverability condition remains open and is not a blocker for this repository gate.
3. **Hybrid provenance:** Apply mirrors and rollback provenance are substantively aligned but not byte-identical; repository addenda are richer than concise Engram mirrors. This is a non-blocking historical/provenance warning and Verify is not reopened.

## Exact next step

`STOP — maintainer review before Git handoff`

No further SDD verification loop, test rerun, or Git/VCS action is authorized by this gate.

## Terminal gate statement

**Repository Ready: YES.** The repository is ready for maintainer review at the pre-handoff boundary only. No Commit, Push, Pull Request, CI, Merge, Release, Tag, branch switch, or other VCS handoff action occurred.
