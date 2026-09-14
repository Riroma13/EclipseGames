# SPEC-0036 — M5 Quarterly Observation Rubric Tasks

Planning artifact only: implementation is not authorized by the current Design route.

## Expected Change Surface

- Create migration `apps/api/drizzle/0015_quarterly_observation_rubric.sql` and rubric modules under `apps/api/src/rubric/` (`domain`, `repository`, `service`, `mapper`, `routes`).
- Modify `apps/api/src/db/{schema,migrations}.ts`, `apps/api/src/server.ts`, XP service/repository, a narrow calendar session-context adapter, and `packages/{domain,contracts}/src/index.ts`.
- Add focused API/domain/SQLite/privacy tests and web tests; create `apps/web/src/workspace/QuarterlyRubric.tsx`; wire `WorkspaceApp.tsx`, `StudentPanel.tsx`, `workspace-api.ts`, and applicable styles.
- Preserve projection allowlists/DTOs, annual XP and game semantics, RT/Energy, behaviour, narrative, roster/archive/calendar rules, and deployment policy. No new dependency, cache, public route, or browser persistence.

## Read Order

1. This `DESIGN.md`, root `AGENTS.md`, and `docs/architecture/sdd-lite.md`.
2. `apps/api/src/xp/{service,repository,routes}.ts`, migration `0004`, and `apps/api/src/calendar/{service,repository,routes}.ts`.
3. `apps/api/src/roster/calendar-context.ts`, migration `0011`, `apps/api/src/db/{schema,migrations}.ts`, `server.ts`, contracts, errors, and ownership/idempotency tests.
4. `apps/web/src/workspace/{WorkspaceApp,StudentPanel,workspace-api,workspace-state}.tsx` and focused workspace tests.
5. `apps/api/src/projection/{mapper,routes,repository}.ts` and `apps/api/test/privacy/projection.test.ts`.

## Bounded Cohesive Task Slices

### Slice 1 — Attribution, schema, and domain (RED → GREEN)

- [x] 1.1 Add failing domain tests for base-XP thresholds, counts/warnings, override precedence, integer grade/decimal formatting, and lifecycle transitions; then implement the cohesive rubric domain rules.
- [x] 1.2 Add migration/schema tests first, then create `0015` and Drizzle tables/indexes/FKs/checks for attribution, evaluations, immutable snapshots/evidence, lifecycle events, and idempotency requests; register migration transactionally.
- [x] 1.3 Add failing XP attribution tests, then update XP service/repository through the calendar adapter to require and snapshot one matching active session/term while preserving annual effective-XP behavior and legacy null attribution.

### Slice 2 — Private API and persistence (RED → GREEN)

- [x] 2.1 Add SQLite/repository RED tests for active/reversed aggregation, snapshot lineage/immutability, version continuity, stale revisions, rollback, and `BEGIN IMMEDIATE` serialization; implement repository/service transactions and ownership/archive/state/idempotency rules. Evidence: `pnpm exec vitest run apps/api/test/integration/quarterly-rubric-schema.test.ts` — passed (1 file, 1 test).
- [x] 2.2 Add Fastify RED tests for the three private routes, DTOs, statuses, ownership-as-404, bounded zero-evidence group query without N+1, and payload-free safe errors/logs; implement rubric mapper/routes and register them in `server.ts`. Evidence: `pnpm exec vitest run apps/api/src/rubric/routes.integration.test.ts` — passed (1 file, 1 test); covers authenticated private access, virtual zero-evidence DTO, ownership privacy, revision enforcement, idempotent replay, close snapshot grade, and bounded group view.

### Slice 3 — Workspace integration and privacy regression

- [x] 3.1 Add web tests for Spanish rubric fields/actions and every Design Section 8 loading, empty, retry, pending, stale, context-change, reload, closed/reopened, confirmation, and read-only state; implement API types/client and `QuarterlyRubric.tsx` wiring. Evidence: `pnpm exec vitest run apps/web/src/workspace/QuarterlyRubric.test.tsx apps/web/src/workspace/workspace-api.test.ts` — passed (2 files, 24 tests), including ambiguous retry-key preservation, stale local edits, context reset/remount rehydration, closed/reopened confirmation, Spanish loading/empty/pending/read-only/grade states, unsaved-change confirmation, and private rubric route/key assertions.
- [x] 3.2 Extend focused projection/Show Student negative tests for rubric fields and representative private values; keep server allowlists unchanged and prove no private data crosses the projection boundary. Evidence: `pnpm exec vitest run apps/api/test/privacy/projection.test.ts` — passed (1 file, 10 tests), with normal projection and Show Student payload/key/value exclusions; no projection implementation or allowlist files changed.

## Dependencies / Verification Notes

Implement slices in order: migration/domain → XP seam → API → web/privacy. Run only focused Vitest/API/SQLite checks for the active slice during Build; later Verify must cover AC-01–AC-14, rollout B-01/C-01, and the specified browser journey. Threat matrix is explicitly N/A, so no shell/process RED task is required.

Critical Terra Verification Gate: NOT REQUIRED

## Current Correction Evidence — Verify blocker #1

- Corrected the unshipped `0015` migration directly: nullable XP attribution is enforced against the complete session/owner/year/term lineage, and rubric evaluations now enforce student/group and group/year/owner composite lineage.
- Focused proof: `pnpm exec vitest run apps/api/test/integration/quarterly-rubric-schema.test.ts` — passed (1 file, 2 tests).
- Covered valid nullable and attributed XP, mismatched XP owner/year/term rejection, rubric student/group mismatch rejection, rubric group/year/owner mismatch rejection, valid rubric lineage insertion, and clean `PRAGMA foreign_key_check`.

## Current Correction Evidence — Verify blocker #2

- Rubric service now returns an explicit `201` created or `200` replay result from the idempotency transaction; close and reopen routes use that result rather than inferring replay state.
- Focused proof: `pnpm exec vitest run apps/api/src/rubric/routes.integration.test.ts` — passed (1 file, 1 test).
- The integration test proves close and reopen fresh/replay `201/200`, exact replay payload/lineage, unchanged snapshot version and revision on replay, and `409` for changed semantic reuse of each key.
