# Repository Health Report

**Date:** 2026-08-22  
**Project:** eclipsegames  
**Scope:** Archived SPEC-0002 — Academic Years, Groups, and Students  
**Health result:** **PASS WITH CONDITIONS**

Fresh lightweight health checks pass for the SPEC-0002 implementation, including build, typecheck, full Vitest, focused roster/API/privacy/migration/avatar coverage, Playwright projection smoke, Compose configuration, and the established Docker image build. No repository-health BLOCKER was found. C-01 remains the sole production-only condition: `restic` is unavailable on this host, so encrypted restic backup/restore execution has not been demonstrated. This report is evidence for—not itself—the Repository Ready decision.

## Command evidence

| Check | Command | Exit | Result |
|---|---|---:|---|
| Build | `pnpm build` | 0 | PASS — web Vite build and API TypeScript build completed |
| Typecheck | `pnpm typecheck` | 0 | PASS — web and API checks completed |
| Root tests | `pnpm exec vitest run` | 0 | PASS — 11 files, 38 tests |
| Focused roster/API/privacy/migration tests | `pnpm exec vitest run apps/api/test/privacy/roster-dto.test.ts apps/api/test/privacy/projection.test.ts apps/api/test/integration/migrations.test.ts apps/api/test/integration/roster.test.ts apps/api/test/integration/roster-core.test.ts apps/api/test/integration/database-path.test.ts` | 0 | PASS — 6 files, 27 tests; roster, API, privacy, migration, schema/path, fixture and avatar coverage |
| Avatar regression | `pnpm exec vitest run apps/api/test/integration/roster-core.test.ts -t "persists every permitted avatar"` | 0 | PASS — 1 authenticated regression test; 6 unrelated tests skipped |
| Authenticated roster runtime | `pnpm exec vitest run apps/api/test/integration/roster-core.test.ts -t "runs the authenticated year, group, and batch workflow through Fastify"` | 0 | PASS — 1 runtime workflow test; 6 unrelated tests skipped |
| Projection smoke | `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts` | 0 | PASS — Chromium 1/1; teacher authentication and classroom-safe projection |
| Compose topology | `docker compose config` | 0 | PASS — one app service, private data volume, healthcheck and production path |
| Docker image | `docker build -q -t eclipse-games:health-report .` | 0 | PASS — image built; digest `sha256:77957ec12ac699ce79098e5db895496ae500d2b7dd3b5516b08c6fc936bbe284` |
| Restic availability | `command -v restic && restic version` | 1 | UNAVAILABLE — `restic` is absent; recorded as C-01 evidence |

No coverage command is configured or required by the archived Design; no coverage claim is made. No dependencies were installed and no VCS action was performed.

## Findings

### Migration and schema

- Migration tests pass for ordered, repeatable registration: `0001_foundation → 0002_auth_projection → 0003_academic_roster`.
- Existing migration evidence covers transactional rollback, fail-closed startup behavior, foreign keys, `RESTRICT` references, date and non-empty checks, explicit ASCII `NOCASE` uniqueness, partial active-alias uniqueness, archive state, and correction-lock constraints.
- `projection_students` remains fixture-only; roster persistence uses `academic_years`, `groups`, and `students`.
- The focused avatar regression confirms the five permitted tokens (`default`, `fox`, `owl`, `cat`, `wolf`) align across validation, SQLite persistence, and authenticated runtime creation.

### Privacy boundary

- Focused tests pass for anonymous/revoked access rejection, ownership-as-`404`, payload-free diagnostics, separate teacher-private and classroom-safe DTO allowlists, negative private-field assertions, and rejection of browser `fields` filtering/private DTO fallback.
- Playwright projection smoke passes with teacher authentication required and classroom-safe rendering preserved. No roster UI was added; API integration remains the approved SPEC-0002 workflow proof.

### Dependency and architecture drift

- `package.json`/lockfile, workspace manifests, Vitest and Playwright ownership, React/Vite web, Fastify API, SQLite/Drizzle persistence, pure TypeScript domain, and one-service Docker topology remain coherent with accepted DEC-011 and the archived SPEC-0002 Design.
- No new dependency, product-domain module, public/student endpoint, client-side privacy filter, or non-goal implementation was found. No concrete dependency or architecture drift was identified.

### Stale SDD context

- SPEC-0002 Design is Archived; Tasks 1.1–4.3 are checked; Apply Summary, Verify Report, and Archive Report are present.
- `ROADMAP.md` identifies SPEC-0002 as archived and SPEC-0003 as the next product dependency.
- `SESSION.md` has been updated by this phase to record Health Report completion, preserve C-01, and name the exact next SDD step: `Repository Ready determination`.
- The archived SPEC reports retain their historical contemporaneous next steps; the active SESSION handoff is authoritative for the next phase.

## Conditions, warnings, and blockers

**BLOCKERS:** None found.

**CONDITION — C-01 (production-only):** Before real student data or production use, SPEC-0014/0016 must define and implement retention and deletion including backup expiry, and demonstrate quarterly encrypted-restic restore verification. Host `restic` is unavailable (`command -v restic && restic version` exited 1); a local fixture restore would not be encrypted-restic proof. C-01 is not a repository-health failure and does not decide Repository Ready here.

**NON-BLOCKING:** Roster UI remains SPEC-0003 scope; avatar presentation/catalog UX, year rollover/copy-forward, student transfer/history, and exact legal/privacy retention controls remain deferred to their designated future Designs. No coverage claim is made because no coverage command is configured.

## References and next step

- [SPEC-0002 Design](specs/SPEC-0002-academic-years-groups-students/DESIGN.md)
- [Tasks](specs/SPEC-0002-academic-years-groups-students/TASKS.md)
- [Apply Summary](specs/SPEC-0002-academic-years-groups-students/APPLY-SUMMARY.md)
- [Verify Report](specs/SPEC-0002-academic-years-groups-students/VERIFY-REPORT.md)
- [Archive Report](specs/SPEC-0002-academic-years-groups-students/ARCHIVE-REPORT.md)
- [SPEC-0001 verification evidence](specs/SPEC-0001-platform-foundation/VERIFY-REPORT.md)

**Exact next SDD step:** Repository Ready determination.

---

# SPEC-0003 Health Report — Teacher Classroom Workspace

**Date:** 2026-08-22
**Project:** eclipsegames
**Scope:** Archived SPEC-0003 — Teacher Classroom Workspace
**Branch observed:** `spec/0003-teacher-classroom-workspace`
**Artifact store:** both (repository-native documentation plus Engram)
**Health result:** **PASS WITH CONDITIONS**

Fresh repository-native health checks pass for the SPEC-0003 workspace, including focused and full Vitest, typecheck, build, and the complete 12-test built-artifact Fastify Playwright suite. No repository-health BLOCKER or CRITICAL finding was found. C-01 remains the sole production-only condition; the current working tree also contains untracked `.opencode/` files outside the SPEC-0003 Working Set and they require scope review before any handoff. This report assesses health and does not perform Repository Ready or Git handoff.

## Command evidence

| Check | Exact command | Exit | Output SHA-256 | Result |
|---|---|---:|---|---|
| Focused workspace Vitest | `pnpm exec vitest run apps/web/src/workspace/*.test.ts` | 0 | `sha256:54441c1d6072b41e0cf4e730379f25e355e4a7eda6786c81bf95c4b278ea3894` | PASS — 2 files, 13 tests |
| Full Vitest | `pnpm exec vitest run` | 0 | `sha256:1afb8279916d1f753017dfe32476e22f74da3fa84d8d0424524c2720b14fe790` | PASS — 13 files, 51 tests; authoritative roster/projection privacy tests included |
| Typecheck | `pnpm typecheck` | 0 | `sha256:2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c324` | PASS — web and API |
| Build | `pnpm build` | 0 | `sha256:1dfcc8a89b2a267e2109d8b9fc303c4358b569158487791a4cf57230b40ad8bd` | PASS — web Vite and API TypeScript builds |
| Complete built-artifact workspace suite | `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts` | 0 | `sha256:91317752c5963d676fab8b9c8d97d18c42268c27b85d65fb0075c7ab48d1c272` | PASS — 12 Chromium tests against Fastify serving the built artifact |

The Playwright configuration rebuilds and serves the built artifact, and the fresh run passed all 12 tests. No coverage command or threshold is configured; no coverage claim is made.

## Health checks

### Lint

**N/A.** No `lint` script or repository-defined lint framework is present in the root or workspace manifests. No lint command was invented or run.

### Migration and schema state

- SPEC-0003 introduced no migration, schema, database, API, contract, or server changes.
- `apps/api/drizzle/0001_foundation.sql`, `0002_auth_projection.sql`, and `0003_academic_roster.sql` remain the existing migration set.
- The current Git diff has no changed files under `apps/api/src/**`, `apps/api/drizzle/**`, `packages/**`, manifests, or `pnpm-lock.yaml`.
- This matches the archived Design, Apply Summary, Verify Report, and Archive Report.

### Privacy boundary regressions

- The fresh full Vitest run passed the canonical `TeacherStudentDto` and projection privacy tests.
- Workspace source uses canonical authenticated roster data and does not read `projection_students` or projection endpoints.
- `/#/workspace` remains separate from `/`; the root projection smoke remains green in the built-artifact Playwright suite.
- No browser storage, private URL payload, private logging, client-side projection filter, or private DTO fallback was found in the SPEC-0003 workspace implementation or E2E suite.
- No private roster data is placed in the runtime harness beyond controlled fixture values.

### Dependency and architecture drift

- No new dependency, manifest, or lockfile change is present.
- React/Vite, Fastify, SQLite/Drizzle, pure TypeScript domain boundaries, HashRouter, and built Fastify topology remain as designed in DEC-011 and SPEC-0003.
- No API composition route, server fallback, migration, mutation, persistence, history, or global undo mechanism was added.
- Archived SPEC context is coherent: Design, Tasks (12/12), Apply Summary, Verify Report, Archive Report, ROADMAP, and SESSION all identify SPEC-0003 as archived and C-01 as the remaining production-only condition.

### Working tree and branch health

- Branch: `spec/0003-teacher-classroom-workspace` (unchanged).
- `git diff --check`: PASS.
- Expected current-SPEC/project-policy files are present, including `apps/web/src/workspace/**`, `apps/web/e2e/teacher-workspace.spec.ts`, `main.tsx`, `styles.css`, `vitest.config.ts`, `playwright.config.ts`, SPEC-0003 phase artifacts, and the documented context updates.
- Unexpected/unowned for this SPEC: untracked `.opencode/agents/sdd-apply.md`, `.opencode/commands/sdd-apply.md`, and `.opencode/skills/sdd-apply/SKILL.md`. They were not modified by this Health phase and are not included in the SPEC-0003 Working Set; review their ownership before staging or handoff.
- No files were staged or modified by Git commands in this phase.

## Conditions, warnings, and blockers

**BLOCKERS:** None found.

**CONDITION — C-01 (production-only):** Before real student data or production use, SPEC-0014/0016 must define and implement retention/deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification. This Health phase did not rerun the unavailable production backup tool; `KNOWN_ISSUES.md` remains the source of the open host limitation. C-01 is not a repository-health blocker for SPEC-0003.

**NON-BLOCKING:** The untracked `.opencode/` files listed above are outside the SPEC-0003 Working Set and need ownership/scope review before delivery. No application-code, Design, Tasks, Verify, API/contract, manifest, migration, or deployment changes were made by Health.

## Evidence references and next step

- [SPEC-0003 Design](specs/SPEC-0003-teacher-classroom-workspace/DESIGN.md)
- [Tasks](specs/SPEC-0003-teacher-classroom-workspace/TASKS.md)
- [Apply Summary](specs/SPEC-0003-teacher-classroom-workspace/APPLY-SUMMARY.md)
- [Verify Report](specs/SPEC-0003-teacher-classroom-workspace/VERIFY-REPORT.md)
- [Archive Report](specs/SPEC-0003-teacher-classroom-workspace/ARCHIVE-REPORT.md)
- [Project context](../.ai/context/PROJECT.md)
- [Session context](../.ai/context/SESSION.md)

**Exact next SDD step:** Repository Ready determination. Do not perform Repository Ready or Automated Git Handoff in this phase.
