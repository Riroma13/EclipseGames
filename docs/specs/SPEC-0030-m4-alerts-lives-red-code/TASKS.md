# Tasks: SPEC-0030 M4 Behaviour Restrictions

## Expected Change Surface

- Modify `apps/api/src/db/schema.ts`, `apps/api/src/db/migrations.ts`, and create `apps/api/drizzle/0014_behaviour_lives.sql`.
- Create a cohesive `apps/api/src/behaviour/` module with domain, repository, service, routes, DTO mapping, and Vitest coverage; wire it in `apps/api/src/server.ts`.
- Modify `apps/api/src/calendar/service.ts`, `apps/api/src/xp/{service,routes}.ts`, `apps/api/src/rt/service.ts`, `apps/api/src/gems/{service,routes,startup-reconciliation}.ts`, and their focused tests.
- Modify `apps/web/src/workspace/{workspace-api,StudentPanel,StudentCard,WorkspaceApp}.tsx` as needed; add component/integration and `apps/web/e2e/spec-0030-behaviour.spec.ts` coverage. Do not modify projection files.

## Read Order

1. `DESIGN.md`; then `apps/api/src/db/schema.ts`, `migrations.ts`, `services/transactions.ts`.
2. Calendar/session, roster ownership, XP/Gem/RT services and route tests listed above.
3. Existing integration/privacy tests, then workspace API/components and E2E fixtures.

## Review Workload Forecast

Estimated changed lines: 900–1,400; 400-line budget risk: High.
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending

Suggested work units: (1) RED boundary tests + migration/domain foundation — focused `pnpm exec vitest run apps/api/src/behaviour apps/api/test/integration/migrations.test.ts`; runtime N/A (API contract only); rollback new module/migration. (2) Lifecycle/API and XP/RT/Gem integration — focused affected API Vitest files; runtime session/restriction scenario; rollback API changes. (3) Private UI and journey tests — focused web Vitest plus SPEC-0030 E2E; runtime teacher journey; rollback web changes.

## Bounded Cohesive Slices

### Slice 1 — RED boundaries and persistence

- [x] 1.1 Add RED tests for unauthenticated, wrong-owner, wrong-session/group identity, malformed/non-roster requests, and ordinary `404` report-confirmation routes.
- [x] 1.2 Add migration/schema tables, constraints, snapshot/eligibility/outcome columns, and preflight rejection; prove rollback, no backfill/seed, and legacy `NULL` behavior.
- [x] 1.3 Add policy/derivation/carry tests RED, then implement the behaviour domain and repository invariants.

### Slice 2 — Session lifecycle and behaviour API

- [x] 2.1 Extend calendar start with `BehaviourSessionStartPort` inside the existing `BEGIN IMMEDIATE`; implement snapshot, replay, empty-roster, action, incident, proposal, correction, and idempotency services.
- [x] 2.2 Add owner-scoped private routes/DTOs for state, loss, restore, correction, and dismissal; verify `401/404/409/422` and privacy-safe logs.
- [x] 2.3 Add RED/GREEN integration tests for carry across end/unopened dates, races, bounds, proposal withdrawal, and no report registration.

Fresh evidence: `pnpm exec vitest run apps/api/src/behaviour/routes.integration.test.ts` — 5 tests passed (2026-09-13). Slice 2 is verified closed.

Fresh evidence for 3.1.1: `pnpm exec vitest run apps/api/src/gems/service.test.ts apps/api/src/xp/repository.test.ts` — 2 files and 9 tests passed (2026-09-13). Covers APPLIED lineage/replay/reversal, DENIED receipt replay and correction lineage, nullable movement, immutable award snapshots, and contiguous cursor assertions. Runtime harness: N/A; this bounded source seam is covered by focused SQLite/Vitest integration tests. Rollback boundary: `apps/api/src/xp/service.ts`, `apps/api/src/gems/service.ts`, and the focused XP/Gem test additions.

### Slice 3 — Cross-domain restrictions and UI journey

- [x] 3.1.1 **First executable subtask — XP source gating:** update `apps/api/src/xp/service.ts` and `apps/api/src/gems/service.ts` so XP snapshots capture behaviour eligibility and XP receipts support `APPLIED|DENIED` with nullable movement; cover contiguous cursor advancement, exact replay, denied replay, and correction lineage in focused XP/Gem tests. Boundary: XP create/reverse plus its source receipts/cursor are correct; RT, direct Gem requests, and startup orchestration remain untouched. Evidence: focused XP/Gem Vitest tests and receipt/cursor row assertions.
- [x] 3.1.2 **RT source gating:** update `apps/api/src/rt/service.ts` and `apps/api/src/gems/service.ts` so entitlement creation captures eligibility and reconciliation revisions support `APPLIED|NO_MOVEMENT|DENIED`; cover allowed/denied baseline, revision replay, CAS, and stable receipt identity. Boundary: RT revision chains and ledger effects are correct in isolation; startup and direct-request gates remain untouched. Evidence: focused RT/Gem Vitest tests and revision/ledger assertions.
- [x] 3.1.3 **Startup replay chain:** update `apps/api/src/gems/startup-reconciliation.ts` and its integration tests to replay the XP and RT outcomes established by 3.1.1–3.1.2, preserving contiguous cursors, fingerprints, and atomic rollback. Boundary: startup reconciliation is verified against persisted allowed/denied outcomes; direct-request and UI work remains untouched. Evidence: `pnpm exec vitest run apps/api/src/gems/startup-reconciliation.test.ts apps/api/src/xp/level-grant-transition-port.test.ts apps/api/src/gems/service.test.ts apps/api/src/rt/service.test.ts` — 4 files and 23 tests passed (2026-09-13). Covers allowed/denied XP replay without catch-up, allowed/denied RT replay, NO_MOVEMENT, revision continuity rejection, contradictory fingerprint rejection, and transaction rollback. Runtime harness: N/A; startup reconciliation is the bounded synchronous API source seam and is covered by focused SQLite/Vitest integration tests. Rollback boundary: `apps/api/src/gems/startup-reconciliation.ts`, `apps/api/src/gems/service.ts` (shared persisted-lineage validation), and `apps/api/src/gems/startup-reconciliation.test.ts`.
- [x] 3.1.4 **Direct Gem request gate:** update `apps/api/src/gems/routes.ts`/`service.ts` to return `409 BEHAVIOUR_RESTRICTED` before any result-reward or advantage-spend write, while leaving correction/reversal paths allowed; add focused route tests for denial, unchanged tables, and correction success. Boundary: direct request authorization/atomicity is complete; special-activity and UI work remain untouched. Evidence: `pnpm exec vitest run apps/api/src/gems/service.test.ts` — 1 file and 6 tests passed (2026-09-13); pre/post row counts remain unchanged, result-reward correction remains allowed, and the advantage denial fixture reaches lives 2/`ALERT` via two distinct canonical `loseLife` keys. Runtime harness: N/A; this bounded Gem service seam is covered by focused SQLite/Vitest integration tests. Rollback boundary: `apps/api/src/gems/service.test.ts` and this task evidence entry.
- [x] 3.2 Exclude RED_CODE from special activity atomically; add unchanged XP/RT/ledger/balance/coin assertions and no-catch-up tests. Evidence: `pnpm exec vitest run apps/api/src/game/service.test.ts apps/api/src/game/repository.test.ts` — 2 files and 18 tests passed (2026-09-13). Focused coverage exercises all six filtered boundaries (`launchRandomDraw`, `drawStudent`, RANDOM_DRAW reset, `launchTeamDraw`, `shuffleTeamDraw`, TEAM_DRAW reset), lives 4/3/2 inclusion, lives 1/0 exclusion, no-session roster preservation, empty-roster `409 BEHAVIOUR_RESTRICTED` rollback, insufficient team count `422` atomicity, current-eligibility resnapshot versus historical snapshots, and unchanged XP/RT/Gem ledger/allocation/coin/balance rows. Transaction audit: `apps/api/src/services/transactions.ts` wraps better-sqlite3 `database.transaction(work)` with `.immediate()`; all six eligibility-plus-selection/resnapshot paths in `apps/api/src/game/service.ts` now use `runImmediateTransaction`, with no new abstraction. Runtime harness: N/A; this synchronous SQLite game service boundary is covered by focused Vitest integration tests. Rollback boundary: `apps/api/src/game/service.ts`, `apps/api/src/game/service.test.ts`, and `apps/api/src/game/repository.test.ts`.
- [x] 3.3 Add Vidas controls and all loading/empty/disabled/retry/error/success/read-only/reload/context states; prove the teacher journey and absence of behaviour fields in projection. Evidence: `pnpm exec vitest run apps/web/src/workspace/BehaviourPanel.test.tsx apps/web/src/workspace/workspace-api.test.ts apps/api/test/integration/dto.test.ts` — 3 files and 19 tests passed (2026-09-13); `pnpm exec vitest run apps/api/src/behaviour/routes.integration.test.ts apps/api/src/behaviour/domain.test.ts apps/api/src/behaviour/repository.test.ts` — 3 files and 9 tests passed (2026-09-13). Covers Spanish Vidas/state matrix, loss/restore/Deshacer, proposal dismissal without report confirmation, loading/empty/error/retry/disabled/read-only, active-session and student context changes, API client routes, and projection DTO exclusion. Runtime harness: N/A; focused component/API boundary tests cover this UI slice. Rollback boundary: `apps/web/src/workspace/BehaviourPanel.tsx`, `BehaviourPanel.test.tsx`, `workspace-api.ts`, `WorkspaceApp.tsx`, `styles.css`, and the private behaviour DTO extension in `apps/api/src/behaviour/service.ts`.

Focused evidence for 3.1.2: `pnpm exec vitest run apps/api/src/rt/service.test.ts apps/api/src/gems/service.test.ts` — 2 files and 11 tests passed (2026-09-13). Covers APPLIED RT grant/revoke/reinstate lineage and replay, CAS, immutable denied eligibility with DENIED revisions and no ledger family/catch-up, NO_MOVEMENT for an unconsumed correction, stable receipt fingerprints, and existing Gem/XP boundaries. Runtime harness: N/A; this bounded RT source seam is covered by focused SQLite/Vitest integration tests. Rollback boundary: `apps/api/src/rt/service.ts`, `apps/api/src/gems/service.ts`, and the focused RT test additions.

## Dependencies and Acceptance Mapping

Slice 1 precedes Slice 2; Slice 2 precedes Slice 3. Acceptance maps to Design §§Behaviour/API/privacy/migration/tests: state matrix and invariants (1.3, 2.1), atomic start/rollback and persistence (1.2, 2.3), identity/restrictions/replay (1.1, 2.2, 3.1–3.2), Spanish private UI and journey (3.3), projection exclusion (3.3).

## Critical Terra Verification Gate: REQUIRED

Level C requires Terra verification of migration safety, cross-domain atomicity, privacy/authorization, replay/lineage invariants, and the complete acceptance matrix before completion.
