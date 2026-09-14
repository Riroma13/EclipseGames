# SPEC-0036 — Verification

## Verdict

**PASS WITH WARNINGS — bounded verification.** The completed correction evidence
and fresh focused runtime checks pass, and the latest typecheck/build correction
is confirmed. The implementation is consistent with the bounded Design surface,
but several Design-required end-to-end matrices are not fully exercised by the
available focused tests, so this is not a claim of risk-free production rollout.

Terra was not invoked: `TASKS.md` explicitly says `Critical Terra Verification
Gate: NOT REQUIRED`. No Sol, Terra, Git, or VCS operation was performed.

## Bounded scope and read order

- Read the active `DESIGN.md`, `TASKS.md`, prior `VERIFY.md`,
  `docs/architecture/sdd-lite.md`, the TASKS Read Order, Expected Change Surface,
  and completed correction evidence.
- Inspected the directly named rubric/domain, migration, XP seam, private API,
  workspace, and projection-boundary files only.
- All task checkboxes in `TASKS.md` are checked.
- Playwright was not run. No unresolved acceptance question required browser
  execution; focused web Vitest evidence was available.
- B-01 and C-01 are rollout conditions under the Design, not technical
  candidate blockers on the current evidence.

## Fresh commands and exact results

All commands ran from the repository root during this verification task.
Historical commands in `TASKS.md` and the prior `VERIFY.md` were not counted.

| Command | Result |
|---|---|
| `pnpm exec vitest run packages/domain/test/rubric.test.ts` | PASS; 1 file, 3 tests; exit 0; duration 605ms |
| `pnpm exec vitest run apps/api/test/integration/quarterly-rubric-schema.test.ts` | PASS; 1 file, 2 tests; exit 0; duration 1.19s |
| `pnpm exec vitest run apps/api/src/rubric/routes.integration.test.ts apps/api/src/rubric/blocker3.integration.test.ts` | PASS; 2 files, 4 tests, including blocker #3's 3 tests; exit 0; duration 5.16s |
| `pnpm exec vitest run apps/web/src/workspace/QuarterlyRubric.test.tsx apps/web/src/workspace/workspace-api.test.ts` | PASS; 2 files, 24 tests; exit 0; duration 3.04s; React `act(...)` warnings emitted |
| `pnpm exec vitest run apps/api/test/privacy/projection.test.ts` | PASS; 1 file, 10 tests; exit 0; duration 9.87s |
| `pnpm typecheck` | PASS; recursive web and API TypeScript checks completed; exit 0 |
| `pnpm build` | PASS; recursive web Vite build and API TypeScript build completed; exit 0 |

## Recent correction evidence confirmed

- **Blocker #1:** fresh composite-FK schema proof passed 2 tests, covering valid
  nullable/attributed XP, mismatched XP lineage rejection, rubric lineage
  rejection, valid insertion, and clean `PRAGMA foreign_key_check`.
- **Blocker #2:** fresh route proof passed; close/reopen fresh and replay return
  `201/200`, replay payload/lineage remain unchanged, and semantic key reuse is
  rejected with `409`.
- **Blocker #3:** `blocker3.integration.test.ts` passed 3 tests for serialized
  competing operations, rollback without residue, immutable snapshots/stale
  reads, and live evidence after reopen. The live-evidence read fix and approved
  grade expectations are therefore passing.
- **Latest type correction:** `pnpm typecheck` and `pnpm build` now pass; the
  correction is test typing only and introduces no production behavior change.

## Code/design and privacy comparison

- The XP service resolves active owned session attribution server-side and stores
  session/term on the event; annual aggregation continues to use `effective_xp`.
- Rubric aggregation reads active attributed events and sums `base_xp`; domain
  rules implement the four exact thresholds, count `<4` warnings, nullable
  overrides, integer `levelSum * 625`, fixed decimal formatting, and lifecycle
  transitions.
- The migration preserves null legacy attribution, enforces rubric lineage and
  value checks, and creates snapshot, evidence, lifecycle, and idempotency tables.
- Private routes use cookie authentication, ownership-safe lookup, Zod validation,
  expected revisions, UUID-v4 idempotency keys, immediate transactions, and
  explicit replay statuses.
- The workspace renders the Spanish rubric, reload/cancel/retry/pending/stale/
  closed/reopened/read-only states, and resets private state on context changes.
- Projection routes continue to call the server allowlist mapper; fresh negative
  tests exclude rubric field names and representative private values from normal
  projection and Show Student responses. No projection implementation or
  allowlist change was observed in the expected surface.

## Acceptance mapping

| AC | Status | Evidence / residual gap |
|---|---|---|
| AC-01 | PARTIAL | XP seam and FK lineage proof pass; no dedicated full XP creation/session failure matrix. |
| AC-02 | PARTIAL | Null legacy attribution and private count exist; annual-preservation and exclusion are not fully end-to-end asserted. |
| AC-03 | PASS WITH WARNING | Domain thresholds/base aggregation pass; no dedicated populated bonus/effective/behaviour matrix. |
| AC-04 | PARTIAL | Reversal filtering is implemented; focused aggregate/count-warning matrix is incomplete. |
| AC-05 | PASS WITH WARNING | Integer grade/formatting pass; full override and decimal boundary matrix is not shown. |
| AC-06 | PARTIAL | Web save/cancel/reload passes; database live-read/no-cache proof is incomplete. |
| AC-07 | PASS WITH WARNING | Lifecycle, replay, version continuity, and closed snapshot behavior pass; full closed mutation matrix is incomplete. |
| AC-08 | PASS WITH WARNING | Immutable/stale/version-2 evidence passes; complete actor/time/history assertions are not present. |
| AC-09 | PARTIAL | Auth/ownership/revision/idempotency, rollback, and concurrency evidence pass; complete status/log failure matrix is absent. |
| AC-10 | PARTIAL | Private routes and zero-evidence group view pass; explicit N+1 and complete DTO/log matrix are not proven. |
| AC-11 | PARTIAL | 24 web tests pass; every accessibility, responsive, archive, and context-race combination is not proven in a browser. |
| AC-12 | PASS WITH WARNING | Ten projection privacy tests pass; seeded rubric records are not routed through every projection test. |
| AC-13 | PARTIAL | No rubric cross-domain writes observed and annual XP seam is preserved; complete RT/Energy, gems/coins, behaviour, narrative, roster, and calendar regression proof is absent. |
| AC-14 | PASS WITH WARNING | Focused domain/database/API/web/privacy checks plus typecheck/build pass; full Sections 3–10 and browser journey evidence remains incomplete. |

## Findings and residual risk

### WARNING

1. The focused suite does not prove every Design-required end-to-end scenario,
   especially XP attribution failure/annual preservation, reversal aggregates,
   complete API status/log contracts, N+1 behavior, and cross-domain
   non-interference.
2. Web tests emit React `act(...)` warnings despite passing.
3. **B-01:** active legacy XP without trustworthy term identity must remain
   annual-only; rollout over such evidence requires the maintainer-approved
   auditable attribution/re-entry policy required by Design.
4. **C-01:** production use remains gated on approved retention/deletion,
   backup-expiry, and executed encrypted-restic restore evidence.

### No current critical findings

All commands executed in this bounded task passed. No bounded Design-authorized
Build correction was required, so no correction was routed.

## Circuit-breaker record

No current debugging/testing strategy failed twice. No third repetition, scope
broadening, Playwright repetition, Terra/Sol escalation, or runtime tracking was
performed.
