# SPEC-0028 — Implementation Plan

## Scope self-check

- Modify only the five non-Ship child-agent frontmatters authorized by
  DESIGN.md and the existing `scripts/sdd-lite.test.mjs` governance regression.
- Add no product code, commands, orchestrator, Ship agent, configuration,
  authorities, package scripts, lifecycle machinery, or `VERIFY.md`.
- Preserve all existing assertions and the current routing/Git boundary.

## Tasks

- [x] Add `permission.task."*": deny` to the five non-Ship child frontmatters.
- [x] Extend the governance regression with Terra edit denial, the exact
  orchestrator task allowlist/no Ship path, and all five child wildcard task
  denial assertions.
- [x] Run `pnpm test:sdd-lite`, fix only bounded defects authorized by Design,
  and record the result below.

## Evidence

- Focused test: `pnpm test:sdd-lite` — passed, 10/10 subtests, 10/10 tests,
  0 failures.
- Bounded defects fixed during the focused run: normalized frontmatter
  indentation in the exact task-map assertion and loaded the Terra Review
  fixture in the test scope; no production or governance behavior was changed.
- Residual issue: verification evidence belongs to the separate Terra stage;
  no `VERIFY.md` is created in Build.
