# Tasks: SPEC-0003 Teacher Classroom Workspace

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Internal current-branch unit 1 state/contracts; unit 2 workspace UI/API; unit 3 E2E/build/docs |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High
Maintainer decision: size exception accepted; continue on the current SPEC branch only. No child branches, stacked PRs, or merge slices to main are authorized.

### Suggested Work Units

| Unit | Goal | Delivery boundary | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Pure search/state/action contracts | Internal current-branch unit; independently verifiable before unit 2 | `pnpm exec vitest run apps/web/src/workspace/*.test.ts` | N/A — pure transient state | `apps/web/src/workspace/{workspace-state,search}.ts` and tests |
| 2 | Hash workspace shell, canonical roster reads, cards/panel | Internal current-branch unit; depends on unit 1 | `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "roster|search|panel"` | Vite dev server with authenticated canonical roster seed | `apps/web/src/workspace/`, `main.tsx`, workspace CSS |
| 3 | Fastify built-artifact route proof | Internal current-branch unit; depends on units 1–2 | `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts` | Fastify serving `pnpm build` artifact; `/` projection smoke | E2E/config/docs/session changes only |

## Phase 1: RED tests and web test harness

- [x] 1.1 Extend `vitest.config.ts` for web tests; RED-test search, ordered filtering, URL reconciliation, generation invalidation, and transient resets.
- [x] 1.2 RED-test undo default/positive-finite override, invalid zero/negative/NaN/infinite durations, none/no-capability, expiry, pending, replacement, context invalidation, invalid result, and callback failure in `apps/web/src/workspace/*.test.ts`.
- [x] 1.3 RED-test routing in `apps/web/e2e/teacher-workspace.spec.ts` against the built-artifact Fastify harness: initial `/#/workspace`, reload, copied hash URL request `/` and workspace boot; preserve `/` projection fixture ownership.

## Phase 2: Workspace state, contracts, and data flow

- [x] 2.1 Create pure contracts/helpers in `apps/web/src/workspace/{workspace-state,search}.ts`; enforce UUID-only context, deterministic reconciliation, transient reducer ownership, abort/generation rules, and API order.
- [x] 2.2 Create `workspace-api.ts` and `WorkspaceApp.tsx`; reuse authenticated `GET /api/v1/academic-years`, `GET /api/v1/academic-years/:yearId/groups`, and `GET /api/v1/groups/:groupId/students[?includeArchived=true]` routes plus `TeacherStudentDto`; handle safe errors, 401/404/500, archived read-only fallback, and forbid projection/client-filter/private fallback.
- [x] 2.3 Implement `WorkspaceShell`, `YearContextControl`, `GroupSelector`, `StudentRoster`, `StudentCard`, and `StudentPanel` with teacher-private fields only, search/focus/selection semantics, and no browser storage or projection fallback.

## Phase 3: Actions, accessibility, and visual integration

- [x] 3.1 Implement `FastActionShell` and `UndoBanner` with typed presentation-only contracts, immediate pending/feedback, one context-bound opportunity, 10-second default, positive-finite override, non-undoable/no-capability behavior, and domain-owned validity.
- [x] 3.2 Wire `HashRouter` in `apps/web/src/main.tsx`; keep `/` projection unchanged and route only `/#/workspace`; update `apps/web/src/styles.css` for signal rail, responsive drawer, 44px targets, focus, live regions, and reduced motion.
- [x] 3.3 Complete RED-to-GREEN web unit coverage for all pure helpers/reducer/action cases, including AC-03/04/05/06/08/09/10/11 and unchanged C-01 production gate.

## Phase 4: E2E verification and handoff

- [x] 4.1 Seed canonical year/group/students through authenticated roster APIs in `apps/web/e2e/teacher-workspace.spec.ts`; cover AC-02–07, 10–12, historical/empty/error/auth recovery, and controlled action/undo flows.
- [x] 4.2 Configure the built-artifact Fastify harness in `playwright.config.ts`; prove C-02 initial/reload/copy hash navigation requests `/`, while `/` remains projection/demo and `apps/api/src/**` is untouched.
- [x] 4.3 Run `pnpm build`, `pnpm typecheck`, focused/full Vitest and Playwright; record AC-01–AC-14, C-01, privacy, rollback, and Working Set evidence in `APPLY-SUMMARY.md`.
