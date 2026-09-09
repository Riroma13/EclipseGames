# Verify: SPEC-0017 Functional Canonicalization and Gap Audit

**Status:** PASS WITH CONDITION
**Workflow:** SDD Lite `DESIGN -> BUILD -> VERIFY`

## Scope

The M0 change reconciles the four approved `.ai/context` authority documents
with the canonical register in `DESIGN.md`. It is documentation-only and does
not implement later M1-M12 product behaviour.

## Evidence

- `DESIGN.md`, `TASKS.md`, and historical `ARCHITECTURE-REVIEW.md` remain
  preserved.
- `.ai/context/PROJECT.md`, `DECISIONS.md`, `ROADMAP.md`, and
  `KNOWN_ISSUES.md` contain the approved canonical register, stale markers,
  dependency order, and C-01 condition.
- `TASKS.md` records all approved M0 work complete.
- Portable runtime state, traces, Apply checkpoints, and obsolete review
  artifacts were removed during the SDD Lite cutover.

## Acceptance

- Canonical XP, RT/ABSENT, Energy, gems, lives/session, rubric, projection,
  avatar, narrative, and privacy boundaries are represented consistently.
- The M1-M12 future order remains planning-only.
- No application code, schema, migration, prior SPEC, or product behaviour was
  changed by this M0 audit.
- SDD Lite commands and agents define only `DESIGN -> BUILD -> VERIFY -> SHIP`.

## Commands

- `pnpm test:sdd-lite` — PASS (after correcting the smoke assertions)
- `pnpm test` — PASS
- `pnpm typecheck` — PASS
- `pnpm build` — PASS
- `git diff --check` — PASS

## Residual Risk

C-01 remains an open production privacy/recoverability gate: encrypted-restic
backup and restore execution is not demonstrated. Real student data and
production use remain blocked until the approved production-hardening work
supplies policy and executed evidence.
