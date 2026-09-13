# SPEC-0031 — SDD Lite Efficiency and Autonomy

## Decision

Maintain the existing `DESIGN -> BUILD -> VERIFY -> SHIP` workflow while making
non-Ship work more focused and autonomous. This is **Level C** because it changes
workflow architecture, model routing, and permission boundaries. A separate
Terra review is justified after Sol completes this Design; Terra remains
read-only and any blocker returns to Sol.

## Authority and Behaviour

- The maintainer request and approved `DESIGN.md` own product behaviour, scope,
  architecture, privacy, migration, rollout, and acceptance.
- `AGENTS.md` remains the sole owner of the Professional Engineering Baseline;
  the two SDD guides remain workflow authorities.
- Luna owns implementation shape inside those boundaries: file decomposition,
  naming, local refactors, test placement, and execution order do not require
  approval when they preserve this contract.
- `TASKS.md` is an editable plan, not authority or lifecycle state. Each task's
  **Expected Change Surface** is a review forecast, not an allowlist. Luna may
  add a necessary file, update the surface, and record why. A change to a
  Design-owned boundary must return to Sol instead.

## Canonical Flow and Ownership

| Entry | Required route and result |
|---|---|
| Start | Luna Explore -> Sol Design -> Terra Review for Level C -> Luna Build |
| Resume | Infer one evident incomplete SPEC from artifacts and repository evidence, then continue its required phase; never revive completed work or guess ambiguity |
| Verify | Luna for A/B; Terra directly for C; produce `VERIFY.md` and return bounded defects to Luna Build |
| Ship | Only explicit `/sdd-ship`; preserve the existing Ship-only Git/VCS boundary |

Every phase must invoke its exact configured agent. Unavailable or disallowed
routing fails closed with `ROUTING ERROR`; General, persona simulation, and
fallback agents are forbidden. Explore gathers a concise evidence packet; Sol
authors Design; Terra reviews but never rewrites it; Luna builds; Luna/Terra
verify by level. All subagents deny child tasks, preventing nested delegation.

Agents read `AGENTS.md`, the active SPEC artifacts, and only files relevant to
the current decision or task. They must not preload unrelated SPECs, broad
project history, or Engram. Repository files are the complete durable context.

## Bounded Autonomy and Circuit Breakers

Build proceeds in cohesive task slices, updating `TASKS.md` and running the
cheapest relevant check after each slice. Verify may request corrections already
authorized by Design; the correction returns to Build and then to the original
verifier. Stop after two unsuccessful correction cycles for the same essential
failure and record the blocker. Stop immediately for contradictory authority,
unsafe migration, meaningful privacy/security exposure, major scope or
architecture expansion, ambiguous SPEC selection, or unsafe Ship state. Do not
stop for naming, formatting, task drift, or a necessary in-scope file.

## Effects and Expected Change Surface

This maintenance may refine `AGENTS.md`, both SDD guides, the four public command
files, `sdd-lite-*` agents, `opencode.json`, `scripts/sdd-lite.test.mjs`, and the
`test:sdd-lite` package script. No product UI, API, database, domain behaviour,
student data, migration, or Playwright fixture changes are authorized.

Global Bash remains `ask`, with existing publish/deploy denials. Non-Ship agents
retain explicit `git *` and `gh *` denials; Ship retains only its narrow existing
Git/GitHub allowlist. No command may widen Ship authorization or interpolate
untrusted text into executable shell composition.

## Failure, Privacy, and Threat Boundaries

No educational data is read or emitted. Errors return concise phase, evidence,
and next-action information without secrets or unrelated repository content.

| Boundary | Applicability | Safe/failure contract and RED coverage |
|---|---|---|
| Documentation-like paths | Applicable | Treat names and Markdown as data; crafted executable-looking docs never run |
| Git repository selection | N/A | Ship repository selection is unchanged |
| Commit state | N/A | Commit/index semantics are unchanged |
| Push state | N/A | Push semantics are unchanged |
| PR commands | N/A | PR composition is unchanged |

## Tests and Acceptance

Extend the Node smoke suite before changing contracts. It must prove exact
routing, targeted context/no Engram, authority separation, Expected Change
Surface flexibility, two-cycle correction limit, stop conditions, child-task
denials, global Bash `ask`, non-Ship Git/GitHub denial, unchanged Ship-only
capability, and absence of runtime machinery. Run `pnpm test:sdd-lite` and the
repository CI-equivalent checks affected by implementation.

Manual acceptance reads each command as an end-to-end Start, Resume, Verify, and
Ship journey and confirms no hidden state or accidental fallback. Playwright is
not applicable because this change has no runtime UI; future product Designs
must still require it for applicable teacher/Classroom journeys. Roll out as one
document-and-configuration update with no migration or feature flag; revert the
maintenance files together if smoke or CI fails.

## Non-goals and Simplicity Check

No new command, phase, agent, runtime state, parser gate, checkpoint, recovery,
Engram dependency, product change, CI platform, or Ship capability is added.
The smallest solution is clearer prompts, bounded task semantics, existing
permissions, and expanded smoke assertions. A scheduler, workflow engine, or
new persistence layer would duplicate repository evidence and is rejected.
