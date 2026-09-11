# SPEC-0029 — Verification Evidence

## Verdict

**PASS WITH CONDITIONS**

The completed Level C work conforms to the approved routing contract. A
pre-Ship re-review of the current intended worktree, agent, command, authority,
and governance-test evidence proves the exact non-Ship route and the documented
fail-closed boundary. No product runtime, data, API, UI, dependency, Ship, or
lifecycle expansion is present in the reviewed implementation surface.

The conditions are evidentiary, not implementation defects: this static suite
cannot invoke unavailable/disallowed agents to demonstrate a runtime failure, and
Git/VCS was intentionally not used, so historical authorship and diff provenance
cannot be established in this Verify run.

## Reviewed Evidence and Scope

Re-reviewed `DESIGN.md`, completed `TASKS.md`, the complete current intended
worktree within the approved scope (including `sdd-lite-explore.md` and the
orchestrator routing update), all eight current SDD Lite agents, four public
commands, both SDD authorities, `opencode.json`, `package.json`,
`scripts/sdd-lite.test.mjs`, and SPEC-0028 Design/Tasks/Verify evidence.

Current repository evidence shows:

- The exact Level C sequence is Luna Explore (`sdd-lite-explore`) -> Sol Design
  (`sdd-lite-design`) -> Terra Review (`sdd-lite-review-terra`) -> Luna Build
  (`sdd-lite-build`) -> Terra Verify (`sdd-lite-verify-terra`).
- Levels A/B use `sdd-lite-verify-luna` running Luna.
- The orchestrator allows only the six non-Ship phase agents, each phase agent is
  pinned to its named model, and every required unavailable/disallowed/uninvokable
  agent stops with `ROUTING ERROR`. General, cross-phase, and persona-simulation
  substitution are expressly prohibited.
- Terra Review is a Terra subagent with `permission.edit: deny`; its contract
  permits review only, says it never authors or rewrites `DESIGN.md`, and returns
  blockers to `sdd-lite-design` running Sol.
- The four-command and eight-agent inventory is unchanged in shape. The existing
  Ship-only Git/VCS boundary, SPEC-0028 structural safeguards, public command
  inventory, and absence of replacement lifecycle machinery remain covered by
  the governance suite.

No product source, student data, schema/migration, API/DTO, UI, dependency,
configuration, public command/agent expansion, Ship behavior, or additional
lifecycle/control-plane mechanism was found in this approved-scope review. This
is a current-content conclusion; no Git/VCS diff or history command was run.

## Executed Check

| Exact command | Result |
|---|---|
| `pnpm test:sdd-lite` | **PASS** — exit 0; Node TAP: 11 subtests/tests passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; duration 134.139 ms. |

The passing runtime governance suite checks command inventory and routing;
orchestrator task allowlist/no Ship path; pinned real subagents; child task
denials; Terra Review edit denial; exact documentation routing and `ROUTING
ERROR` wording; absence of persona simulation; Ship-only Git/VCS capability; and
the preserved Portable/lifecycle absence and SPEC-0017 assertions.

No product build, typecheck, API/database, browser, responsive, persistence, or
classroom-journey check was run: the approved Design limits this change to SDD
documentation and a Node governance regression, with no product runtime surface.

## Acceptance Mapping

| Design acceptance | Evidence | Status |
|---|---|---|
| 1. Exact route is consistent; A/B use Luna Verify and C uses Terra Verify | Commands, both authorities, orchestrator instructions, pinned frontmatters, and passing routing assertions. | PASS |
| 2. Unavailable/disallowed/uninvokable exact agents fail closed with `ROUTING ERROR`; no fallback | All three non-Ship commands and both authorities state the exact condition and forbid General/cross-phase/persona substitution; passing test asserts this wording. Runtime agent-unavailability injection is outside this static repository suite. | PASS WITH CONDITION |
| 3. Terra Review is read-only, never authors/rewrites Design, blockers return to Sol | `sdd-lite-review-terra.md` has `edit: deny` and explicit review-only/blocker-return contract; suite asserts the denial and wording. | PASS |
| 4. Existing governance tests are retained and focused suite passes | `pnpm test:sdd-lite` passed 11/11, including the prior SPEC-0028 structural-boundary assertions. | PASS |
| 5. Build stays authorized; no product/data/API/UI/package/config/Ship/lifecycle expansion | Reviewed permitted docs, authorities, test, inventories, package/config, and preserved SPEC-0028 evidence show no prohibited new mechanism or runtime surface. Historical diff provenance was not inspected. | PASS WITH CONDITION |

## Privacy, Failure, and Baseline Boundaries

This control-plane-only change processes no student data and changes no product
privacy, authentication, data, migration, API, DTO, or UI boundary. Existing
server-side projection and student-data safeguards are unchanged.

Failure is intentionally closed: required phases stop with `ROUTING ERROR`; no
General, cross-phase, or persona fallback is permitted; non-Ship children deny
task delegation; the orchestrator has no Ship task path; Terra Review cannot
edit; and Build/Verify retain direct `git`/`gh` denial. Only explicit
`/sdd-ship` retains Ship authority.

Applicable Professional Engineering Baseline obligations are authoritative
configuration, intentional failure/authorization boundaries, one coherent SDD
control plane, and reproducible runtime contract testing. The Node governance
suite provides the applicable runtime proof. Loading/error/retry/edit/finalized
UI states, product end-user journeys, API/database contracts, persistence,
responsive behavior, and classroom interactions are not applicable because no
product runtime behavior changed.

## Findings and Residual Risk

No BLOCKER or implementation defect found.

1. **Condition — runtime/provider enforcement:** repository tests prove the
   declarative routing contract and fail-closed wording, but cannot simulate an
   unavailable provider or prove a future runtime honors model pinning. Any drift
   must fail visibly and be corrected in the existing control plane, not by a
   fallback or second routing system.
2. **Condition — historical provenance:** Git/VCS was prohibited and not run;
   therefore this verification cannot prove historical writer identity for
   `DESIGN.md` or a file-by-file historical diff. Current structural evidence
   proves Terra Review is now read-only and Sol owns Design authorship.
