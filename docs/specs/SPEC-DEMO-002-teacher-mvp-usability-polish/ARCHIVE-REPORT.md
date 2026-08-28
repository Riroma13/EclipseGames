# SPEC-DEMO-002 Archive Report

## Final state

**Status:** Refreshed archive complete with non-blocking conditions. Repository-native lifecycle metadata is finalized; no OpenSpec change folder was created or moved because this repository uses `docs/specs/SPEC-XXXX/` artifacts. No unrelated product code/tests were modified, no Apply/Verify/Health was rerun here, and no Git/VCS handoff occurred.

## Verify gate

- Current `VERIFY-REPORT.md`: `verdict: pass`, `PASS WITH CONDITIONS`.
- Current Verify observation **#2175**, `evidence_revision: sha256:ef93503aad2ba5d1e4195c9af287899a88604ddad07dc8c77e292b91ddd43fe2`: requirements 12/12; scenarios 32/32; blockers 0; critical findings 0.
- Prior passing Verify observation **#2180** (5/5 B-01 requirements; 25/25 scenarios) remains historical evidence.
- Required tests, typecheck, build, Playwright, and hygiene checks exited successfully.
- Conditions are non-blocking: C-01 remains production-only; AC-01–AC-17 are a bundled browser objective; Engram Design #2146 has stale lifecycle wording only.
- The prior FAIL and its two test gaps remain preserved as historical evidence. No genuine CRITICAL/BLOCKER or correctness-affecting repository/Engram inconsistency was found.

## Task reconciliation

`TASKS.md` now has all 13 implementation/verification tasks checked, including Verify-only Task 4.3. Verify independently answered all three usability questions YES. `APPLY-PROGRESS.md` preserves Units 1–4 and the test-only remediation evidence and now routes Apply complete → Verify passed → Archive complete.

## Preserved decisions

- **B-01:** active assessment-context uniqueness is scoped by group and normalized name; create/reuse is canonical, races converge, archived names can be replaced, and stable-ID rename collisions are rejected.
- **D-06:** changed after maintainer runtime review: the normal deterministic seed now includes two fixed-ID, fixed-source, idempotent, fail-closed point grants for the first seeded student, yielding 2 points for the canonical journey. This uses the existing coin repository grant only; no automatic XP-route reconciliation or new mechanic was introduced.
- **C-01:** encrypted-restic/recoverability remains a production-only gate; KI-009 was not removed.
- The previous failed Verify remains unedited as history; the current passing rerun is the authoritative report.

## Evidence and Engram traceability

Repository artifacts read and finalized:

- `docs/SDD-WORKFLOW.md`
- `docs/specs/SPEC-DEMO-002-teacher-mvp-usability-polish/DESIGN.md`
- `docs/specs/SPEC-DEMO-002-teacher-mvp-usability-polish/TASKS.md`
- `docs/specs/SPEC-DEMO-002-teacher-mvp-usability-polish/APPLY-PROGRESS.md`
- `docs/specs/SPEC-DEMO-002-teacher-mvp-usability-polish/VERIFY-REPORT.md`
- `docs/specs/SPEC-DEMO-002-teacher-mvp-usability-polish/APPLY-SUMMARY.md`
- `.ai/context/SESSION.md`, `.ai/context/ROADMAP.md`, `.ai/context/DECISIONS.md`

Matching Engram observations retrieved for traceability:

| ID | Topic / evidence |
|---:|---|
| #2146 | Design artifact; stale lifecycle wording only |
| #2162 | Tasks artifact |
| #2164 | Apply Progress artifact |
| #2165 | Unit 1 Apply contract validation |
| #2167 | Unit 2 Apply contract validation |
| #2169 | Unit 3 Apply contract validation |
| #2170 | Unit 3 validation session evidence |
| #2172 | Corrective Apply re-gate |
| #2173 | Apply gate recovery |
| #2175 | Passing Verify report mirror |
| #2177 | Verify-remediation Apply continuation |
| #2178 | Verify-remediation Apply gate validation |
| #2180 | Fresh independent Verify PASS WITH CONDITIONS |
| #2183 | Prior Health PASS WITH CONDITIONS; preserved for upcoming Health refresh |

## Persistence

This report is the repository-native audit record and is also upserted to Engram topic `sdd/spec-demo-002-teacher-mvp-usability-polish/archive-report`.

## Next step and explicit handoff boundary

Next recommended phase: **Health**. Repository Ready follows Health if its gate passes; Repository Ready is pending refresh. No Git command, commit, branch operation, push, pull request, CI handoff, merge, release, tag, or other VCS action was performed or authorized in this phase.

## Superseding post-Verify correction notice

The prior Archive/Repository Ready evidence remains historical and is not rewritten. A maintainer-authorized correction Apply is complete and supersedes the prior terminal routing; fresh affected Verify is required, followed by refreshed Archive → Health → Repository Ready. No implementation or tests were rerun in this artifact-only routing correction.

## Refreshed post-Verify correction

- **Presentation:** `StudentPanel` now presents **Eclipse Points** for the balance and reward costs. Backend/domain/database/API/DTO/route/TypeScript `coin` terminology and privacy boundaries remain unchanged.
- **Failure semantics:** AbortError from effect cleanup is ignored as cancellation and a later successful request clears stale load errors. A genuine HTTP 503 coin-rewards failure remains visibly reported; the current Verify records the full Playwright regression.
- **D-06 journey:** The fixed seed extension gives the first seeded student 2 points. The required standalone Playwright suite proves XP/progression, reward catalogue, inline assessment creation/selection, cost-2 redemption to 0, and reversal/refund to 2 without manual point grant. Fixed identities/source allow-list, transactional preflight, and replay idempotency are preserved.
- **Local recovery:** An incomplete local database cannot be repaired by `pnpm migrate` alone when migration 0005 is already recorded. For a disposable clean setup, recreate the database and run `pnpm migrate`, `pnpm bootstrap`, and `pnpm seed:demo`; do not delete maintainer data without explicit need.
- **Current evidence:** `pnpm test` (90), typecheck, build, full Playwright (26), and `git diff --check` passed. A supplemental focused Playwright invocation contended with the full suite and exited before tests; the standalone required suite passed, so this is a non-product execution limitation.
- **Conditions:** C-01 remains production-only; AC-01–AC-17 remain a bundled browser objective; Engram Design #2146 has stale historical lifecycle wording only. No critical findings or blockers remain.
