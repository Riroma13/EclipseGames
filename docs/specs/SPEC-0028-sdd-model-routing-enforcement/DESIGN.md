# SPEC-0028 — SDD Model Routing Enforcement

## Decision and Level

This is **Level C** because it formalizes SDD control-plane architecture and the
protected Git/VCS boundary. The route is therefore Luna Explore → Sol Design →
separate Terra Review → Luna Build → Terra Verify. Terra review is justified and
required, but Terra only reviews the completed Design: it never authors or
rewrites `DESIGN.md`; blockers return to Sol.

The model-routing fix already exists. Build is limited to closing the two proven
governance gaps below; all other routing and lifecycle behaviour is preserved.

## Behaviour and Ownership

Public commands enter the configured real agents; prompts must not simulate a
model with wording such as “Act as Sol/Terra.” Each delegated child is a real
`mode: subagent` with its model pinned in frontmatter.

| Stage | Owning agent | Mode | Model |
|---|---|---|---|
| Explore, classify, coordinate | `sdd-lite-orchestrator` | primary | `openai/gpt-5.6-luna` |
| Design author/refinement | `sdd-lite-design` | subagent | `openai/gpt-5.6-sol` |
| Level C Design review | `sdd-lite-review-terra` | subagent, read-only | `openai/gpt-5.6-terra` |
| Build | `sdd-lite-build` | subagent | `openai/gpt-5.6-luna` |
| Verify Levels A/B | `sdd-lite-verify-luna` | subagent | `openai/gpt-5.6-luna` |
| Verify Level C | `sdd-lite-verify-terra` | subagent | `openai/gpt-5.6-terra` |
| Explicit Ship only | `sdd-lite-ship` | primary | `openai/gpt-5.6-luna` |

`/sdd-start`, `/sdd-resume`, and `/sdd-verify` route through
`sdd-lite-orchestrator`; `/sdd-ship` alone routes to `sdd-lite-ship`. Build and
both Verify agents cannot Ship or perform Git/VCS operations. This is structural,
not prompt-only: every non-Ship child has `permission.task."*": deny`; the
orchestrator has `permission.task."*": deny` plus exactly the five phase-agent
allows in the table, never `sdd-lite-ship`. The orchestrator cannot edit. Terra
Review additionally retains `permission.edit: deny` and can only return findings
to Sol; it never authors or rewrites Design.

## Scope

**In:** preserve and regression-protect routing and permissions in
`.opencode/agents/sdd-lite-{orchestrator,design,review-terra,build,verify-luna,verify-terra,ship}.md`,
`.opencode/commands/sdd-{start,resume,verify,ship}.md`, `opencode.json`,
`scripts/sdd-lite.test.mjs`, the `package.json` `test:sdd-lite` entry, and the
matching authority in `AGENTS.md`, `docs/architecture/sdd-lite.md`, and
`docs/SDD-WORKFLOW.md`.

Build may modify only the five non-Ship child-agent frontmatters
(`design`, `review-terra`, `build`, `verify-luna`, `verify-terra`) to add the
wildcard task denial, and `scripts/sdd-lite.test.mjs` to add the assertions in
this Design. Existing files that already conform—including the orchestrator,
commands, Ship agent, authorities, configuration, and package script—are
evidence to preserve, not authorization to rewrite them.

**Out:** product code; dependencies; schema/data migration; APIs; UI; model
selection redesign; new commands or agents; changes to Ship behaviour; and any
lifecycle state, control-plane machinery, parser markers, traces, fingerprints,
checkpoints, recovery, rebaseline, Apply, Archive, Health, or Repository Ready.

## Data, API, UI, Privacy, and Failure Boundaries

There are no product data, database, API, DTO, or UI effects and no student-data
processing. Existing product privacy boundaries remain unchanged.

Routing fails closed: unavailable, disallowed, or wrongly pinned phase agents do
not fall back to persona simulation or another model. A Design-review blocker
returns to Sol; a verification defect returns to Build. No non-Ship stage may
cross the Git/VCS boundary directly or by task delegation. Only explicit
`/sdd-ship` grants Ship authority.

## Threat Matrix

| Boundary | Applicability and required behaviour | Regression evidence |
|---|---|---|
| Routing/process | Applicable: prompts route work only to real phase children with exact pinned models; the orchestrator has exactly five child allows; every child denies further task delegation. Wrong routing, extra children, Terra editing, fallback, and any non-Ship path to Ship fail closed. | Required RED assertions in `scripts/sdd-lite.test.mjs`: exact orchestrator task map and prompt routes; no `sdd-lite-ship` delegation; child wildcard task denials; Terra `edit: deny`; exact modes/models. |
| Documentation-like paths | N/A: no executable-file classification changes | None |
| Git repository selection | N/A: Ship repository-selection logic is unchanged | Preserve existing Ship-boundary assertions |
| Commit state | N/A: no commit/index behaviour changes | Preserve existing Ship-only capability assertions |
| Push state | N/A: no push/refspec behaviour changes | Preserve existing Ship-only capability assertions |
| PR commands | N/A: no PR composition behaviour changes | Preserve existing Ship-only capability assertions |

## Migration and Rollout

No data migration, feature flag, deployment, or phased rollout is required.
Rollout is the five frontmatter denials plus extension of the existing governance
regression. No runtime lifecycle state is introduced. The permission assertions
must fail before the denials are added and pass afterward.

## Tests and Acceptance

Build/Verify must run `pnpm test:sdd-lite` and preserve all existing assertions.
The suite must explicitly assert:

- command prompts and orchestrator instructions delegate only to
  `sdd-lite-design`, `sdd-lite-review-terra`, `sdd-lite-build`,
  `sdd-lite-verify-luna`, and `sdd-lite-verify-terra` for their named phases;
- the orchestrator task map contains exactly wildcard deny plus those five
  allows, with no extra child and no `sdd-lite-ship` path;
- all five non-Ship children are real pinned-model subagents and have wildcard
  task denial, so they cannot delegate to Ship or any other agent;
- Terra Review has `edit: deny`, remains review-only, and returns blockers to Sol;
- Build and both Verify agents retain direct `git`/`gh` denial, while Ship alone
  retains Git/VCS capability; and
- persona simulation and replacement runtime/lifecycle machinery remain absent.

Acceptance requires:

1. The matrix above matches every cited agent and command.
2. Level C follows Luna Explore → Sol Design → Terra Review → Luna Build → Terra Verify.
3. Terra Review's structural edit denial is proven; Terra never authors or
   rewrites Design.
4. Structural task permissions prove the exact five-child orchestrator boundary
   and that no non-Ship child—including Build or either Verify agent—can delegate
   to `sdd-lite-ship`; direct Build/Verify `git` and `gh` denial also remains.
5. `pnpm test:sdd-lite` passes without weakening or deleting governance assertions.
6. The Build diff is limited to the five child frontmatters and governance test
   authorized above; no product, migration, API, UI, dependency, command/agent
   expansion, authority rewrite, or lifecycle machinery is added.

## Residual Risk

The regression statically validates repository configuration and prompts; it
cannot prove that a future OpenCode runtime/provider honors model selection.
Runtime drift must fail visibly and be corrected in the existing files, not by
adding a second routing system.

## Simplicity Check

This Design keeps the existing agents, commands, and one Node regression suite.
It adds only five declarative task denials and focused assertions for proven
gaps—no new agent, command, dependency, abstraction, persistent state, product
concept, or alternate control plane.
