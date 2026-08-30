# Apply Summary: SPEC-DEMO-003 — Presentable Teacher MVP

Apply is complete through Work Unit 4 / PR 4. The final seed slice adds truthful deterministic variety without changing domain rules, APIs, schema, projection, or production behavior.

## Files changed

Units 1–3: `apps/web/src/workspace/WorkspaceApp.tsx`, `WorkspaceShell.tsx`, `StudentPanel.tsx`, `workspace-api.ts`, `workspace-api.test.ts`, `demo-presentation.test.ts`, `ClassroomSetup.tsx`, `apps/web/src/styles.css`, `apps/web/e2e/auth-projection.spec.ts`, and `apps/web/e2e/teacher-workspace.spec.ts`.

Unit 4: `apps/api/src/demo/seed-service.ts` and `apps/api/test/integration/seed-demo.test.ts`.

Apply artifacts: `TASKS.md`, `APPLY-PROGRESS.md`, and this `APPLY-SUMMARY.md` in the SPEC directory.

No archived SPEC artifact, package, dependency, route, schema, migration, projection mapper, or configuration file changed.

## Key decisions

- Keep the seed service-owned and deterministic; reuse roster, XP, and coin services/repositories.
- Preflight all fixed XP request and coin ledger identities before any write.
- Wrap roster, XP/badge/level derivation, and grants in one transaction; matching identities replay safely.
- Preserve the two DEC-014 Camille grants and internal `coin` terminology.
- Keep all data fictional and development-only; production refusal remains before database opening.

## Planned vs actual Working Set

| Unit | Planned | Actual | Accuracy |
|---|---|---|---|
| 1 | Workspace composition, wrappers, roster presentation, styles, tests | Workspace app/API/styles and focused tests | Narrower; existing roster/card contracts needed no changes |
| 2 | Actions, setup, responsive evidence | Panel/setup/shell/API/styles and tests | Narrower; existing fast-action/undo behavior already satisfied the contract |
| 3 | Projection entry and journey/privacy evidence | Shell plus two Playwright specs | Narrower; existing root route and server allowlist already sufficed |
| 4 | Seed service/test extension and final checks | Seed service, seed integration test, task/progress/summary artifacts | Exact; no new API/schema/config surface was required |

## Seed plan and migration

The 16 fixed students receive explicit XP arrays producing exact annual totals across Levels 1–3, with active and absent specialty badges. Fixed grants produce varied balances of 0, 1, 2, and 3; Camille retains both DEC-014 grants. Fixed identities/sources are preflighted. Collision, replay, unrelated-data, production, and rollback behavior are tested.

Migration: **none**. Existing schema and services are reused.

## Tests and runtime evidence

- Focused seed: PASS — 6 tests.
- `pnpm test`: PASS — 24 files / 96 tests.
- `pnpm typecheck`: PASS.
- `pnpm build`: PASS.
- `pnpm exec playwright test`: 27 passed, 2 failed in existing teacher-workspace harness assertions (duplicate strict locator and shared-fixture timing); no seed/projection test failed.
- Targeted responsive/accessibility Playwright evidence: PASS — 5 tests covering keyboard/focus, tablet Tab trapping, action feedback, selected-student focus, and 30-record scan.
- `git diff --check`: PASS.

## Acceptance criteria mapping

- Private context, roster, XP/undo, Eclipse Points, activity, setup, Projection handoff, and privacy: implemented and preserved from Units 1–3 with focused/API/Playwright evidence.
- Synthetic seed: exact 16-student varied plan, Levels 1–3, multiple badges, balances 0/1/2/3, and useful Camille state proven by integration tests.
- Safety: fixed identity preflight, fail-closed collisions, transaction rollback, replay idempotency, unrelated-data preservation, synthetic-only data, and production refusal proven.
- Accessibility: targeted responsive, keyboard/focus, overflow, projector, and 30-record evidence passes; the two full-suite harness failures are carried to Verify.

## Deviations and unresolved non-blocking issues

- Full Playwright execution is not fully green because two existing teacher-workspace tests have harness-level failures; this is recorded rather than weakening tests or changing UI/action code.
- C-01 encrypted-restic/recoverability remains production-only.

## Next phase

`sdd-verify`

## Corrective Apply addendum

The three CRITICAL Verify findings were corrected without changing tasks, APIs, schema, projection, seed, privacy rules, or domain behavior: failed group summaries now present unavailable/retry rather than zero; duplicate XP failure feedback is removed from the global status path while the semantic action alert remains; and deterministic setup runtime evidence covers conflict visibility followed by real owned roster creation and refresh. Focused Vitest, full Vitest, typecheck, build, AC-06/setup Playwright, and projection Playwright checks pass. A broader workspace rerun still exposes canonical/focus harness failures, so Verify recovery is not claimed; next phase is `sdd-verify`.

## Post-401 recovery correction addendum

The single current Verify CRITICAL was corrected in `apps/web/src/workspace/WorkspaceApp.tsx`. `clearPrivateState` still clears private roster, summary, activity, selection, and action state and shows sign-in, but no longer clears the opaque year/group context or allows hash reconciliation to serialize an empty context while signed out. Successful re-authentication reloads the preserved `year`/`group` UUID hash, restoring the original roster rather than the first unrelated persisted class. No browser storage, endpoint, schema, domain concept, Projection payload, or private field was introduced.

Evidence: the focused test reproduced RED before the correction and passed GREEN afterward; the relevant auth/workspace run passed 28/29, with its one unrelated shared-fixture test passing in isolation; full Playwright passed 28/30 because the two existing hard-coded demo-fixture tests contend under parallel shared-database execution and pass in isolation. `pnpm test` passed 24 files/97 tests, `pnpm typecheck`, `pnpm build`, and `git diff --check` passed. Next phase remains `sdd-verify`; DESIGN Draft and rollback-provenance warnings remain preserved.
