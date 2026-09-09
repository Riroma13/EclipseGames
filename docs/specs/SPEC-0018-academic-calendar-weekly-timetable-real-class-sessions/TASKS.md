# SPEC-0018 — Build Tasks

## Plan

- [x] 1. Add the 0011 schema migration and Drizzle declarations for the six calendar/session tables and composite lineage constraints.
- [x] 2. Add pure calendar rules, injected clock, and teacher-owned roster context/ lifecycle guard adapters.
- [x] 3. Add calendar repository, service, private mapper, contracts, and authenticated API routes for setup, status, start, and end.
- [x] 4. Register the module and wire atomic roster year update/archive protection.
- [x] 5. Add focused migration, API/privacy, and minimal workspace coverage; run focused verification.

## Work Unit Evidence

- Focused test command/result: `pnpm exec vitest run apps/api/test/integration/migrations.test.ts apps/api/src/calendar/*.test.ts` — PASS, 5 files / 12 tests (migration order/repeatability/legacy replay, calendar rules, IANA/DST clock, SQLite lineage/replay/atomicity, Fastify auth/privacy/lifecycle).
- Typecheck result: `pnpm typecheck` — PASS, web and API TypeScript checks.
- Build result: `pnpm build` — PASS, web Vite build and API TypeScript build.
- Runtime harness command/scenario/result: N/A — no Playwright configuration or runnable application-server harness is present in the current workspace; Fastify `app.inject` integration coverage provides the available runtime boundary.
- Rollback boundary: revert `apps/api/src/calendar/`, `apps/api/src/roster/calendar-context.ts`, the localized roster/service and contracts changes, `apps/web/src/workspace/{CalendarControls.tsx,WorkspaceApp.tsx,workspace-api.ts}`, and the SPEC-0018 task evidence; preserve unrelated worktree changes.
