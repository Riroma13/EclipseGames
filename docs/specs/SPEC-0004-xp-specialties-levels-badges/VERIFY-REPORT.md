---
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:1b82a9514ba144636bb12b1963ce15a07c0bf957c384ca04999a9887c0d55e64
verdict: pass_with_conditions
blockers: 0
critical_findings: 0
requirements: 14/14
scenarios: 0/0
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:1b82a9514ba144636bb12b1963ce15a07c0bf957c384ca04999a9887c0d55e64
build_command: pnpm --recursive build
build_exit_code: 0
build_output_hash: sha256:cdd4d3359b443f188b8ae1bd17effbd205ca7141dc9bb93d6abf71c5f50d0a22
---

# SPEC-0004 Verification Report

**Change:** XP, specialties, annual levels, and badges  
**Mode:** Standard Verify (`strict_tdd` inactive)  
**Verdict:** **PASS WITH CONDITIONS**

All 15 tasks are complete. Current source inspection and required runtime commands confirm all 14 acceptance criteria. Archive may proceed subject to the preserved C-01 and SPEC-0005 conditions.

## Completeness

| Metric | Result |
|---|---:|
| Tasks total / complete / incomplete | 15 / 15 / 0 |
| Acceptance criteria compliant | 14 / 14 |
| Standalone scenarios | 0 / 0 (native workflow uses AC-01–AC-14) |

## Current runtime evidence

| Command | Exit | Result | Output SHA-256 |
|---|---:|---|---|
| `pnpm test` | 0 | 18 files, 62 tests passed | `1b82a9514ba144636bb12b1963ce15a07c0bf957c384ca04999a9887c0d55e64` |
| `pnpm --recursive typecheck` | 0 | API and web typechecks passed | `aac7d3e5bdecf9f8ff8a096196e9f8e4da1079937944a4a85ad445e79be584a4` |
| `pnpm --recursive build` | 0 | API and web builds passed | `cdd4d3359b443f188b8ae1bd17effbd205ca7141dc9bb93d6abf71c5f50d0a22` |
| `pnpm exec playwright test apps/web/e2e/spec-0004-xp.spec.ts` | 0 | 1 passed | `1f8b6f5a45e187f53e20c7ee72129807df8c22cc708596ea3ff2d2116a06da35` |
| `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts --grep "canonical hash route boots|historical-only|actual FastActionShell"` | 0 | 3 passed | `ccff1371aa5cdf1c59eb2d1fe9fc0274c8561d6010551ae99f38ba71cf809762` |

Coverage thresholds are not configured.

## Acceptance-criteria matrix

| AC | Result | Runtime/source evidence |
|---|---|---|
| AC-01 | COMPLIANT | Category/base constraints and descriptions are in domain/contracts; private create is covered by API and browser tests. |
| AC-02 | COMPLIANT | `calculateEventXp` and persisted event snapshots preserve base with a flat 0/1 event-time bonus. |
| AC-03 | COMPLIANT | Active-event annual aggregate, year isolation, thresholds, L8 cap, and historical summary path are implemented and tested. |
| AC-04 | COMPLIANT | Migration enforces `UNIQUE(sequence)` and unique GRANT; repository test passes GRANT → REVOKE → REINSTATE and transition-port replay ordering. |
| AC-05 | COMPLIANT | Active matching event records, not points, drive exactly-three badge activity; domain/repository tests pass. |
| AC-06 | COMPLIANT | Immutable event plus one target-only reversal, archive checks, and transactional re-derivation are implemented and tested. |
| AC-07 | COMPLIANT | API replay/conflict test passes; `StudentPanel` retains the create key across retryable failures and workspace API test verifies key reuse. |
| AC-08 | COMPLIANT | Roster context write guard rejects archived records; historical summary/detail read paths remain authorized. |
| AC-09 | COMPLIANT | XP Fastify test passes 401, 404, 422, 409, replay, and malformed cursor; shared error-boundary test passes safe payload-free 500 behavior. |
| AC-10 | COMPLIANT | `groupSummaryRows` is one roster-left-joined aggregate with zero rows and `alias COLLATE NOCASE, id` order; regression test passes. |
| AC-11 | COMPLIANT | Explicit category/value action, optional note, pending guard, feedback, response reconciliation, key retry, and 10-second undo are implemented; focused browser/workspace tests pass. |
| AC-12 | COMPLIANT | XP routes are authenticated private routes; no XP fields enter projection DTOs/routes and privacy tests pass. |
| AC-13 | COMPLIANT | Current passing suite covers migration, domain, repository, transition, API/privacy, cursor/replay/conflict, workspace retry/state, and browser flow layers required by Design §8. |
| AC-14 | COMPLIANT | Inspected XP/private-workspace implementation adds no coin ledger, behaviour, assessment, projection, history/export, or dependency scope. |

## Design coherence

| Approved decision | Result | Evidence |
|---|---|---|
| Immutable evidence / target-only reversal | Followed | Separate tables and one-reversal target constraint; no mutation route. |
| Event-time flat bonus | Followed | Snapshot fields and `effective_xp = base_xp + specialty_bonus_xp`. |
| Annual active derivation / L8 cap | Followed | Reversal-excluding aggregate and capped progress helpers. |
| Ordered durable transition seam | Followed | Applied unique sequence, unique GRANT, ordered port, and no SPEC-0005 ledger. |
| Bounded private group summary | Followed | Single CTE roster-left-joined aggregate; no per-card summary query. |
| Workspace retry and presentation undo | Followed | Operation key survives retryable failure; success/final 4xx/context change clears it. |

## Findings

### CRITICAL

None.

### WARNING

None.

### Preserved conditions

- **C-01:** Real student data and production use remain blocked until SPEC-0014/0016 retention/deletion, backup-expiry, and encrypted-restic restore proof.
- **SPEC-0005:** That SPEC must transactionally reconcile the ordered XP transition sequence/cursor into its own ledger and prove replay safety before consuming level-up entitlements.

## Final verdict

**PASS WITH CONDITIONS** — all SPEC-0004 acceptance criteria have current passing evidence; the two approved downstream/production conditions remain intact. Archive is the next phase.
