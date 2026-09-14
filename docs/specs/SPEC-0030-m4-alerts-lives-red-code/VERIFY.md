# SPEC-0030 M4 — Terra Verification

**Verdict: PASS WITH WARNINGS — the prior compiler blocker is resolved; the approved M4 behaviour scope is verified with focused runtime and type-safety evidence.**

Terra verification is required by `TASKS.md`'s `Critical Terra Verification Gate: REQUIRED`. This re-verification compared the active `DESIGN.md`, all checked `TASKS.md` slices, the previous verification record, the corrected `apps/api/src/gems/service.ts` change surface, migration/projection source, and current runtime evidence. No product code was changed. Playwright was not run: it is non-default for this control-plane re-verification, and no unresolved browser-only question remained after the focused API, migration, privacy, component, and typecheck checks.

## Completeness

| Area | Task status | Verification result |
| --- | --- | --- |
| Migration, schema, no-backfill/preflight | 1.2 complete | PASS: `0014_behaviour_lives` is registered and migration tests pass. It creates the six behaviour tables, immutable eligibility/outcome columns, nullable XP receipt movement linkage, constraints, and indexes. |
| Behaviour lifecycle, ownership, sessions | 1.1–2.3 complete | PASS: focused behaviour tests pass for private boundary statuses, carry, idempotency/races, bounds, correction, proposal withdrawal, and no report-confirmation route. |
| XP / RT eligibility and replay lineage | 3.1.1–3.1.3 complete | PASS: XP, RT, Gem, and startup reconciliation tests pass. The corrected null guards retain the approved immutable unlock/entitlement eligibility snapshots before deriving outcomes. |
| Direct Gem gates and special activities | 3.1.4–3.2 complete | PASS: Gem/game tests pass, including restricted atomic paths, correction exception, and eligible-roster filtering. |
| Teacher UI | 3.3 complete | PASS with warning: focused component/API tests pass; React `act(...)` environment warnings remain. |
| Projection privacy | 3.3 complete | PASS: the projection privacy test proves the Show Student response has no `behaviourState`; the projection mapper's allowlisted DTO has no behaviour field. |

## Current execution evidence

| Command | Result |
| --- | --- |
| `pnpm exec vitest run apps/api/src/behaviour apps/api/test/integration/migrations.test.ts apps/api/test/integration/dto.test.ts apps/api/test/privacy/projection.test.ts apps/api/src/xp/repository.test.ts apps/api/src/xp/level-grant-transition-port.test.ts apps/api/src/rt/service.test.ts apps/api/src/gems/service.test.ts apps/api/src/gems/startup-reconciliation.test.ts apps/api/src/game/service.test.ts apps/api/src/game/repository.test.ts apps/web/src/workspace/BehaviourPanel.test.tsx apps/web/src/workspace/workspace-api.test.ts` | Exit 0. **16 files / 99 tests passed.** `BehaviourPanel.test.tsx` emitted repeated React testing-environment `act(...)` warnings. |
| `pnpm typecheck` | Exit 0. Recursive API and web TypeScript checks passed. The previous strict-null errors in `apps/api/src/gems/service.ts` are resolved. |

## Acceptance, privacy, migration, and atomicity matrix

| Acceptance area | Status | Current evidence |
| --- | --- | --- |
| State matrix, actions, carry, incidents/proposals | PASS | Behaviour domain, boundary, repository, and route integration tests pass. |
| Atomic session start/replay and migration preflight | PASS | Migration/lifecycle tests pass; migration registration and `0014` source confirm the intended narrow schema change and constraints. |
| XP/RT snapshots, receipt outcomes, replay/cursor chains | PASS | XP/RT/Gem/startup tests pass. `applyXp` now fails explicitly when the unlock snapshot is absent, then derives grant eligibility from the same immutable snapshot semantics; `applyRtStates` does the equivalent for an entitlement snapshot. No eligibility, outcome, lineage, cursor, or transaction behaviour was broadened. |
| Direct Gem restrictions and correction/reversal exception | PASS | Gem service tests pass; restricted direct receive/spend requests fail before persistence, while correction remains allowed. |
| Six special-activity boundaries and atomicity | PASS | Game service/repository tests pass. |
| Private Spanish UI states | PASS with warning | BehaviourPanel and workspace API tests pass, including loading, empty, disabled, retry, error, success, read-only, reload, and context-change states; see warning below. |
| Projection remains behaviour-free | PASS | `projection.test.ts` passes: Show Student omits `behaviourState`, and `toProjectionStudentDto` maps only its explicit safe allowlist. The prior projection privacy blocker remains fixed. |
| Migration safety and rollback constraints | PASS | Migration tests pass; `0014` retains pre-use schema migration semantics, default-`1` legacy eligibility values, receipt constraints, and no application-level seed/backfill path. |
| Build/type-safe deliverable | PASS | `pnpm typecheck` exits 0 after the Luna null-safety correction. |

## Findings

### CRITICAL

None.

### WARNING

1. `BehaviourPanel.test.tsx` passes but emits repeated React `act(...)` environment warnings. This does not invalidate the focused assertions, but the test environment should be corrected in a separately bounded cleanup so async UI evidence remains clean.

### SUGGESTION

None.

## Residual risk

Focused non-browser tests provide current runtime evidence for migration safety, ownership/privacy, lifecycle, cross-domain lineage, direct-request atomicity, and projection DTO exclusion. Playwright was deliberately not repeated: it is non-default for this correction and no browser-only uncertainty remains. The remaining risk is limited to the known React test-environment warnings, not a failing product behaviour or typecheck.
