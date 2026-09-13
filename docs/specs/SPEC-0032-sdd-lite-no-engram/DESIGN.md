# SPEC-0032 — SDD Lite without Engram

## Decision

Make repository-local SDD Lite policy explicit that durable working memory is
the selected SPEC artifacts and repository evidence, not automatic Engram use
or broad historical-context loading. This is a small control-plane/documentary
change; it does not claim the global plugin is disabled.

## Scope and acceptance

- Update project `AGENTS.md` with the Engram boundary and targeted context rule.
- Extend `scripts/sdd-lite.test.mjs` with static/config assertions for those
  rules, command/agent independence from Engram, and absence of runtime
  memory/state machinery.
- Create the SPEC-0032 `DESIGN.md`, `TASKS.md`, and `VERIFY.md` evidence.
- Runtime acceptance is satisfied by fresh OpenCode behavioral validation with
  zero `engram_mem_*` calls and zero automatic reads of the five context files.

## Expected Change Surface

`AGENTS.md`, `scripts/sdd-lite.test.mjs`, and SPEC-0032 artifacts only if
needed. No product code, SPEC-0030, global OpenCode files, or runtime subsystem
is in scope.

Reduction is free when it removes unnecessary context or integration surface.
Expansion is gated: any additional file, runtime behavior, or architectural
decision must return to Design.

## Verification gate

**Critical Terra Verification Gate: NOT REQUIRED.** Focused governance/config
validation is sufficient for this bounded Luna slice. Playwright and product
tests are not applicable.
