# SPEC-0030 M4 — Terra Verification

**Verdict: PASS WITH WARNINGS.** `TASKS.md` explicitly requires the Critical Terra Verification Gate. All approved tasks are checked, and current targeted runtime and type-safety evidence satisfies the Design acceptance matrix after the bounded CI correction.

## Scope and review basis

Terra reviewed the active `DESIGN.md`, `TASKS.md` Read Order and Expected Change Surface, completed-task evidence, the prior `VERIFY.md`, and the current M4 implementation. The review compared migration/schema, calendar start, behaviour, XP/RT/Gem/startup reconciliation, game, teacher UI, and projection boundaries to the Design. No product code was edited. Playwright was not run: it is non-default for this control-plane verification and the focused component, API, SQLite, privacy, migration, and type checks leave no unresolved browser-only question.

## Task completion and Design compliance

| Area | Completed task(s) | Result |
| --- | --- | --- |
| Migration, schema, and preflight | 1.2 | PASS — registered `0014_behaviour_lives` adds the six behaviour tables, eligibility/outcome columns and receipt constraint; preflight rejects active sessions and drift without application seed/backfill. |
| Behaviour lifecycle and private API | 1.1–2.3 | PASS — policy matrix, four-life default/carry, snapshot/replay, owner-scoped operations, bounds, idempotency, incident/proposal lifecycle, and report-route `404` are covered. |
| XP/RT eligibility and replay lineage | 3.1.1–3.1.3 | PASS — immutable award/entitlement eligibility drives APPLIED/DENIED/NO_MOVEMENT outcomes; no denied movement/catch-up path was found. |
| RT startup reconciliation correction | 3.1.3 | PASS — startup validates the persisted RT chain before replaying its current revision. A missing current revision is rejected atomically with the canonical `RT revision continuity or CAS is invalid.` contract; incomplete historical chains use `RT revision chain is incomplete.` No changed cursor, receipt, or ledger commit is possible because reconciliation runs in one immediate transaction. |
| Direct Gem gates and special activities | 3.1.4–3.2 | PASS — receive/spend reject `BEHAVIOUR_RESTRICTED` before writes; correction/reversal remains allowed; RED_CODE filtering and empty eligible-roster atomic rejection are covered. |
| Private teacher UI | 3.3 | PASS WITH WARNING — Spanish Vidas controls and loading, empty, disabled, retry, error, success, read-only, reload, and context-change states pass. |
| Projection privacy | 3.3 | PASS — the server-side projection mapper remains an explicit safe allowlist with no behaviour field; privacy tests pass. |

## Current execution evidence (2026-09-14)

| Command | Result |
| --- | --- |
| `pnpm exec vitest run apps/api/src/behaviour apps/api/test/integration/migrations.test.ts apps/api/test/integration/dto.test.ts apps/api/test/privacy/projection.test.ts apps/api/src/xp/repository.test.ts apps/api/src/xp/level-grant-transition-port.test.ts apps/api/src/rt/service.test.ts apps/api/src/gems/service.test.ts apps/api/src/gems/startup-reconciliation.test.ts apps/api/src/game/service.test.ts apps/api/src/game/repository.test.ts apps/web/src/workspace/BehaviourPanel.test.tsx apps/web/src/workspace/workspace-api.test.ts` | Exit 0 — **16 files, 99 tests passed** in 7.36s. This includes 5 startup-reconciliation tests covering allowed/denied XP and RT replay, NO_MOVEMENT, missing-revision rejection/rollback, and contradictory lineage. `BehaviourPanel.test.tsx` emitted React testing-environment `act(...)` warnings. |
| `pnpm typecheck` | Exit 0 — recursive API and web TypeScript checks passed. The bounded CI null-safety correction in `apps/api/src/gems/service.ts` remains type-safe. |

## Security, data integrity, and privacy findings

- **Migration/data integrity:** PASS. `0014` retains `CHECK`, unique, and `RESTRICT` constraints; XP receipt movement is nullable only for `DENIED`, and existing eligibility/outcome defaults preserve legacy rows.
- **Atomicity/replay:** PASS. Calendar invokes the behaviour start port in its existing transaction. Startup reconciliation uses `runImmediateTransaction`; RT continuity is checked before current baseline application, and focused runtime evidence confirms rollback on a missing revision.
- **Authorization/privacy:** PASS. Private behaviour routes are session-protected and owner-scoped; projection DTO mapping is explicitly allowlisted and behaviour-free. Server logging redacts request bodies, parameters, query strings, and headers.
- **Acceptance baseline:** PASS for the applicable migration, persistence/reload, correction/retry, authorization/privacy, UI state, and classroom/projection obligations. Browser automation was not applicable to this bounded CI correction; existing focused UI/API runtime coverage is sufficient here.

## Findings

### CRITICAL

None.

### WARNING

1. `BehaviourPanel.test.tsx` still emits repeated React testing-environment `act(...)` warnings despite passing assertions. This is a test-environment cleanup item, not a demonstrated product defect.

### SUGGESTION

None.

## Residual risk

The residual risk is limited to the existing React `act(...)` test-environment warnings. Targeted runtime evidence covers the changed startup reconciliation path, including the canonical missing-revision rejection and atomic rollback; no migration, privacy, security, data-integrity, or acceptance blocker remains.
