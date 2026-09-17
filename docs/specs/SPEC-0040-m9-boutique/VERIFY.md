# SPEC-0040 M9 Boutique / Avatar Cosmetics Verification

**Verdict: PASS WITH WARNINGS.** The active Design, completed Tasks, current
workspace implementation/tests, and authoritative maintainer evidence are
consistent for the verified Slice 5 and reconciliation scope. No product code
or tests were modified.

**Terra:** NOT REQUIRED. `TASKS.md` explicitly states
`Critical Terra Verification Gate: NOT REQUIRED`.

**VCS:** No Git/VCS commands were run.

## Bounded read order and evidence

Read in the required order:

1. `DESIGN.md`, including D02–D25, Sections 4–8, and AC-01–AC-14.
2. `TASKS.md`, including Expected Change Surface, Read Order, completed Slices
   1–5, and the Terra gate.
3. This prior `VERIFY.md`, preserving valid undo persistence and removed-
   student evidence while correcting stale scope/results.
4. Directly relevant current code/tests: `workspace-state.ts`,
   `UndoBanner.tsx`, `StudentPanel.tsx`, and the focused workspace tests.

The maintainer-supplied results below are authoritative for the current
verification; checks were not rerun because no concrete evidence made them
untrustworthy.

## Commands and exact results

All commands are repository-root commands. Results below are the supplied
maintainer evidence, not new executions in this reconciliation.

| Exact command | Result |
|---|---|
| `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts` | **PASS**, exit 0; **22 passed, 0 failed**. |
| `pnpm exec vitest run with 4 explicitly specified focused test files` | **PASS**, exit 0; **16 passed, 0 failed**. Coverage includes XP pending status; StudentPanel Escape/focus; removed-student empty state, URL, and announcement; and UndoBanner completed persistence and duplicate prevention. |
| `pnpm --filter @eclipse/web typecheck` | **PASS**, exit 0. |
| `pnpm --filter @eclipse/web build` | **PASS**, exit 0. |

Additional supplied verification: stale reconciliation **PASS**; AC-03
atomicity **PASS**; runtime harness **PASS**. The build emitted the
pre-existing, non-blocking duplicate `qrcode` / `@types/qrcode` warning; it
did not fail the build.

## Design/task and acceptance comparison

| Area | Result | Evidence/finding |
|---|---|---|
| Task completeness | PASS | Slices 1–5 are checked in `TASKS.md`; Slice 5 names the focused tests and keeps built-artifact browser evidence distinct. |
| Stale reconciliation | PASS | Current evidence reconciles the prior stale statements: Playwright **was run** and passed 22/22; the prior 10-test/limited-scope wording is superseded by the supplied 16-test focused result. |
| AC-03 | PASS | Supplied runtime/API evidence verifies atomic purchase/reference, spends, allocations, receipt, and correction lock behavior with failure rollback. |
| AC-08–AC-10 | PASS for verified workspace/runtime scope | Component and browser evidence covers explicit action feedback, persistence/duplicate prevention, accessibility focus/Escape behavior, removed-student handling, and teacher workspace runtime behavior. |
| Remaining M9 AC-01–AC-07, AC-11–AC-14 | Not fully re-proven by this bounded reconciliation | Prior valid evidence remains part of the repository record, but this document does not claim that the supplied workspace checks alone re-verify every API, migration, concurrency, rollout, and audit scenario. |

## Privacy boundary and residual risk

The inspected workspace behavior preserves the existing teacher-private
student-panel boundary: removal feedback, focus behavior, and undo feedback do
not add DTO, projection, URL, storage, or logging fields. The supplied browser
and runtime results pass the relevant workspace/privacy assertions.

Residual risk remains for production use because Design rollout condition C-01
(retention/deletion, backup expiry, and executed encrypted-restic restore
verification) remains open, and B-01 remains an explicit rollout condition.
This verification also does not replace a complete independent migration,
API, concurrency, or production-data review beyond the evidence supplied here.

## Findings

- **Warning:** Build reports the pre-existing duplicate `qrcode` /
  `@types/qrcode` warning. It is non-blocking and has no observed test/build
  failure.
- **No blocker:** No product-code/test change was needed. Terra is not
  required, and no Git/VCS operation was performed.

## Final result

**PASS WITH WARNINGS** for the reconciled verification scope. Acceptance,
privacy boundaries, and the supplied runtime evidence are recorded above;
the only noted finding is the pre-existing non-blocking type-package warning,
with rollout residual risk C-01/B-01 still explicit.
