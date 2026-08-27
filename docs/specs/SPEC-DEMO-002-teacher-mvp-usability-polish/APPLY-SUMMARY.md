# SPEC-DEMO-002 Apply Summary

## Outcome

SPEC-DEMO-002 — Teacher MVP Usability Polish completed Apply across Units 1–4, followed by the preserved test-only Verify-remediation continuation and the maintainer-authorized post-Verify correction. The historical Verify/Archive record remains preserved; the current post-correction Verify passed with conditions: 12/12 criteria, 32/32 scenarios, 13/13 tasks, zero blockers, and zero critical findings. No unrelated product code/tests were changed by refreshed Archive.

## Units and files

| Unit | Scope | Files / evidence |
|---|---|---|
| 1 — Migration/API invariant | Fail-closed migration, active group-scoped normalized uniqueness, create/reuse, race reload, rename guards | `apps/api/drizzle/0006_assessment_context_name_uniqueness.sql`; `apps/api/src/db/{migrations,schema}.ts`; `apps/api/src/coins/{service,routes}.ts`; API/migration integration tests |
| 2 — Workspace flow | Existing API client, active-context filtering, hierarchy, inline Create/select Assessment | `apps/web/src/workspace/{workspace-api.ts,StudentPanel.tsx,workspace-api.test.ts}`; `apps/web/src/styles.css` |
| 3 — Feedback and usability | Pending feedback, responsive/dialog/focus/keyboard behavior, accessible announcements, private client state | `apps/web/src/workspace/StudentPanel.tsx`; `apps/web/src/styles.css`; `apps/web/e2e/teacher-workspace.spec.ts` |
| 4 — Acceptance evidence | Canonical authenticated teacher journey, AC-01–AC-17 bundled browser objective, full checks, D-06 evaluation | `apps/web/e2e/teacher-workspace.spec.ts`; lifecycle/schema/migration evidence; no seed file changed |
| Verify remediation | Added only the missing cross-group and concurrent-create runtime scenarios; no production GREEN change | `apps/api/test/integration/coins-lifecycle.test.ts`; appended `APPLY-PROGRESS.md` evidence |

## Decisions and migrations

- B-01 uses `trim(name)` for display, `lower(trim(name))` within `group_id` for active uniqueness, create-or-reuse before insert, and unique-race canonical reload.
- Migration `0006_assessment_context_name_uniqueness.sql` adds the partial expression invariant `(group_id, lower(trim(name))) WHERE archived_at IS NULL` and fails closed when legacy active duplicates exist, without data or migration-record mutation.
- `AssessmentContextDto`, redemption uniqueness, XP/coin rules, authenticated ownership, and C-01 were preserved.
- Historical D-06 decision before correction: no seed expansion was required for the original authenticated journey. The current correction record below supersedes that decision with the minimal verified point-grant extension.
- No management page, lifecycle engine, aliases, generic idempotency layer, dependency, projection surface, or architecture expansion was introduced.

## Tests and acceptance mapping

Fresh Verify recorded exit-zero evidence for focused API/schema/migration tests (89 tests), `pnpm test` (89 tests), typecheck, build, the authenticated workspace Playwright suite (21 tests), the full client-demo harness (23 tests), and `git diff --check`. Evidence covers B-01a–B-01e, C-DEMO-02, C-DEMO-03, workspace hierarchy, assessment create/reuse, XP/coin/advantage/undo flow, responsive accessibility, privacy, and no-ranking boundaries.

Task 4.3 was independently answered YES for all three questions: first-time comprehension in about one minute, core flow without navigation/admin complexity, and improved coherence without material complexity. It is now checked in `TASKS.md`; all 13 tasks are complete.

## Deviations and unresolved conditions

- The previous Verify FAIL and its two missing runtime scenarios remain preserved as history; the remediation added only their test evidence.
- AC-01–AC-17 are a bundled browser objective because the source does not define seventeen separate prose scenarios.
- C-01 remains production-only: encrypted-restic recoverability was not demonstrated, so real student data and production use remain blocked by KI-009 until SPEC-0014/0016 work.
- Engram Design observation #2146 retains stale historical lifecycle wording; its B-01 technical content agrees with the repository-native Design.
- No implementation, product test, Health, Repository Ready, or VCS handoff work was performed in Archive.

## Final routing

Apply complete → Verify PASS WITH CONDITIONS → Archive complete → Health → Repository Ready. Automated Git Handoff remains separate and was not executed.

## Superseding post-Verify correction notice

The prior Archive/Repository Ready evidence remains historical and is not rewritten. The maintainer-authorized correction Apply is complete; it supersedes the prior terminal routing and requires fresh affected Verify → refreshed Archive → Health → Repository Ready. No implementation or tests were rerun in this artifact-only routing correction.

## Refreshed post-Verify correction record

The maintainer-authorized correction is now verified and archived. `StudentPanel` presents the teacher-facing currency as **Eclipse Points**, including balance and reward costs; backend/domain/database/API/DTO/route/TypeScript `coin` terminology and boundaries were not renamed. `AbortError` from effect cleanup is treated as non-error, stale load errors clear after a successful request, and the genuine HTTP 503 initial-load regression remains visible.

D-06 changed from “no seed expansion required” to a minimal extension of the existing service-owned deterministic seed: two fixed-ID, fixed-source, idempotent, fail-closed `coin_ledger` grants give the seeded first student 2 points. The verified seeded journey proves XP/progression, reward catalogue, inline assessment creation/selection, cost-2 redemption to 0, and reversal/refund to 2 without a manual point grant. No XP-route reconciliation, wallet/shop/dashboard/history mechanic, migration, or new subsystem was added.

The incomplete local SQLite recovery guidance is preserved: do not delete maintainer data without explicit need; for a disposable clean setup recreate the database, then run `pnpm migrate`, `pnpm bootstrap`, and `pnpm seed:demo`.

Current verification: `pnpm test` 90 tests, typecheck, build, full Playwright 26 tests, and `git diff --check` all passed. Verify reports 12/12 criteria, 32/32 scenarios, 13/13 tasks, zero blockers, and zero critical findings. A supplemental focused Playwright run contended with the required full suite and exited before tests; the standalone required suite passed and records this as a non-product execution limitation. C-01 remains production-only. No Git/VCS handoff occurred.
