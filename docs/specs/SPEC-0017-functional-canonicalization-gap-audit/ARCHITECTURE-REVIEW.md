# Architecture Review: SPEC-0017 — Functional Canonicalization and Gap Audit

**Outcome:** **PASS WITH CONDITIONS**
**Lifecycle Checkpoint:** Architecture Review | PASS | Tasks | ARCHITECTURE-REVIEW.md
**Scope:** Current lifecycle review of `DESIGN.md` against the Portable v1 workflow, repository invariants, semantic profile, stable context, and cited implementation evidence. No product implementation, redesign, runtime mutation, or VCS action is authorized by this review.

## Executive Summary

The Design is executable as a documentation-only M0 canonicalization and gap audit. It preserves the approved platform and privacy boundary, explicitly separates established implementation evidence from future product authority, and confines later delivery to dependency-ordered SPECs. No finding risks M0 correctness, privacy, data integrity, security, or its documentary acceptance criteria.

## Evidence Reviewed

| Area | Evidence and result |
|---|---|
| Lifecycle and semantic mapping | `docs/SDD-WORKFLOW.md` defines `Architecture Review -> Tasks`, the canonical artifact, and BLOCKER/CONDITION/NON-BLOCKING semantics; `.opencode/sdd-model-map.json` validates all nine required Design meanings and Architecture Review meanings. |
| Platform and ownership | `apps/api/src/db/schema.ts:16-70`, `apps/api/src/xp/service.ts:15-29`, and DEC-011 substantiate the retained React/Fastify/SQLite, roster, immutable XP, and server-boundary claims. |
| RT and legacy money gaps | `packages/domain/src/foundation.ts:1-22` contains only representative `NOT_EVALUATED`; `apps/api/src/db/schema.ts:63-67` and `apps/api/src/coins/*` substantiate the legacy coin/assessment implementation. |
| Projection boundary | `apps/api/src/game/service.ts:585-598` composes an allowlisted gameplay projection; `apps/api/src/projection/{routes,mapper,repository}.ts` and `apps/api/test/privacy/projection.test.ts:52-86` substantiate the separate fixture-backed projection path and non-expiring `showStudent` query. |
| Operations | `ops/backup/README.md:1-33` requires encrypted-restic verification and states the local drill is insufficient; `KNOWN_ISSUES.md:31-44` preserves C-01. |
| Mechanical validation | `pnpm sdd:validate:design -- --active-only docs/specs/SPEC-0017-functional-canonicalization-gap-audit/DESIGN.md` passed with nine mandatory topics. `pnpm sdd:validate` passed before this review artifact was materialized; afterward it correctly reports a pending runtime identity transition until the parent orchestrator validates and persists this outcome. |

## Architecture Validation

| Review question | Finding |
|---|---|
| Authority reconciliation | Pass. The Design is the highest authority for this active SPEC, explicitly marks prior stable rules for reconciliation, and leaves archived SPECs as evidence rather than rewriting them. |
| Product invariants | Pass. Academic, gamification, behaviour, and narrative remain separate; XP remains evidence; server-side projection allowlists and no-ranking constraints are preserved. |
| Legacy compatibility | Pass. The audit distinguishes retained readable evidence from prohibited future coin writes/conversion, representative RT values, and fixture data. It does not falsely claim future behavior already exists. |
| Module and migration boundaries | Pass. M1–M12 assigns one narrow owner per missing capability, prohibits generic engines and dual writes, and keeps M0 free of schema/API/runtime migration. |
| Privacy and failure boundaries | Pass. It fails closed on ambiguous ownership and sensitive meanings, preserves authoritative projection construction, and requires bounded server-authoritative expiry for future temporary access. |
| Working set and acceptance | Pass. M0 limits product-authority edits to the four stable context documents, excludes implementation/runtime/prior-SPEC changes, and supplies mechanical documentary validation. |
| Simplicity | Pass. No dependency, table, endpoint, configuration surface, or abstraction is introduced; deferred product work remains dependency ordered. |

## Findings

| Class | Finding | Disposition |
|---|---|---|
| CONDITION | C-01 remains an open production privacy/recoverability gate: encrypted-restic backup and restore execution is not demonstrated. | Non-blocking for this documentation-only M0 and later planning; real student data and production use remain blocked until M12 supplies policy and executed evidence. |
| NON-BLOCKING | The standalone full lifecycle validator reports `SPEC-0017-functional-canonicalization-gap-audit: corrupt runtime identity` after this checkpoint artifact was created. | Expected pre-persistence boundary: this executor must not mutate `.sdd-runtime`; the parent orchestrator must validate and persist the returned PASS outcome. |
| NON-BLOCKING | The current projection fixture route exposes `showStudent=true` without an expiry contract. | Correctly recorded as a future M8 replacement requirement; no M0 implementation claim or widening is permitted. |
| NON-BLOCKING | Current `NOT_EVALUATED` and coin implementations conflict with the future canonical RT/gem semantics. | Correctly classified as representative/legacy evidence; M2/M3 must introduce their bounded replacements without reinterpretation, conversion, or dual writes. |

No **BLOCKER** was found. There was no prior `ARCHITECTURE-REVIEW.md` for this active lifecycle, so no historical review text required preservation.

## Required Conditions for Tasks

1. Preserve C-01 verbatim as production-only; do not represent it as satisfied by local restore evidence or M0 validation.
2. Derive tasks only for the four context reconciliations and the specified documentary checks. Do not schedule application, schema, migration, runtime, prior-SPEC, workflow, or adapter changes.
3. Carry the M1–M12 ownership/order and STOP-USING constraints forward as planning boundaries, not as work to implement in this lifecycle.

## Next Recommended

Proceed to **Tasks**. The task plan must remain documentation-only and directly traceable to the approved Design and the conditions above.
