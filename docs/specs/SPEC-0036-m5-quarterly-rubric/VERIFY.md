# SPEC-0036 — Verification

## Verdict

**PASS WITH WARNINGS — fresh bounded verification.** All current tasks are
checked, the fresh full suite/typecheck/build pass, and the implementation is
consistent with the bounded Design surface. The acceptance matrix below retains
warnings where the available tests do not prove every Design-required scenario.

Terra was not invoked: `TASKS.md` explicitly says `Critical Terra Verification
Gate: NOT REQUIRED`. No Sol, Terra, Git, or VCS operation was performed.
Playwright was not run because no unresolved acceptance question required
browser execution; focused web Vitest and integration evidence was available.

## Bounded read order and scope

- Read `DESIGN.md`, `TASKS.md`, this `VERIFY.md`, `docs/architecture/sdd-lite.md`,
  the TASKS Read Order, Expected Change Surface, and completed correction
  evidence.
- Reviewed the directly named rubric/domain, migration/schema, XP/calendar seam,
  private API, workspace, projection privacy, seed-demo, and XP-route tests.
- All six implementation task slices in `TASKS.md` are checked.
- No Design-authorized Build correction was needed; no correction was routed.

## Fresh commands and exact results

All commands ran from the repository root during this verification task. Prior
`VERIFY.md`/`TASKS.md` commands were context only and were not counted.

| Command | Result |
|---|---|
| `pnpm test` | **PASS**, 61 files / 277 tests, exit 0; Vitest duration 43.27s |
| `pnpm typecheck` | **PASS**, recursive web and API TypeScript checks completed, exit 0 |
| `pnpm build` | **PASS**, recursive web Vite build and API TypeScript build completed, exit 0 |

The full-suite run included these latest evidence points: blocker #1 composite
FK tests (2), blocker #2 idempotent replay route test, blocker #3 runtime
integration tests (3), the reopened live-evidence/stale-snapshot correction,
seed-demo fixture compatibility corrections (7 tests), and the XP-routes
calendar-fixture correction (1 test). The final run also passed the web rubric
tests (9) and domain rubric tests (3).

## Correction evidence confirmed

- **Blocker #1:** migration/schema tests prove nullable legacy attribution,
  complete session/owner/year/term FK lineage, rubric student/group/year/owner
  lineage, valid insertion, and clean `PRAGMA foreign_key_check`.
- **Blocker #2:** private route evidence proves close/reopen fresh results are
  `201`, exact journal replays are `200`, replay payload/version/revision remain
  unchanged, and semantic idempotency-key reuse is `409`.
- **Blocker #3:** runtime integration evidence proves one concurrent winner,
  `409` loser, rollback without evaluation/snapshot/request/lifecycle/evidence
  residue, immutable snapshots, stale evidence after reversal, and version two
  after explicit reopen.
- **Reopened live-evidence fix:** after reversal, the closed snapshot remains
  official and stale; reopening recomputes live categories before version two.
- **Typecheck/build correction:** both fresh commands pass; no production
  behavior change is indicated by the correction evidence.
- **Seed-demo and XP fixture corrections:** full-suite seed-demo and XP-route
  integration tests pass, including real-session/calendar-compatible fixtures.

## Code, tests, and privacy comparison

- XP attribution is server-resolved from an active owned real session and
  snapshots session/term; annual aggregation remains `effective_xp` based.
- Rubric reads active attributed events and sums `base_xp`; domain code covers
  thresholds, count warnings, nullable overrides, integer grade formatting, and
  the designed lifecycle.
- Migration preserves null legacy attribution and creates lineage-constrained
  rubric, snapshot, evidence, lifecycle, and request structures.
- Private routes use cookie authentication, ownership-safe lookup, validation,
  expected revisions, UUID-v4 idempotency, immediate transactions, and replay
  statuses.
- Workspace tests cover Spanish rubric rendering, draft/reload/cancel, pending,
  retry, stale, closed/reopened, read-only, and context-reset behavior.
- Projection privacy tests pass; server allowlists remain unchanged and rubric
  fields/representative private values are excluded from projection and Show
  Student responses.

## Acceptance mapping

| AC | Status | Evidence / residual gap |
|---|---|---|
| AC-01 | PARTIAL | Attribution seam and FK proof pass; complete XP session-missing/mismatch atomic-failure matrix is not present. |
| AC-02 | PARTIAL | Nullable legacy rows are preserved; full annual-preservation, exclusion, and private reporting flow is not end-to-end asserted. |
| AC-03 | PASS WITH WARNING | Domain thresholds/base aggregation pass; populated bonus/effective/behaviour non-interference matrix is limited. |
| AC-04 | PARTIAL | Reversal filtering is implemented and blocker #3 proves live drift; full aggregate/count boundary matrix is incomplete. |
| AC-05 | PASS WITH WARNING | Integer grade and decimal boundaries pass; full four-category override/display matrix is not shown. |
| AC-06 | PARTIAL | Web draft save/cancel/reload passes; database live-read/no-cache behavior is not fully isolated by test. |
| AC-07 | PASS WITH WARNING | Lifecycle, replay, immutable versioning, and closed behavior pass; full closed-mutation status matrix is incomplete. |
| AC-08 | PASS WITH WARNING | Immutable evidence, stale state, and version two pass; complete actor/time/history DTO assertions are limited. |
| AC-09 | PARTIAL | Auth, ownership, revision, idempotency, rollback, and concurrency pass; complete status/log failure matrix is absent. |
| AC-10 | PARTIAL | Private routes and bounded group view pass; explicit query-count/N+1 and complete DTO/log matrix are not proven. |
| AC-11 | PARTIAL | Web tests pass for principal states; browser accessibility/responsive and every combined context-race journey are not proven. |
| AC-12 | PASS WITH WARNING | Projection privacy tests pass; seeded rubric records are not exercised through every projection fixture. |
| AC-13 | PARTIAL | No rubric cross-domain writes observed and annual XP regression passes; complete RT/Energy, gems/coins, behaviour, narrative, roster, and calendar regression proof is absent. |
| AC-14 | PASS WITH WARNING | Full 61-file suite, typecheck, build, and focused rubric/privacy evidence pass; complete Sections 3–10 browser evidence remains unavailable. |

## Findings and residual risk

### WARNING

1. The tests do not fully prove every Design-required end-to-end scenario,
   particularly complete XP attribution failure/legacy reporting, all reversal
   aggregate boundaries, full API status/log contracts, explicit N+1 behavior,
   and all cross-domain non-interference.
2. The web suite emits existing React `act(...)` warnings while passing.
3. **B-01 — BLOCKER only for rollout over contributing legacy XP:** active legacy
   XP without trustworthy term identity must remain annual-only. A maintainer
   must approve the auditable attribution/re-entry policy required by Design
   before claiming complete official term evidence over such data.
4. **C-01 — production condition:** production use remains blocked until
   retention/deletion, backup expiry, and executed encrypted-restic restore
   evidence are approved and complete.

### No current essential test failure

All fresh commands passed. No bounded Design-authorized Build correction was
required, and no correction was routed.

## Circuit-breaker record

No current debugging/testing strategy failed twice. No third repetition, scope
broadening, repeated Playwright, Terra/Sol escalation, or runtime tracking was
performed.
