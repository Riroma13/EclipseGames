# SPEC-DEMO-001 Apply Progress

**Status:** complete; original Apply tasks and the authorized AC-06/AC-11/AC-14 correction continuation are complete on the current branch. Verify remains the next phase.

## Work units

### Unit 1 — Safe deterministic seed
- **Tasks:** 1.1–1.4
- **Files:** `package.json`, `apps/api/scripts/seed-demo.ts`, `apps/api/src/demo/seed-service.ts`, `apps/api/src/roster/service.ts`, `apps/api/test/integration/seed-demo.test.ts`
- **Focused verification:** `pnpm exec vitest run apps/api/test/integration/seed-demo.test.ts` — 3 tests passed; `pnpm seed:demo` twice — 16 students and 23 XP requests checked on both runs; production invocation exited 1 and created no database.
- **Runtime harness:** command-line seed against `/tmp/eclipse-demo-apply.sqlite`.
- **Rollback boundary:** remove the seed command/script/service and `ensureOwnedDemoRoster`; XP evidence remains untouched.

### Unit 2 — Workspace presentation and actions
- **Tasks:** 2.1–2.3
- **Files:** `apps/web/src/workspace/WorkspaceApp.tsx`, `StudentRoster.tsx`, `StudentCard.tsx`, `StudentPanel.tsx`, `demo-presentation.test.ts`, `styles.css`
- **Focused verification:** `pnpm exec vitest run apps/web/src/workspace` — 17 tests passed.
- **Runtime harness:** authenticated workspace and existing runtime presentation harness in Playwright.
- **Rollback boundary:** revert the workspace presentation files only; roster/XP APIs and evidence remain unchanged.

### Unit 3 — Browser journey and boundaries
- **Tasks:** 3.1–3.2
- **Files:** `apps/web/e2e/teacher-workspace.spec.ts`
- **Focused verification:** `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts apps/web/e2e/spec-0004-xp.spec.ts --workers=1` — 13 passed; AC-03 uses a separate approved 30-record fixture and does not alter the fixed seed.
- **Runtime harness:** Chromium via repository Playwright web server.
- **Rollback boundary:** revert the added fixture coverage and workspace E2E assertions.

### Unit 4 — Integrated proof
- **Tasks:** 4.1
- **Verification:** `pnpm test` — 20 files / 68 tests passed; `pnpm typecheck` passed; `pnpm build` passed.
- **Runtime harness:** seeded local teacher session and Chromium journey.
- **Rollback boundary:** revert the complete SPEC working set; no migration or production data rollback is required.

### Unit 5 — Verify correction continuation (AC-06, AC-11, AC-14)
- **Tasks:** Authorized post-Verify Apply continuation only; original Tasks remain complete.
- **Root causes:** AC-06 lacked runtime evidence through the real `RegisterXp` UI/API path for pending and API failure/retry; AC-11's existing tablet dialog had initial focus, Escape, restore and naming but no Tab boundary handling; AC-14 split the canonical journey across scenarios and had no contiguous real XP/reversal browser proof.
- **RED evidence:** Added deterministic Playwright tests first; AC-11 failed because focus moved outside the dialog, while the AC-06 real failure/retry path passed without product changes and AC-14 initially exposed only test assertion/setup defects.
- **GREEN files:** `apps/web/src/workspace/StudentPanel.tsx`, `apps/web/e2e/teacher-workspace.spec.ts`.
- **Focused verification:** `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g 'AC-11' --workers=1` — 1 passed; `pnpm exec vitest run apps/web/src/workspace apps/api/test/integration/xp-routes.test.ts` — 5 files / 18 tests passed; `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts apps/web/e2e/spec-0004-xp.spec.ts --workers=1` — 17 passed.
- **Integrated verification:** `pnpm test` — 20 files / 68 tests passed; `pnpm typecheck` — API and web checks passed; `pnpm build` — web Vite build and API compilation passed.
- **Runtime harness:** Chromium against the repository Playwright web server; AC-06 uses the real `RegisterXp` UI and API with one deterministic first-request 503 seam followed by a real retry, AC-14 uses real API creation, XP, specialty bonus, level/badge derivation, reversal and group context switch.
- **Rollback boundary:** revert the focus-trap effect in `StudentPanel.tsx` and the three correction scenarios in `teacher-workspace.spec.ts`; prior seed, workspace, XP contracts, and original Apply work units remain intact.

## Ordinary defects corrected
- Preserved XP summary fallback when a presentation fixture does not provide the optional group summary endpoint.
- Preserved the existing `Annual XP: … · Level …` and `Archived` accessible UI labels while adding scan metadata.
- Allowed canonical demo students to retain the roster correction lock created by authoritative XP replay.
- Expanded deterministic request keys to cover all 23 legitimate demo XP events.

## Safety and scope
- No Git/VCS action performed.
- No routes, auth/session behavior, XP service/repository, schema, migration, contract, dependency, projection, or future domain changed.
- C-01 remains production-only; fictional demo data only.
