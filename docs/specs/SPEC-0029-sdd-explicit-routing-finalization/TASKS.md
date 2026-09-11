# SPEC-0029 — Implementation Plan

## Scope self-check

- Modify only `.opencode/commands/sdd-{start,resume,verify}.md`,
  `docs/SDD-WORKFLOW.md`, `docs/architecture/sdd-lite.md`, and the existing
  `scripts/sdd-lite.test.mjs` regression.
- Create no agents or commands and do not modify agent frontmatter,
  `opencode.json`, `package.json`, SPEC-0028, product code, dependencies,
  data/schema, API/UI, Ship, or lifecycle machinery.
- Preserve the existing SPEC-0028 routing implementation and all governance
  assertions.

## Tasks

- [x] Add RED assertions for command entry, exact phase mapping, Level C review
  and verification, A/B verification, blocker return to Sol, and fail-closed
  `ROUTING ERROR` behavior.
- [x] Clarify the exact non-Ship route and fail-closed contract in the three
  authorized command documents and both SDD Lite authorities.
- [x] Run `pnpm test:sdd-lite`, fix only bounded defects in authorized files,
  and record the evidence below.

## Evidence

- Focused test: `pnpm test:sdd-lite` — passed, 11/11 subtests, 11/11 tests,
  0 failures.
- Bounded defects: adjusted only the new static assertions for Markdown line
  wrapping and preserved the existing SPEC-0018 governance assertion; no
  production or agent behavior changed.
- Residual risk: static documentation/regression checks cannot prove that a
  future runtime/provider honors model invocation; runtime drift must fail
  visibly without introducing a second routing system.
