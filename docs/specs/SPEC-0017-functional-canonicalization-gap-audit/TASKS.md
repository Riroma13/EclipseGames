# Tasks: SPEC-0017 Functional Canonicalization and Gap Audit

**Status:** Complete under SDD Lite; documentation-only M0

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 180–260 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Reconcile four stable context documents and prove documentary scope | PR 1 | `pnpm sdd:validate:design -- --active-only docs/specs/SPEC-0017-functional-canonicalization-gap-audit/DESIGN.md` and `pnpm sdd:validate` | N/A — documentation-only M0; no application runtime | Restore `.ai/context/PROJECT.md`, `DECISIONS.md`, `ROADMAP.md`, and `KNOWN_ISSUES.md` |

## Phase 1: Context Reconciliation

- [x] 1.1 Update `.ai/context/PROJECT.md` with the canonical register and explicit `SUPERSEDED` markers for mutable Energy, `NOT_EVALUATED`, coins, old behaviour/session, projection coin fields, and unresolved avatar rules.
- [x] 1.2 Mark DEC-003 superseded and append one current canonicalization decision to `.ai/context/DECISIONS.md`, covering `ABSENT`, derived Energy, gems, and real-session semantics; preserve DEC-001/2/4–6/11/12.
- [x] 1.3 Preserve archived history in `.ai/context/ROADMAP.md` and replace only the current future plan with the dependency-ordered M1–M12 ownership boundaries.
- [x] 1.4 Update `.ai/context/KNOWN_ISSUES.md`: resolve KI-003, KI-004, KI-006, KI-007; narrow KI-005 to rollover/retention; retain KI-002, KI-009, and C-01.

## Phase 2: Documentary Verification

- [x] 2.1 Verify the canonical register, stale markers, complete gap classifications, compatibility boundaries, and M1–M12 order against `DESIGN.md`.
- [x] 2.2 Verify the bounded file allowlist: no application code, schema, migrations, prior SPECs, runtime state, workflow/adapter files, or `SESSION.md` changes; record no implementation claims.
- [x] 2.3 Run documentary validation through SDD Lite verification and preserve verbatim: “C-01 remains an open production privacy/recoverability gate: encrypted-restic backup and restore execution is not demonstrated.”

## Planning Boundaries (not M0 work)

Carry forward, without scheduling implementation: M1 calendar/terms/sessions → M2 RT/ABSENT/Energy/streak → M3 gems/advantages/rewards → M4 behaviour → M5 rubric → M6 close/XLSX → M7 Avatar Core/access → M8 projection/Show Student → M9 boutique → M10 history → M11 narrative integration → M12 production hardening/privacy. Preserve STOP-USING, no-conversion, no-dual-write, privacy, and C-01 constraints for those later SPECs.
