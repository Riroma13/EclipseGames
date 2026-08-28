# SPEC-DEMO-002 Apply Progress

## Status

**Correction Apply status:** success. **correctionState:** `archived-after-verify`. **nextRecommended:** `health`.

Internal Work Units 1–4 and the scoped Verify-remediation continuation remain complete. All 13 persisted tasks remain complete after Verify independently answered Task 4.3. The maintainer-authorized post-Verify correction Apply is complete, the fresh Verify passed, and refreshed Archive is complete. Current routing is correction complete → Verify passed → Archive complete → Health. No task checkboxes were changed.

## Work Unit 1 — Migration/API context invariant

- **Tasks:** 1.1, 1.2, 1.3, 2.1, 2.2, 2.3.
- **Files:** `apps/api/drizzle/0006_assessment_context_name_uniqueness.sql`, `apps/api/src/db/{migrations,schema}.ts`, `apps/api/src/coins/{service,routes}.ts`, `apps/api/test/integration/{coins-schema,coins-lifecycle,migrations}.test.ts`.
- **Implementation:** Added the exact active partial expression uniqueness invariant `(group_id, lower(trim(name))) WHERE archived_at IS NULL`; migration failure remains transactional and leaves duplicate legacy data, the index, and `schema_migrations` unchanged. Added canonical trim/lookup-before-insert, 201/200 response semantics, unique-race reload, and stable-ID PATCH rename guards. Existing DTO shape, redemption uniqueness, XP/coin behavior, and C-01 boundary remain unchanged.
- **RED evidence:** Initial focused run failed as expected on missing migration, reuse status, and schema assertions before implementation.
- **Focused verification:** `pnpm test -- apps/api/test/integration/coins-schema.test.ts apps/api/test/integration/coins-lifecycle.test.ts apps/api/test/integration/migrations.test.ts` — exit 0; 24 files / 86 tests passed (Vitest project-wide collection with the requested focused paths). Coverage includes archived-name replacement and stable-ID rename collision.
- **Typecheck:** `pnpm typecheck` — exit 0; web and API checks passed.
- **Runtime harness:** Fastify `app.inject` against in-memory SQLite for authenticated create/retry/archive-year/rename flows; migration tests use in-memory SQLite. No Playwright runtime is applicable to this API-only unit (`N/A` for browser harness).
- **Rollback boundary:** Revert only the Unit 1 migration/schema mirror, coins service/routes, and the three API/migration test files; no student panel, workspace presentation, seed, or unrelated domain data is affected.

## Acceptance evidence

- [x] Legacy duplicate preflight fails closed without index, data mutation, or migration record.
- [x] Clean migration creates the exact partial normalized active-name uniqueness index.
- [x] Canonical create/reuse, typed guards, stable-ID rename collision, and archived-year guard pass.
- [x] AssessmentContextDto and existing coin/redemption/XP boundaries remain unchanged.
- [x] Workspace hierarchy/assessment UI is covered by Unit 2; later acceptance evidence remains for Units 3–4.

## Scope and risks

- Unexpected files: None beyond the approved Unit 1 Working Set.
- Dependencies: None added.
- Privacy/security: Existing authenticated route ownership and private DTO boundaries remain in force; no projection or student-facing fields changed.
- Remaining risk: Units 3–4 must cover unified feedback, responsive/accessibility/privacy evidence, conditional seed evaluation, full acceptance evidence, and final verification. C-01 remains production-only.

## Work Unit 2 — Workspace hierarchy and assessment flow

- **Tasks:** 3.1 only.
- **Files:** `apps/web/src/workspace/workspace-api.ts`, `apps/web/src/workspace/StudentPanel.tsx`, `apps/web/src/workspace/workspace-api.test.ts`, `apps/web/src/styles.css`, `docs/specs/SPEC-DEMO-002-teacher-mvp-usability-polish/TASKS.md`.
- **Implementation:** Added the existing API client contract for assessment create-or-reuse, active-context filtering, and an inline **Create/select Assessment** form that selects the canonical returned context for both new and duplicate requests. Added workspace panel hierarchy and breathing room using existing components/CSS only; redemption and API/domain semantics are unchanged.
- **RED evidence:** Initial focused run failed on the missing `workspaceApi.createAssessmentContext` and `activeAssessmentContexts` implementations; the two new tests then passed after the minimal implementation.
- **Focused verification:** `pnpm test -- apps/web/src/workspace` — exit 0; 24 files / 88 tests passed (Vitest project-wide collection with the requested workspace path).
- **Typecheck/build:** `pnpm typecheck` — exit 0; web and API checks passed. `pnpm build` — exit 0; web Vite bundle and API TypeScript build passed.
- **Runtime harness:** `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "coin|assessment|advantage"` — exit 0; 1 authenticated teacher coin/assessment journey passed. The existing accessible `Assessment` selector contract remains compatible.
- **Rollback boundary:** Revert only the Unit 2 workspace API test/client, `StudentPanel`, and existing workspace CSS changes plus the 3.1 checkbox; Unit 1 API/schema behavior, seed data, later feedback/accessibility work, and unrelated domains remain unaffected.
- **Acceptance evidence:** Active archived contexts are excluded from selection; canonical create/reuse responses are selected inline; existing assessment redemption and privacy assertions remain green.

## Work Unit 3 — Feedback, responsive accessibility, and private client state

- **Tasks:** 3.2, 3.3.
- **Files:** `apps/web/src/workspace/StudentPanel.tsx`, `apps/web/src/styles.css`, `apps/web/e2e/teacher-workspace.spec.ts`, `docs/specs/SPEC-DEMO-002-teacher-mvp-usability-polish/TASKS.md`.
- **Implementation:** Added RED-first browser evidence for pending action announcements, authoritative success feedback, tablet dialog Escape/focus restoration, and URL/browser-storage privacy. Added a localized live pending status to the existing Register XP action and shared existing feedback styling; action semantics, undo behavior, hash reconciliation, and storage boundaries remain unchanged. No generic action infrastructure or dependency was introduced.
- **RED evidence:** The new pending feedback test failed before implementation because no accessible action-feedback status existed; the browser storage/privacy test passed against the existing boundary. The pending status implementation then made both tests pass.
- **Focused verification:** `pnpm test -- apps/web/src/workspace` — exit 0; 24 files / 88 tests passed. `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "AC-11|workspace action feedback|workspace selection keeps private|actual FastActionShell"` — exit 0; 4 tests passed. Existing tablet focus-trap and FastActionShell/UndoBanner runtime coverage passed.
- **Typecheck/build:** `pnpm typecheck` — exit 0; web and API checks passed. `pnpm build` — exit 0; web Vite bundle and API TypeScript build passed.
- **Runtime harness:** Playwright authenticated tablet workspace and existing presentation harness both passed. The new privacy scenario verified zero local/session storage entries and no private action values in the URL. No seed expansion or production runtime harness was used (`N/A` for D-06/Phase 4 evidence, intentionally deferred).
- **Rollback boundary:** Revert only the Unit 3 pending-status/style/e2e changes and the 3.2/3.3 task markers; Unit 1 API/schema behavior, Unit 2 assessment flow, seed data, and later acceptance tasks remain unaffected.
- **Privacy/security:** No new URL, hash, localStorage, sessionStorage, projection, DTO, or student-facing private field was added. Existing tablet dialog focus trap and focus restoration remain covered.

## Work Unit 4 — Canonical evidence and completion checks

- **Tasks at Unit 4 completion:** 3.4, 4.1, 4.2. Task 4.3 was intentionally routed to independent Verify and is reconciled in the final archive section below.
- **Files:** `apps/web/e2e/teacher-workspace.spec.ts`, `docs/specs/SPEC-DEMO-002-teacher-mvp-usability-polish/TASKS.md`, `docs/specs/SPEC-DEMO-002-teacher-mvp-usability-polish/APPLY-PROGRESS.md`.
- **D-06 seed decision:** Preserved the no-expansion decision. The existing service-owned deterministic seed has fixed IDs, idempotent ownership/preflight behavior, 16 fictional roster students, and deterministic XP evidence. It does not need coin grants or assessment contexts embedded in seed data: the canonical browser journey reliably creates the assessment and uses real authenticated API actions to grant fictional test coins, register XP, redeem, retry, and undo. No seed file was changed.
- **Playwright evidence:** Added `AC-01–AC-17 canonical teacher journey stays in the workspace`. It covers authenticated year/group context, roster search, student selection, specialty/progress, XP result, coin balance, inline trimmed Create/select Assessment, duplicate case/whitespace reuse with canonical selection, advantage reservation, duplicate advantage `409` with unchanged balance, feedback/undo, next-student continuation, and URL/storage privacy assertions. The test uses opaque IDs only in API requests and asserts names, assessment text, comments, XP/coin values, and private action state are absent from the URL; local/session storage remain empty.
- **Migration snapshots:** `pnpm test -- apps/api/test/integration/coins-schema.test.ts apps/api/test/integration/migrations.test.ts` — exit 0; 24 files / 88 tests passed. C-DEMO-02 fail-closed duplicate migration and C-DEMO-03 exact partial expression index assertions remain green.
- **Focused checks:** `pnpm test -- apps/api/test/integration/coins-lifecycle.test.ts apps/web/src/workspace` — exit 0; 24 files / 88 tests passed. `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "AC-01–AC-17 canonical"` — exit 0; 1 test passed.
- **Required checks:** `pnpm test` — exit 0; 24 files / 88 tests passed. `pnpm typecheck` — exit 0. `pnpm build` — exit 0. `pnpm exec playwright test` — exit 0; 23 tests passed across the full client-demo harness.
- **Acceptance/privacy evidence:** The new journey plus existing Unit 3 scenarios cover the approved AC-01–AC-17 browser evidence without private names, assessment names, comments, XP, coin, reward, balance, or assessment values in URL/hash/storage. Existing authenticated server ownership and C-01 production-only gate are unchanged.
- **Rollback boundary:** Revert only the Unit 4 Playwright test and the Unit 4 task/progress evidence. No schema, API, seed, runtime UI, domain rules, or unrelated domain data is affected.
- **4.3 routing at Unit 4 completion:** Apply did not claim usability acceptance. First-time comprehension, workspace-only complexity, and coherence were answered independently during Verify; the final archive reconciliation checks 4.3.

## Current Apply State

- **Historical state before Verify:** 1.1–1.3, 2.1–2.3, 3.1–3.4, 4.1–4.2 (12 tasks) were complete; 4.3 was intentionally routed to independent Verify.
- **Historical Apply routing:** Apply was `partial` until Verify answered 4.3; this state is superseded by the final archive routing below.

## Verify-remediation continuation — B-01 runtime evidence

- **Scope:** This narrow continuation remediates only the two independent findings in the preserved failed Verify report. Units 1–4, Task 4.3 routing, D-06 no-seed-expansion, C-01, and all prior rollback boundaries remain unchanged.
- **File:** `apps/api/test/integration/coins-lifecycle.test.ts` only. No service, route, schema, migration, seed, UI, or unrelated test implementation changed.
- **Cross-group evidence:** The lifecycle test now creates the same normalized `quiz` name in a second group and asserts independent `201` responses, distinct IDs, and the correct `groupId` on each canonical DTO.
- **Concurrent evidence:** The lifecycle test uses a test-local file-backed SQLite database and two separately connected app instances, initializes the second app after the first, submits the same normalized name concurrently, and asserts exactly one `201`, one `200`, identical canonical DTOs/IDs, and exactly one final active row. It uses no sleep, timing, request-order assumption, production hook, or generic test seam.
- **RED/GREEN evidence:** The two assertions were added as the missing RED evidence boundary identified by Verify. The existing implementation already contains the approved group-scoped lookup, exact partial uniqueness invariant, and unique-constraint canonical reload, so no production GREEN change was required; the new tests pass against the existing implementation.
- **Focused verification:** `pnpm test -- apps/api/test/integration/coins-lifecycle.test.ts apps/api/test/integration/coins-schema.test.ts apps/api/test/integration/migrations.test.ts` — exit 0; 24 files / 89 tests passed. `pnpm typecheck` — exit 0; web and API TypeScript checks passed.
- **Limitations at continuation time:** This continuation did not run Verify, full browser coverage, full build, or any VCS command. The then-current failed Verify report was preserved and not edited by Apply; the subsequent fresh independent Verify produced the current passing report.
- **Product implementation evidence:** `git diff` review confirms the assigned remediation changed only the lifecycle integration test and this progress artifact; no product implementation, schema, migration, seed, or UI file was changed by this continuation.
- **Rollback boundary:** Revert only the two added lifecycle scenarios and this appended progress section. Prior Units 1–4 implementation/evidence, migration/API behavior, D-06 decision, C-01 boundary, and preserved failed Verify report remain intact.

## Current remediation routing

- **Remediation status:** complete for the two assigned test-only evidence gaps.
- **Task semantics at continuation time:** `TASKS.md` was not edited; Verify-only Task 4.3 remained intentionally unchanged until Verify completed.
- **Routing at continuation time:** fresh independent Verify rerun was required; Apply did not claim Verify pass or archive eligibility.

## Final archive routing

- **Task reconciliation:** Task 4.3 is checked because Verify independently answered all three usability questions YES. Tasks 1.1–1.3, 2.1–2.3, 3.1–3.4, and 4.1–4.3 are all checked (13/13).
- **Final status:** Apply complete; fresh independent Verify `PASS WITH CONDITIONS` with 0 blockers and 0 critical findings; Archive complete.
- **Conditions carried forward:** C-01 remains production-only; AC-01–AC-17 remain a bundled browser objective because the source does not define separate prose; Engram Design observation #2146 retains stale historical lifecycle wording only.
- **Next recommendation:** Health, then Repository Ready. No Git/VCS handoff was performed.

## Maintainer-authorized post-Verify correction

- **Scope:** Reopened the archived Repository Ready state only for the concrete maintainer-authorized correction. Prior Units 1–4 and the B-01 test-only remediation remain unchanged; Design, Tasks, Verify, Archive, Health, SESSION, and ROADMAP were not edited.
- **Presentation terminology:** `StudentPanel` now presents the teacher-facing currency as **Eclipse Points**, including the balance and reward costs. Backend/domain/database/API/DTO/route/TypeScript `coin` terminology and private boundaries remain unchanged.
- **Load-error correction:** `StudentPanel` ignores `AbortError` caused by effect cleanup and clears a previous load error after a later successful request set. Genuine request failures still remain visible. The focused Playwright regression changes student context while the first points requests are pending, then verifies successful loading does not retain a false alert.
- **D-06 decision:** Extended the existing service-owned deterministic demo seed with two fixed-ID, fixed-source `coin_ledger` grants for the first demo student, yielding a 2-point balance. The extension preflights fixed identities, fails closed on collisions, inserts transactionally, and replays idempotently. No production migration, XP-route reconciliation, wallet/shop/dashboard/history mechanic, or new subsystem was added. Seed integration tests cover reward-catalogue presence, 2-point balance, replay idempotency, and collision preflight. A Playwright journey uses seeded points without manual grants, creates/selects an assessment inline, redeems the standard advantage, and reverses/refunds it.
- **Verification performed:** `pnpm test -- apps/api/test/integration/seed-demo.test.ts apps/web/src/workspace/workspace-api.test.ts` — exit 0, 24 files / 90 tests passed; `pnpm typecheck` — exit 0; `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "clean demo seed|StrictMode cleanup"` — exit 0, 2 tests passed. No full Verify, Archive, Health, Repository Ready, or VCS command was run.
- **Local-data conclusion and recovery:** The already-incomplete `apps/api/data/eclipse.sqlite` cannot be repaired by `pnpm migrate` alone because migration 0005 is already recorded. Do not delete the maintainer’s database without explicit need. For a clean local setup, recreate a disposable database, then run `pnpm migrate`, `pnpm bootstrap`, and `pnpm seed:demo` using the repository’s normal local setup.
- **Rollback boundary:** Revert only the `StudentPanel` presentation/cancellation correction, the deterministic seed extension and its seed script/test evidence, the focused Playwright/configuration evidence, and this appended section. Do not revert or alter prior Units 1–4, B-01 remediation, migrations, API contracts, Verify/Archive evidence, or local maintainer data.

## Superseding correction routing

- **Correction Apply completion:** successful and complete for the maintainer-authorized correction, including this routing reconciliation; no task checkboxes were changed.
- **Machine-readable route:** `correctionState: ready-for-verify`; `nextRecommended: verify`.
- **Current route:** run fresh affected Verify now; only after Verify passes may the lifecycle proceed to refreshed Archive → Health → Repository Ready.
- **Preserved evidence:** Units 1–4, prior B-01 remediation, local database evidence/recovery guidance, correction details, rollback boundaries, C-01, D-06, and prior Verify/Archive evidence remain historical and unchanged in substance.
- **Explicit exclusions:** no implementation, seed, test, Verify, Archive, Health, Repository Ready, or Git/VCS work was rerun in this corrective documentation Apply.

## Post-Verify evidence continuation — remaining defects

- **Scope:** This narrowly scoped continuation addresses only the two remaining evidence defects reported by the failed post-Verify correction: missing runtime coverage for a genuine non-abort initial-load failure and four trailing-whitespace lines in the Health Report.
- **Evidence change:** Added one Playwright regression adjacent to the unchanged cancellation regression. It intercepts only `**/api/v1/coin-rewards` with HTTP 503 and a valid JSON error body, selects seeded Camille Martin, asserts the Assessment advantages region visibly retains `Could not load coin advantages.`, and confirms the route was hit. Other requests are untouched.
- **Documentation change:** Removed only the two trailing ASCII spaces from each of `docs/HEALTH-REPORT.md` lines 157–160. No historical whitespace was normalized and no semantic content changed.
- **Production boundary:** No production code, seed, configuration, API, schema, migration, terminology, or lifecycle architecture changed in this continuation. The existing cancellation regression remains unchanged.
- **Verification:** Focused Playwright regression and `git diff --check` were run; exact results are recorded in the Apply return envelope. No Verify, Archive, Health, Repository Ready, or Git/VCS command was run.
- **Rollback boundary:** Revert only the added genuine-failure Playwright test, the four exact Health Report whitespace removals, and this progress section. Prior Units 1–4, remediation, post-Verify correction, D-06, C-01, and failed Verify evidence remain unchanged.
- **Next route:** Fresh affected Verify is required; this continuation does not claim Verify pass or archive eligibility.

## Final current routing after post-Verify correction

- **Correction:** Presentation-only `Eclipse Points` terminology, AbortError cancellation handling, genuine 503 failure regression evidence, minimal fixed-ID/source/idempotent D-06 seed grants, seeded journey evidence, and local disposable-DB recovery guidance are complete. Backend `coin` terminology and boundaries remain unchanged.
- **Verify:** Fresh post-correction Verify is `PASS WITH CONDITIONS`: 12/12 criteria, 32/32 scenarios, 13/13 tasks, zero blockers, and zero critical findings. Required `pnpm test` (90), typecheck, build, full Playwright (26), and `git diff --check` passed. The supplemental focused Playwright contention is recorded as a non-product execution limitation.
- **Archive:** Refreshed archive record is complete. C-01 remains production-only; no Git/VCS handoff occurred.
- **Next:** Health, then Repository Ready. Repository Ready remains pending refresh.
