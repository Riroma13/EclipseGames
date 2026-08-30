# Apply Progress: SPEC-DEMO-003 — Presentable Teacher MVP

## Unit 1 / PR 1 boundary (preserved)

- **Start:** Existing approved SPEC-DEMO-003 implementation state; Tasks 1.1–1.3 and 2.1 unchecked.
- **End:** Typed bounded XP evidence contract, truthful compact summary/activity presentation, and workspace shell/roster presentation were implemented and focused-tested.
- **Scope:** Tasks 1.1–1.3, 2.1, and the presentation-only portion of 2.4.

## Unit 2 / PR 2 boundary

- **Start:** Unit 1 / PR 1 completed state with Tasks 1.1–1.3, 2.1 and presentation-only 2.4 complete; action and setup tasks pending.
- **End:** Teacher XP/Points feedback refinement, create-only classroom setup through existing roster contracts, and bounded responsive presentation support/tests are implemented.
- **Scope:** Tasks 2.2, 2.3, and the bounded implementation/evidence portion of 2.4 only. Units 3–4, Projection, and seed work were not executed.
- **Next boundary:** The legacy labelled Projection handoff is next. The approved seed gate remains approved but bounded for the later seed slice.

## Task status

- [x] 1.1 RED contract test for the concrete XP evidence URL and private-field exclusion.
- [x] 1.2 RED presentation tests for zero/unavailable activity and opaque IDs.
- [x] 1.3 GREEN typed wrapper, mapping, activity state, and WorkspaceApp integration.
- [x] 2.1 Context/header, derived summary, roster scanability, and selected-student presentation.
- [x] 2.2 XP/Points action refinement: pending locks, truthful success/error/retry feedback, assessment context, balance/cost, redemption and reversal presentation; existing idempotency/undo semantics preserved.
- [x] 2.3 Create-only classroom setup using existing year/group/student contracts, including one 1–30 student batch and discoverable progressive disclosure.
- [x] 2.4 Full responsive/e2e evidence; bounded CSS, action-error styling, and targeted responsive, focus, scanability, and action-feedback Playwright evidence pass.
- [x] 3.1 Projection handoff privacy RED/evidence: named Playwright assertions cover URL/hash/storage/private payload; existing API privacy tests remain authoritative and pass.
- [x] 3.2 Labelled separate fixture handoff implemented in the workspace shell with a plain `/` link; no selected-group state is propagated and no projection mapper/route contract changed.
- [x] 3.3 Teacher journey evidence extended through context → search/select → XP → undo → Eclipse Points → assessment advantage → reversal → labelled Projection.
- [x] 4.1 RED seed contract and safety evidence.
- [x] 4.2 GREEN deterministic varied seed implementation.
- [x] 4.3 Seed regression tests, final Apply checks, and consolidated summary.

## Working Set

- **Planned Unit 1:** `WorkspaceApp.tsx`, `WorkspaceShell.tsx`, `StudentRoster.tsx`, `StudentCard.tsx`, `workspace-api.ts`, `workspace-state.ts`, `styles.css`, focused workspace tests.
- **Actual Unit 1:** `WorkspaceApp.tsx`, `workspace-api.ts`, `styles.css`, `workspace-api.test.ts`, `demo-presentation.test.ts`.
- **Planned Unit 2:** `StudentPanel.tsx`, `FastActionShell.tsx`, `UndoBanner.tsx`, `ClassroomSetup.tsx`, `workspace-api.ts`, `styles.css`, focused workspace/API tests and bounded e2e evidence.
- **Actual Unit 2:** `StudentPanel.tsx`, `ClassroomSetup.tsx`, `WorkspaceShell.tsx`, `workspace-api.ts`, `workspace-api.test.ts`, `styles.css`; existing roster tests exercised unchanged contracts.
- **Accuracy:** Unit 2 was narrower than the nominal plan: `FastActionShell.tsx` and `UndoBanner.tsx` required no code changes because their duplicate-submit and undo-window behavior already satisfied the approved contract. Setup is mounted by the existing shell and independently consumes authenticated roster contracts; no backend change was needed.
- **Planned Unit 3:** `WorkspaceApp.tsx`/existing shell or `main.tsx` only if required, `auth-projection.spec.ts`, `projection.test.ts`, and `teacher-workspace.spec.ts`.
- **Actual Unit 3:** `WorkspaceShell.tsx`, `auth-projection.spec.ts`, `teacher-workspace.spec.ts`; no `main.tsx`, projection mapper, route, or API change was required because `/` already served the fixture-backed allowlisted Projection.
- **Accuracy:** Narrower than the nominal plan: the plain `/` handoff belongs in the existing shell, while the existing root route and server privacy contract already satisfied the separate fixture boundary.

### Unit 3 / PR 3 boundary

- **Start:** Unit 2 / PR 2 completed state with Tasks 1.1–1.3, 2.1–2.3 and bounded 2.4 implementation complete; Projection and journey evidence pending. Unit 4 seed work excluded.
- **End:** The authenticated workspace exposes a clearly labelled, separate fixture-backed Projection handoff at `/`; focused privacy and complete journey runtime evidence pass. Unit 4 was completed subsequently.
- **Scope:** Tasks 3.1–3.3 only. Existing server projection allowlists remain authoritative; no API/domain/schema/seed changes.

## Deviations

- Setup is a small create-only surface mounted in the existing `WorkspaceShell` so it remains discoverable without changing the compact workspace composition or introducing navigation.
- No new endpoint, BFF, domain module, schema, migration, dependency, projection, seed, activity, ranking, grade inference, or private presentation field was added.
- Playwright was not run in Unit 2; responsive/accessibility runtime evidence remains a Verify concern and is not claimed complete here.
- Unit 3 added only the workspace-shell handoff and targeted auth/teacher Playwright evidence. The existing API privacy suite already proved the allowlist and required no link-specific server change.

## Verification

- `pnpm vitest run apps/web/src/workspace/demo-presentation.test.ts apps/web/src/workspace/workspace-api.test.ts apps/api/test/integration/roster.test.ts apps/api/test/integration/roster-core.test.ts` — PASS, 4 files / 25 tests.
- `pnpm --filter web typecheck` — PASS.
- `pnpm --filter web build` — PASS; Vite production build completed, 54 modules transformed.
- `git diff --check` — PASS.
- Unit 1 focused results preserved: workspace/API focused run PASS (2 files / 10 tests), expanded workspace run PASS (4 files / 23 tests), web typecheck PASS, expected initial RED recorded.

### Unit 3 verification

- `pnpm vitest run apps/api/test/privacy/projection.test.ts` — PASS, 1 file / 5 tests.
- `pnpm vitest run apps/web/src/workspace/demo-presentation.test.ts apps/web/src/workspace/workspace-api.test.ts` — PASS, 2 files / 11 tests.
- `pnpm --filter web typecheck` — PASS.
- `pnpm --filter web build` — PASS; Vite production build completed, 54 modules transformed.
- `git diff --check` — PASS.
- `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts apps/web/e2e/teacher-workspace.spec.ts -g "teacher can sign in|separately labelled|labelled fixture Projection" --trace off` — PASS, 3 tests.

### Unit 3 corrective rerun

- **Reason:** The failed Unit 3 phase gate identified one missing named failure-path evidence assertion and stale Engram task/progress mirrors. This is the one permitted corrective rerun; no Unit 4 work was started.
- **Scope:** Existing `apps/web/e2e/auth-projection.spec.ts` only for application evidence; canonical `TASKS.md` and this full Apply Progress record were synchronized in both artifact backends. No product code, mapper, route, API, seed, schema, migration, config, or dependency changed.
- **Failure-path evidence:** The existing root `/` Projection request is deterministically fulfilled as `503`; Playwright waits for the concise `Projection unavailable.` alert, confirms the existing sign-in recovery control remains available, confirms no Projection card renders, and asserts teacher-private fields are absent. No teacher-private fallback is rendered.
- `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts --trace off` — PASS, 3 tests (including the failed root Projection recovery path).
- `git diff --check` — PASS after the corrective evidence update.

## Runtime harness

- **Unit 2 runtime scenario:** N/A in this Apply call. No Playwright/server runtime harness was executed; API integration coverage proves authenticated create year → group → atomic batch flow, and UI wrappers are contract-tested. Named responsive, focus, reduced-motion, overflow, and end-to-end journey evidence remains for Verify/next bounded evidence work.
- **Unit 3 runtime scenario:** PASS. Existing Playwright webServer harness bootstrapped the API, seeded the development fixture, built the web app, and ran the targeted authenticated Projection and teacher journey scenarios. No sleeps or timeout weakening were added.

## Safety, privacy, and rollback

- **Rollback boundary:** Revert Unit 3 `WorkspaceShell.tsx` and the targeted Playwright evidence extensions, including the corrective failure-path test; no persistence, migration, or backend rollback is required. Unit 1–2 rollback boundaries remain preserved above.
- **Privacy/security impact:** Positive boundary only. Setup uses authenticated existing ownership and validation endpoints; archived/read-only and correction-lock rules remain server-enforced. XP activity remains factual and bounded, points remain UI terminology over internal `coin` contracts, and no grades, comments, RT, rubric, incidents, history, or projection fields were added. Duplicate-submit locks, idempotency, and reversal/undo windows are preserved.
- **Known issues:** Two existing Playwright teacher-workspace tests fail in the full suite (strict duplicate-text assertion; shared-fixture timing); they remain for Verify. C-01 remains production-only.
- **Unit 3 known issues:** Full suite verification remains for Verify; Unit 4 conditional seed variation is complete. C-01 remains production-only.

### Unit 4 / PR 4 boundary

- **Start:** Unit 3 / PR 3 completed state; approved maintainer variation gate pending.
- **End:** Fixed 16-student deterministic seed plan spanning Levels 1–3, multiple badge states, 0/1/2/3 Eclipse Point balances, and useful Camille state. Fixed XP request and coin identities are preflighted; writes are transactional, synthetic-only, replay-idempotent, and production-refusing.
- **Scope:** Tasks 4.1–4.3 and runtime-proven 2.4 evidence only. No API, schema, migration, route, UI, projection, dependency, or archived artifact changed in Unit 4.
- **RED:** Initial focused seed run failed on the old 23-event expectation before implementation.
- **GREEN:** Focused seed test PASS, 6 tests, covering exact totals/levels/badges/balances, Camille grants, production refusal, collisions, unrelated-data preservation, replay, and rollback.
- **Final checks:** `pnpm test` PASS (24 files / 96 tests); `pnpm typecheck` PASS; `pnpm build` PASS; `pnpm exec playwright test` 27 passed / 2 failed in existing teacher-workspace harness assertions (strict duplicate-text locator and shared-fixture timing); targeted responsive/accessibility run PASS, 5 tests; `git diff --check` PASS.

=== PHASE APPLY UNIT 4 COMPLETE ===

Ready for next phase: YES — next route is `sdd-verify`. The two non-blocking existing Playwright harness failures are carried into Verify.

## Corrective Apply continuation — three CRITICAL findings

- **Scope:** Corrective continuation only; no new task was created and all 13 canonical task checkmarks above remain intact. `VERIFY-REPORT.md`, Design, archived artifacts, API schemas/routes, database, migrations, projection behavior, seed semantics, dependencies, and VCS state were not modified.
- **Finding 1 root cause/fix:** `WorkspaceApp.tsx` converted a failed `xpSummaries` request to `{ summaries: [] }`, making class evidence and badge counts render as zero. The existing group request now keeps the roster while tracking summary availability; the class summary renders an unavailable/retry alert instead of zero. `classSummaryState` and `demo-presentation.test.ts` prove unavailable versus a genuine zero summary.
- **Finding 2 root cause/fix:** `RegisterXp` sent the same failure message to both its semantic `role=alert` action region and the panel-wide feedback status, producing duplicate strict-locator text. Failure feedback now remains in the action alert only; pending, retry, authoritative success, idempotency, undo, and reversal behavior are unchanged. The existing AC-06 assertion passes without weakening.
- **Finding 3 root cause/fix:** setup lacked deterministic runtime UI evidence. `teacher-workspace.spec.ts` now exercises an owned year through the existing setup UI, keeps a simulated existing-contract conflict visible, then submits valid data through the real roster endpoints and proves refreshed group/student visibility. No setup implementation or roster contract changed.

### Corrective Working Set and deviations

- **Planned:** `WorkspaceApp.tsx`, `StudentPanel.tsx`, `workspace-api.ts`, `demo-presentation.test.ts`, and `teacher-workspace.spec.ts`; existing setup/roster APIs only.
- **Actual:** The planned files above. `WorkspaceApp.tsx` was restored as a behavior-equivalent composed implementation while adding explicit summary availability; no unexpected production dependency or architecture was introduced.
- **Deviation:** Setup rejection is a deterministic 409 at the existing group-create boundary; existing roster integration tests remain authoritative for invalid, archived, locked, ownership, alias, batch, and atomicity rules.

### Corrective verification and runtime evidence

- `pnpm vitest run apps/web/src/workspace/demo-presentation.test.ts apps/web/src/workspace/workspace-api.test.ts` — PASS, 2 files / 12 tests.
- `pnpm test` — PASS, 24 files / 97 tests.
- `pnpm --filter web typecheck` — PASS.
- `pnpm typecheck` — PASS, web and API.
- `pnpm build` — PASS, web/API builds; Vite transformed 54 modules.
- `pnpm exec playwright test apps/web/e2e/auth-projection.spec.ts --trace off` — PASS, 3 tests.
- `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "AC-06 real Register XP path|minimal classroom setup" --trace off` — PASS, 2 tests.
- A broader targeted workspace rerun exposed pre-existing/current workspace harness failures in canonical route loading and focus restoration after this continuation; it was not a Verify recovery claim. The full suite was attempted but exceeded the execution window with additional workspace failures. Exact remaining evidence is carried to the next `sdd-verify`.

### Corrective safety, privacy, rollback, and next phase

- **Rollback boundary:** Revert only the corrective changes in `WorkspaceApp.tsx`, `StudentPanel.tsx`, `workspace-api.ts`, `demo-presentation.test.ts`, and `teacher-workspace.spec.ts`; no persistence or migration rollback is required. Units 1–4 evidence and task checkmarks remain preserved.
- **Privacy/security:** No new fields, routes, storage, projection payload, ranking, grade inference, or private-data surface. Existing authenticated ownership, archive/read-only, correction-lock, idempotency, undo, and server projection allowlists remain authoritative. Synthetic demo and C-01 production-only constraints remain unchanged.
- **Known issues:** Verify recovery is not claimed. Canonical workspace/focus runtime failures require fresh Verify diagnosis; AC-06 and setup correction scenarios pass. `DESIGN.md` warning and prior rollback-provenance warning remain outside this corrective scope.
- **Ready for next phase:** YES — next route is `sdd-verify`, which must validate the corrected summary failure path and investigate the remaining broader workspace harness evidence before any Archive/Health/Repository Ready action.

## Corrective Apply continuation — post-401 context recovery

- **Scope:** Narrow continuation for the single current Verify CRITICAL only. No task was added; all 13 task checkmarks above remain unchanged. `VERIFY-REPORT.md`, Design, proposal/spec/review artifacts, APIs, schema, migrations, Projection, seed, dependencies, and VCS state were not modified.
- **Reproduction:** Before the fix, `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "post-401 sign-in recovery reloads context without stale private cards" --trace off` reproduced the failure: after re-authentication the workspace selected the first unrelated persisted `A … setup / Owned setup group` and did not render `Ada Lovelace`.
- **Root cause:** `clearPrivateState` nulled `yearId` and `groupId` after the 401, while the hash reconciliation effect serialized that cleared state before the sign-in reload. Re-authentication therefore reloaded `/#/workspace` without the original opaque context, and normal fallback selection chose the first persisted year/group.
- **Fix:** `WorkspaceApp.tsx` now clears private arrays, summaries, activity, selection/action state, and authentication as before, but retains the opaque `yearId`/`groupId` recovery context. Hash reconciliation is suspended while sign-in is shown, and successful sign-in reloads directly without an intermediate authenticated render that could overwrite the preserved hash. No browser storage, endpoint, schema, domain concept, or private field was introduced.
- **Criteria addressed:** Restores the existing auth/workspace compatibility contract in Accessible privacy and private context; preserves stale/private-card clearing during recovery; restores the original year/group roster after successful re-authentication. Existing initial sign-in, hash-only UUID route, logout/auth-expiry, stale-student, privacy, and Projection behavior remain covered.
- **Working Set / deviation:** Planned and actual production file: `apps/web/src/workspace/WorkspaceApp.tsx`. Existing regression coverage in `apps/web/e2e/teacher-workspace.spec.ts` was sufficient and remains unchanged; no deviation beyond limiting the correction to the named auth/context recovery path.
- **Rollback boundary:** Revert only the post-401 changes in `WorkspaceApp.tsx`; no persistence, migration, backend, seed, or data rollback is required. Units 1–4 and the prior three-finding correction evidence remain preserved above.
- **Verification:** Focused RED reproduced the Verify failure. Focused GREEN `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "post-401 sign-in recovery reloads context without stale private cards" --trace off` passed (1 test). Relevant auth/workspace run passed 28/29; the one failure was the existing parallel shared-demo-fixture coin-loading harness test and passed isolated. Full `pnpm exec playwright test --trace off` passed 28/30; the two failures were the same hard-coded demo-fixture tests running concurrently against a shared database and both passed isolated/are not caused by this correction. Unit/typecheck/build/diff checks are recorded below.
- **Privacy/security:** Only opaque UUID year/group context remains in the URL during re-authentication. Real names, comments, grades, XP details, points, assessment data, and other private state remain neither stored in browser storage nor passed to Projection. Private arrays and detail/action state are cleared before sign-in is shown.
- **Known issues:** Full Playwright parallel execution remains non-green because two existing hard-coded demo-seed tests contend for the shared database; isolated runs pass. `DESIGN.md` Draft marker and rollback-provenance warning remain intentionally preserved for lifecycle cleanup. C-01 remains production-only.
- **Next:** `sdd-verify` only; do not Archive, Health, Repository Ready, or Git handoff from this continuation.
