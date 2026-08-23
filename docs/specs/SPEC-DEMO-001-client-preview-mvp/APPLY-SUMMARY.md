# SPEC-DEMO-001 Apply Summary

## Result

All approved Tasks 1.1–4.1 are implemented and checked off. The implementation preserves B-01's explicit service-owned seed and C-01's production gate. **Next recommended phase: Verify.**

## Changed files

- `package.json`
- `apps/api/scripts/seed-demo.ts`
- `apps/api/src/demo/seed-service.ts`
- `apps/api/src/roster/service.ts`
- `apps/api/test/integration/seed-demo.test.ts`
- `apps/web/src/workspace/WorkspaceApp.tsx`
- `apps/web/src/workspace/StudentRoster.tsx`
- `apps/web/src/workspace/StudentCard.tsx`
- `apps/web/src/workspace/StudentPanel.tsx`
- `apps/web/src/workspace/demo-presentation.test.ts`
- `apps/web/src/styles.css`
- `apps/web/e2e/teacher-workspace.spec.ts`
- `docs/specs/SPEC-DEMO-001-client-preview-mvp/TASKS.md`
- `docs/specs/SPEC-DEMO-001-client-preview-mvp/APPLY-PROGRESS.md`
- `docs/specs/SPEC-DEMO-001-client-preview-mvp/APPLY-SUMMARY.md`

## Acceptance mapping

- **AC-01–02:** explicit guarded `pnpm seed:demo`, fixed 2026–2027 roster, 16 fictional students, fixed UUID-v4 request keys, replay and partial/collision preflight tests.
- **AC-03–05:** approved 30-record scan fixture, accessible search and selection, identity/specialty/XP/action panel hierarchy.
- **AC-06–08:** existing authoritative XP create/reversal path, specialty bonus feedback, progress/level/badge display, ten-second Undo.
- **AC-09–11:** empty/no-match/loading/error/401/historical states, keyboard selection, Escape, focus restoration, reduced-motion CSS, tablet drawer and no-scroll proof.
- **AC-12–13:** no direct seed table writes, no ownership/auth bypass, no new routes or dependencies, private workspace retained.
- **AC-14:** deterministic Chromium journey and runtime action/undo harness.
- **AC-15:** one existing workspace, one narrow roster seam, no future controls or generic framework.

## Migrations, dependencies, deviations

- Migrations: none.
- Runtime dependencies: none added; lockfile untouched.
- Design deviation: none. `roster/service.ts` is the explicitly approved B-01 Working Set exception.
- Unresolved condition: C-01 remains production-blocking for real data and recoverability.

## Verification evidence recorded during Apply

- `pnpm exec vitest run apps/api/test/integration/seed-demo.test.ts` — 3 passed.
- `pnpm exec vitest run apps/web/src/workspace` — 17 passed.
- `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts apps/web/e2e/spec-0004-xp.spec.ts --workers=1` — 13 passed.
- `pnpm test` — 20 files, 68 tests passed.
- `pnpm typecheck` — passed.
- `pnpm build` — passed.

No Git/VCS actions were performed. Apply does not include Verify, Archive, Health, Repository Ready, or delivery actions.
