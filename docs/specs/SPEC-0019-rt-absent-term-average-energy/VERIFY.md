# SPEC-0019 — Verification

## Scope and level

**Level C.** Terra verification compared the approved `DESIGN.md`, `TASKS.md`,
SPEC-0018's session/lineage contract, canonical `.ai/context` authority, current
implementation, migration/schema, private route and DTO boundaries, and runtime
evidence. No M3 ledger action, projection/export/rubric/close, or other deferred
scope was implemented.

## Bounded Build corrections during verification

- `GET` now returns the active group roster before the first RT mutation, while
  the first write remains the transactionally snapshotted roster boundary. This
  unblocks the approved RT grid without weakening server-side write validation.
- Full-term replay now orders entries by `real_class_sessions.started_at, id`,
  rather than entry-save timestamp.
- The entitlement port now exposes the approved boolean/revisioned consumption
  snapshot and transaction-last API shape; it retains CAS consumption semantics.
- The RT grid retains the original idempotency key after a failed per-student
  save and supplies an explicit retry action.

## Commands and results

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/rt/domain.test.ts apps/api/src/rt/service.test.ts apps/api/src/rt/routes.integration.test.ts apps/api/test/integration/migrations.test.ts` | PASS — 4 files, 17 tests |
| `pnpm test` | PASS — 38 files, 161 tests |
| `pnpm typecheck` | PASS — web and API TypeScript checks |
| `pnpm build` | PASS — Vite web and API TypeScript build |
| `pnpm exec playwright test apps/web/e2e/calendar-sessions.spec.ts` | PASS — 1 Chromium test; confirms the active SPEC-0018 session boundary consumed by RT |
| `pnpm exec playwright test` | WARNING — 44/45 passed; the existing `auth-projection.spec.ts` timed out waiting for stale seed text `Weekend Story`. It is unrelated to SPEC-0019; no SPEC-0019 browser journey exists yet. |

## Acceptance mapping

| Design acceptance | Evidence | Status |
|---|---|---|
| Deterministic term RT, null average/Energy, ABSENT and bands/streak replay | `domain.test.ts` covers ABSENT exclusion, null state, every boundary, fourth-complete reset; `service.test.ts` proves session-start ordering. | PASS |
| Active owned writes, atomic roster lineage, retry/idempotency, and closed lock | Migration constraints inspected; service tests prove snapshot/lock, closed rejection and unchanged `coin_ledger`; Fastify integration proves `401`, private GET, `201` create, `200` exact replay, and `409` mismatch. | PASS |
| Private teacher workflow without projection leakage | RT routes are session-authenticated and return student IDs/entries only; RT is absent from roster and projection DTO/mapper code. Existing projection privacy suite passed (10 tests). Grid has `10/5/0/Ausente`, qualitative summary, and retained retry key. | PASS WITH CONDITION |
| Durable revisioned M2 entitlement seam and zero currency writes | Migration has stable source/first-consumption fields and composite lineage FK. Service contract test proves active state, snapshot shape, successful CAS and stale consume rejection. RT module has no `coin_ledger`/gem write path; mutation test verifies the ledger count stays zero. | PASS WITH CONDITION |

## Findings and residual risk

- **C-01 (production-only):** encrypted-restic restore, retention/deletion, and
  backup-expiry evidence remain absent; real student data and production use stay
  blocked.
- **Browser coverage gap:** DESIGN.md requires a SPEC-0019 Playwright journey
  (bulk/subsets/retry/correction/close/empty term). The repository has Playwright,
  but no RT E2E specification. API, domain, migration, and build evidence pass;
  this remains a verification condition rather than evidence of a runtime defect.
- **Full Playwright warning:** the one failure is the pre-existing seed/isolation
  expectation for `Weekend Story`, not an RT route/UI assertion.

## Verdict

**PASS WITH CONDITIONS.** The approved M2 implementation and bounded corrections
meet the verified domain, persistence, lineage, private API, DTO, and no-currency
requirements. Add the required RT browser journey before treating the workflow
coverage as complete; C-01 remains a production gate.
