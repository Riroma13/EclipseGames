# SPEC-0023 — Professional Engineering Baseline Tasks

Plain implementation plan and evidence for the approved `DESIGN.md`. This
artifact is not lifecycle state and does not create a new phase or gate.

## Plan

- [x] Add the concise, named Professional Engineering Baseline to root
  `AGENTS.md`, preserving existing product, privacy, SDD, and Ship rules.
- [x] Add short canonical-ownership and Design/Build/Verify applicability
  references to `docs/architecture/sdd-lite.md` and `docs/SDD-WORKFLOW.md`.
- [x] Extend `scripts/sdd-lite.test.mjs` with one bounded static assertion for
  baseline ownership and both cross-references.
- [x] Run the focused governance test and inspect the resulting scope for
  unintended duplication or runtime impact.

## Evidence

| Check | Result |
|---|---|
| Focused governance test | `pnpm test:sdd-lite` — initial runs exposed formatting-sensitive assertions for wrapped references; corrected to allow document line wrapping and emphasis, then final rerun passed 9/9 |
| Relevant full checks | Not run — documentation/static-test-only change; focused suite covers the affected contract |
| Scope inspection | Passed — only the approved governance documents, static test, and this plan/evidence artifact are changed |
| Runtime/application impact | None by Design; no application code, product invariant, routing, permission, or workflow machinery changed |
| Terra routing | Not invoked; no Level C issue discovered |

## Residual risk

The baseline is protected by a bounded static ownership/reference assertion,
but semantic quality and applicability decisions remain subject to human Design
and Verify review. Formal verification is recorded in `VERIFY.md`.
