## Exploration: SPEC-DEMO-003 — Presentable Teacher MVP

### Current State
The authenticated `/#/workspace` route is a private React/Vite teacher shell backed by Fastify REST APIs. `WorkspaceApp` loads the teacher's non-archived academic years, groups, roster, and a bounded XP summary; it persists only opaque year/group/student identifiers in the hash and keeps action details out of the URL and browser storage. A selected student opens a responsive side panel/dialog with real name, alias, specialty, annual XP, level/progress, badges, real XP registration (category, 1–3 points, optional note), authoritative bonus feedback, and a ten-second XP reversal. The same panel surfaces Eclipse Points as the teacher-facing term for backend `coin` records, assessment-context create-or-reuse, standard/exceptional assessment advantages, and redemption reversal.

The root route `/` is a separate authenticated classroom-safe projection backed by the legacy fixture table and fixed group ID. Its server allowlist excludes real names, grades, RT, rubric, comments, incidents, and history; `showStudent=true` adds only behaviour state. It is not currently linked from the teacher workspace, and the projection UI shows aliases, specialties, levels, and energy but not the full safe DTO (badge, progress, points, narrative).

Roster APIs already support authenticated year/group/student create, update, archive, group correction, historical reads, ownership checks, and batch creation of up to 30 students. None of those management capabilities is surfaced in the workspace UI: the current interface can select years/groups and search/select students, but cannot create or edit classroom setup. XP APIs expose create, idempotent replay, reversal, individual summary, group summaries, and paginated evidence/history. Coin APIs expose balance, ledger, fixed rewards, manual grants, assessment contexts, redemption, and reversal with allocation and idempotency rules. The UI uses only balance, rewards, contexts, redemption, and reversal; it does not surface ledger/history or manual point grants.

The deterministic `seed:demo` command is service-owned, refuses production before opening the configured database, preflights fixed roster/point collisions, and replays safely. It creates one fixed 2026–2027 year, one group, 16 fictional students covering all eight specialties, 23 XP events, one qualifying badge (Camille), and two fixed Eclipse Points grants for Camille (balance 2). Event counts and base XP vary, but the seed does not intentionally produce a level 2+ student or varied point balances beyond one funded student/zero for the others. The fixed projection fixture at `/` is separate from this deterministic teacher roster.

Existing evidence includes Vitest domain, repository, API, migration, privacy, DTO, transaction, seed, and workspace tests, plus Playwright coverage for authentication, projection privacy, roster search/selection, 30-student scanning, responsive dialog/focus trapping, XP pending/failure/retry/undo, assessment redemption/reversal, URL/storage privacy, stale context recovery, and demo points. Root scripts provide `test`, recursive `typecheck`, recursive `build`, `seed:demo`, bootstrap, migration, and development commands. Playwright runs a seeded SQLite server and Chromium against the built app. There is no dedicated presentation snapshot or end-to-end link from workspace to projection.

### Affected Areas
- `apps/web/src/main.tsx` — authenticated root projection and `/#/workspace` route boundary; candidate location for a safe projection entry affordance only if it preserves the separate route/data contract.
- `apps/web/src/workspace/WorkspaceApp.tsx` — current year/group context, roster loading, search, selection, and workspace composition.
- `apps/web/src/workspace/StudentRoster.tsx`, `StudentCard.tsx`, `StudentPanel.tsx`, `FastActionShell.tsx`, `UndoBanner.tsx`, `YearContextControl.tsx`, `workspace-api.ts`, `workspace-state.ts` — the complete teacher journey components, action contracts, feedback, undo, focus, and opaque context handling.
- `apps/web/src/styles.css` — all workspace/projection styles, responsive breakpoints, contrast/focus treatment, and projector readability surface.
- `apps/api/src/roster/routes.ts`, `service.ts`, `repository.ts`, `mapper.ts` — existing classroom setup contracts and ownership/archive semantics; no new roster domain concept is justified by this exploration.
- `apps/api/src/xp/routes.ts`, `service.ts`, `repository.ts`, `mapper.ts` — existing XP evidence, annual summaries, level/badge derivation, idempotency, and compensating reversal contracts.
- `apps/api/src/coins/routes.ts`, `service.ts`, `repository.ts` and `apps/api/src/db/schema.ts` — existing `coin` ledger, Eclipse Points presentation boundary, assessment context, reward, redemption, reversal, and persistence invariants.
- `apps/api/src/projection/routes.ts`, `mapper.ts`, `repository.ts` — authoritative classroom-safe projection route and legacy fixture boundary; must not be widened by UI-only assumptions.
- `apps/api/src/demo/seed-service.ts`, `apps/api/scripts/seed-demo.ts`, `apps/api/test/integration/seed-demo.test.ts` — deterministic synthetic-only demo data, fixed IDs, collision preflight, idempotency, and current progression/points limitations.
- `apps/web/e2e/teacher-workspace.spec.ts`, `auth-projection.spec.ts`, `spec-0004-xp.spec.ts` and API/privacy tests — existing selectors and contracts to preserve and extend with presentation/journey evidence.
- `package.json`, `apps/web/package.json`, `apps/api/package.json`, `playwright.config.ts` — current verification capability; no new runtime dependency is needed.

### Approaches
1. **Focused workspace presentation pass (recommended)** — improve hierarchy, context framing, roster scanability, student understanding, feedback, and the existing safe-projection handoff while reusing current APIs and contracts. Add only the smallest UI surfaces needed for existing roster management APIs, if setup is required for the demo journey; do not create a new management subsystem.
   - Pros: smallest coherent teacher journey; reuses proven state, privacy, XP, points, undo, and seed contracts; low regression surface; keeps classroom work in one place.
   - Cons: setup remains intentionally basic; projection remains a separate route and cannot become a teacher-private detail view; existing fixture/projection mismatch may limit a seamless demo.
   - Effort: Medium

2. **Full teacher navigation shell** — add separate setup, student detail/history, rewards, and projection navigation areas around the existing APIs.
   - Pros: makes more backend capability discoverable.
   - Cons: introduces navigation and state transitions before evidence requires them, expands privacy surface, risks dashboard/admin clutter, and exceeds a presentable MVP.
   - Effort: High

3. **Backend-for-frontend/demo aggregation** — add a new journey-oriented API response or domain concept to assemble context, student detail, points, and projection state.
   - Pros: fewer client requests and potentially simpler loading orchestration.
   - Cons: new contract/schema ownership and privacy review without a demonstrated backend gap; duplicates existing bounded endpoints and risks changing settled semantics.
   - Effort: High

### Recommendation
Choose the focused workspace presentation pass. The smallest credible journey is: authenticate → understand year/group context → search/select a student → see identity, specialty, XP level/progress and badge → award XP and receive base/bonus/effective feedback → use existing assessment-context/Eclipse Points advantage and undo it when needed → open the existing classroom-safe projection route → expose only the existing roster setup actions that are necessary to make a classroom usable. Keep backend `coin` names intact in code/API and use `Eclipse Points` only in teacher-facing presentation. Do not add analytics, fake activity, rankings, enterprise navigation, decorative metric widgets, history redesign, or a new domain/schema concept.

### Initial File Impact Map
| Slice | Likely files | Boundary |
|---|---|---|
| Workspace hierarchy and presentation | `WorkspaceApp.tsx`, workspace components, `styles.css` | UI-only unless an existing API response is genuinely missing.
| Student understanding and action feedback | `StudentCard.tsx`, `StudentPanel.tsx`, `workspace-api.ts`, focused workspace tests | Reuse `XpSummary`, badge, points, and reversal contracts; no grade inference from XP.
| Projection handoff | `main.tsx`, projection UI/styles, Playwright projection tests | Keep `/` projection and teacher `/#/workspace` privacy/route boundaries separate; link/launch must not pass private fields.
| Classroom setup | Existing roster routes/service plus new workspace setup component/API client calls only if justified | No backend change expected; preserve owner, archive, batch-size, alias, and correction-lock rules.
| Seed/demo evidence | Existing seed files/tests only for assessment, not implementation by default | Treat current seed as synthetic and idempotent; do not alter archived artifacts or seed unless acceptance evidence proves a presentation blocker.
| Verification | Existing Vitest/Playwright suites and selectors | Add journey, responsive, accessibility, and privacy assertions rather than weakening current contracts.

### Genuine Gaps vs Presentation Opportunities
- **Genuine UX gaps:** roster setup is API-only; projection is not discoverable from the teacher shell; the projection uses a separate fixed fixture and does not reflect the deterministic teacher roster; the seeded demo has only one non-zero points balance and one badge, limiting coverage of a varied presentation; XP evidence/history and point ledger are backend-capable but not inspectable from the UI.
- **Presentation opportunities:** make year/group context unmistakable, keep the roster as the primary scan surface, make selected-student facts and action feedback visually coherent, clarify read-only/history states, expose the existing safe projection action, and make responsive/focus behavior obvious without changing semantics.
- **Backend capability not surfaced:** CRUD/archive setup, XP evidence pagination, coin ledger, manual point grants, full projection-safe DTO fields, and teacher projection/student endpoints.
- **New concepts to defer:** dashboard analytics, activity feeds, rankings, student accounts, generic management/navigation framework, new projection aggregation, stored presentation metrics, and any assessment-grade or history domain model.

### Risks
- Projection privacy must remain enforced by the server allowlist; never reuse the teacher DTO or encode names, notes, grades, XP categories, point costs, assessment names, or history in projection URLs/storage.
- The root projection currently reads the legacy `projection_students` fixture while the teacher workspace reads owned roster/domain data. Presentability can expose this mismatch; silently joining or synchronizing them would be a new backend decision and should be deferred unless explicitly approved.
- Existing archived-year/student read-only semantics and XP group-correction lock must not be bypassed by setup controls.
- Points terminology can drift: preserve internal `coin`/ledger/API names and use `Eclipse Points` for teacher-facing labels only.
- Seed changes risk fixed-ID collisions or hidden production safety regressions; current collision preflight and replay tests must remain authoritative.
- Current root route's fixed projection group and seeded teacher group have different IDs, so a “safe Projection” link must not imply it displays the selected teacher group unless that contract is changed deliberately.
- The open encrypted-restic/privacy production gate remains outside this presentation iteration.

### Demo-Seed Assessment
The seed is suitable for a deterministic smoke journey: fixed IDs, fictional names, 16-person scan, eight specialties, XP bonus evidence, one badge, and two points enable a real award → feedback → assessment advantage → reversal path for Camille. It is not a complete visual progression fixture: only Camille has points, only one badge is unlocked, and calculated XP stays below level 2 for the seeded events. Prefer presentation improvements using this truthful state and controlled test fixtures. If the client demo explicitly requires varied levels/badges/balances, record that as a narrowly designed seed extension rather than inventing UI metrics; any extension must preserve synthetic-only, fixed identity, preflight, transactional replay, and no archived-artifact mutation.

### Proposed Acceptance Evidence
- Playwright authenticates at `/#/workspace`, confirms year/group context, searches by alias/name, selects a student, and confirms private identity/detail fields remain in the teacher route only.
- Playwright performs real XP registration, observes pending and authoritative base/bonus/effective feedback, verifies updated annual summary/badge/level where applicable, and verifies the existing reversal without losing context.
- Playwright creates/reuses an assessment context, spends and reverses existing Eclipse Points, verifies balance and one-advantage behavior, and confirms internal `coin` terms do not leak into teacher-facing copy unless intentionally technical.
- Playwright opens safe Projection from the teacher journey and asserts only allowlisted fields are present; server privacy tests continue to reject anonymous access and query-selectable private fields.
- API/integration evidence covers any setup UI calls against existing ownership, validation, archive, batch-size, and correction-lock contracts; no new schema migration is expected.
- Responsive/accessibility evidence covers 320px/800px/projector-sized layouts, no horizontal overflow, visible keyboard focus, dialog focus trap/escape restoration, reduced motion, and readable action feedback.
- Verification runs existing `pnpm test`, `pnpm typecheck`, `pnpm build`, and the relevant/full Playwright suite through the existing seeded configuration.

### Simplicity Check
1. **Does each new concept serve the live teacher journey?** Only context, student, existing action feedback, safe projection handoff, and necessary setup; no dashboard or activity concepts.
2. **Can an existing API/state contract do the job?** Yes for XP, summaries, badges, points, assessment advantages, reversals, projection, and roster CRUD; add no BFF/domain/schema concept without evidence.
3. **Does the teacher reach “find → act → continue” in roughly 1–2 interactions after selection?** The design should preserve direct category/value actions, one assessment create/select path, one reward action, and visible undo.
4. **Does presentation change any academic, gamification, behaviour, or privacy rule?** No; XP remains evidence, points remain separate, and projection remains server-allowlisted.
5. **Would removing a proposed surface make the demo less understandable or less safe?** Remove decorative metrics, rankings, fake activity, enterprise navigation, and unneeded history/setup expansion; retain context, student facts, action feedback, safe projection, and proven recovery states.

### Ready for Proposal
Yes. The orchestrator can proceed to Proposal/Design with the focused presentation pass, an explicit no-new-backend-concept constraint, and a decision on whether the existing fixed projection fixture may be linked as a generic safe classroom preview or must remain a separate route for this iteration.
