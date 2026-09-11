# SPEC-0029 — SDD Explicit Routing Finalization

## Decision and Level

This is **Level C** because it changes the documented SDD control-plane contract.
Terra review is therefore justified and required after Sol completes this Design;
Terra is read-only, never authors or rewrites `DESIGN.md`, and returns blockers to
the exact Sol Design agent.

The existing SPEC-0028 implementation remains the single control plane. This
change only makes its exact routing and fail-closed behaviour explicit and adds
focused regression coverage.

## Behaviour and Ownership

The Luna `sdd-lite-orchestrator` owns coordination and must invoke this route:

| Phase | Exact agent | Model | Rule |
|---|---|---|---|
| Explore | `sdd-lite-explore` | Luna | Read-only evidence and level classification |
| Design | `sdd-lite-design` | Sol | Sole author/refiner of `DESIGN.md` |
| Level C review | `sdd-lite-review-terra` | Terra | Separate, read-only review; blockers return to Sol |
| Build | `sdd-lite-build` | Luna | Implement only the approved Design |
| Verify A/B | `sdd-lite-verify-luna` | Luna | Ordinary verification |
| Verify C | `sdd-lite-verify-terra` | Terra | Level C verification |

Every required phase must use its exact real agent. If that agent is unavailable,
disallowed, or cannot be invoked, orchestration stops with `ROUTING ERROR`.
General, another phase agent, and persona simulation are never substitutes.
`/sdd-start`, `/sdd-resume`, and `/sdd-verify` enter the orchestrator;
`/sdd-ship` remains separate and is not part of this change.

## Scope and Build Authorization

**In scope:** clarify the exact route and fail-closed contract in
`.opencode/commands/sdd-{start,resume,verify}.md`, `docs/SDD-WORKFLOW.md`, and
`docs/architecture/sdd-lite.md`; extend `scripts/sdd-lite.test.mjs` with focused
command-to-phase and routing-failure assertions. Build may edit only those six
existing files and may create this SPEC's `TASKS.md` as its plain plan.

**Preserve unchanged:** all eight `.opencode/agents/*.md`, `opencode.json`,
`package.json`, `/sdd-ship`, existing governance assertions, and SPEC-0028.

**Out of scope:** product code, dependencies, data/schema, API, UI, model changes,
new agents or commands, executable routing machinery, runtime state, parsers,
traces, checkpoints, recovery, rebaseline, Apply, Archive, Health, Repository
Ready, Git/VCS, and Ship. Material scope or architecture changes return to Sol.

## Data, API, UI, Privacy, and Failure Boundaries

There are no product-data, database, API, DTO, UI, authentication, or migration
effects and no student-data processing. Existing privacy boundaries remain
unchanged. Failure is visible and closed: no phase work continues after
`ROUTING ERROR`; Terra cannot edit Design; Build/Verify cannot Ship or use
Git/VCS; only explicit `/sdd-ship` retains that separate authority.

## Threat Matrix

| Boundary | Applicability and safe/failure behaviour | Planned RED regression |
|---|---|---|
| Routing/process | **Applicable.** Exact agents only; missing or failed invocation stops with `ROUTING ERROR`, without substitution or simulation. | Assert command entry agents, exact phase mapping, Level C review/verify, A/B Luna Verify, blocker return to Sol, and fail-closed wording. |
| Documentation-like paths | **N/A:** no executable classification or execution. | None |
| Git repository selection | **N/A:** Ship logic is unchanged. | Preserve existing checks |
| Commit state | **N/A:** no index/commit behaviour. | Preserve existing checks |
| Push state | **N/A:** no push/refspec behaviour. | Preserve existing checks |
| PR commands | **N/A:** no PR composition behaviour. | Preserve existing checks |

## Tests and Acceptance

Build writes the focused regression before clarifying documentation, then runs
`pnpm test:sdd-lite`. Verify must confirm:

1. The exact route above is stated consistently by commands, orchestrator, and
   both authorities; Levels A/B use Luna Verify and Level C uses Terra Verify.
2. Every unavailable or uninvokable exact phase produces `ROUTING ERROR`; no
   General, cross-phase, or persona fallback is permitted.
3. Terra Review remains structurally read-only, never authors/rewrites Design,
   and sends blockers to `sdd-lite-design`.
4. All existing governance tests remain intact and `pnpm test:sdd-lite` passes.
5. The Build changes only the authorized files, adds no second control plane,
   and leaves product/data/API/UI/package/configuration and Ship untouched.

Product unit, API, database, browser, responsive, persistence, and classroom
journey tests are not applicable because no product runtime surface changes.

## Migration, Rollout, and Residual Risk

No migration, feature flag, deployment, or data rollout is required. Land the
documentation clarifications with their regression in one bounded change;
rollback is their direct removal. Static repository checks cannot prove that a
future provider/runtime honors model invocation. Such drift must fail visibly
and be corrected in the existing agents or runtime, never by adding another
routing system.

## Simplicity Check

This reuses the existing agents, commands, authorities, package script, and one
Node governance suite. It adds no dependency, agent, command, state, abstraction,
product concept, or second control plane; only explicit wording and regression
proof for the already implemented route.
