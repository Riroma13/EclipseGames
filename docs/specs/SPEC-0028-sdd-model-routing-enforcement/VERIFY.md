# SPEC-0028 — Verification Evidence

## Verdict

**PASS WITH CONDITIONS**

The approved control-plane implementation is semantically present and the focused
runtime governance suite passes. The remaining condition is evidentiary: without
Git/VCS history or external execution provenance (both outside this Verify run),
the repository cannot prove the historical identity of the agent that last wrote
`DESIGN.md`. Current structural evidence proves that Terra Review cannot edit it
and that Design ownership is assigned to Sol.

## Scope and Artifact Review

Reviewed the approved Design and completed Tasks, all seven SDD Lite agent files,
all four public command files, `opencode.json`, `package.json`, `AGENTS.md`,
`docs/architecture/sdd-lite.md`, `docs/SDD-WORKFLOW.md`, and
`scripts/sdd-lite.test.mjs`.

Current evidence matches the approved minimal implementation:

- Each of `sdd-lite-design`, `sdd-lite-review-terra`, `sdd-lite-build`,
  `sdd-lite-verify-luna`, and `sdd-lite-verify-terra` is a pinned-model
  `mode: subagent` with `permission.task."*": deny`.
- The read-only Terra Review agent has `permission.edit: deny`; its instructions
  state that only Sol authors Design and that blockers return to Sol.
- The Luna primary orchestrator has `edit: deny`, wildcard task denial, and
  exactly five explicit non-Ship child allows. It has no Ship task path.
- The four public commands route Start, Resume, and Verify through the
  orchestrator and Ship directly to `sdd-lite-ship`; Ship remains the only
  Git/VCS-capable agent.
- Build and both Verify agents retain direct `git *` and `gh *` denial. The
  global config does not override those denials, while Ship retains the listed
  Git and GitHub capability allows.
- The current agent/command inventory is limited to the expected seven agents
  and four commands. The regression also proves the listed Portable/runtime
  replacements are absent.

No product source, API, UI, database/data migration, dependency, public command,
agent expansion, authority-document rewrite, or replacement lifecycle machinery
is evidenced by the reviewed approved-scope files. This conclusion is limited to
current repository content; no Git/VCS diff or history command was run.

## Executed Checks

| Command | Result |
|---|---|
| `pnpm test:sdd-lite` | **PASS** — exit 0; Node TAP reported 10/10 subtests and tests passed, 0 failed, 0 skipped/cancelled/todo; duration 125.641 ms. |

The passing suite exercises public command inventory/routing, exact orchestrator
task map and no-Ship path, child subagent modes and pinned models, all five child
task denials, Terra edit denial, direct Build/Verify Git/gh denials, Ship-only
capability, persona-simulation absence, and Portable/replacement-runtime absence.

No product build, typecheck, API, database, browser, or migration command was
needed: this approved change contains declarative SDD-agent permissions and a
Node documentary governance regression only.

## Acceptance Mapping

| Design acceptance | Evidence | Status |
|---|---|---|
| 1. Cited agent/command matrix matches | Reviewed frontmatters, commands, config, and 10/10 governance suite. | PASS |
| 2. Level C route is Luna Explore → Sol Design → Terra Review → Luna Build → Terra Verify | Orchestrator, workflow authorities, and routing regression name and pin each stage. | PASS |
| 3. Terra Review cannot author/rewrite Design | `sdd-lite-review-terra.md` has `edit: deny`; its contract says never author/rewrite; regression asserts the denial. Historical writer identity is not repository-provable in this run. | PASS WITH CONDITION |
| 4. Exact five-child boundary; no non-Ship child can delegate to Ship; Build/Verify direct Git/gh denial | Exact task-map assertion, five child wildcard-denial loop, no-Ship assertion, and direct-denial assertions passed. | PASS |
| 5. Governance suite passes without weakened/deleted assertions | `pnpm test:sdd-lite` passed 10/10. | PASS |
| 6. Build remains within authorized files and adds no prohibited category | Reviewed current approved-scope artifacts show only the five child denials and governance checks. Historical diff provenance was not inspected because Git/VCS was prohibited. | PASS WITH CONDITION |

## Privacy and Failure Boundaries

This is control-plane-only work: it reads no student data and changes no product
data, API, DTO, UI, authorization, database, migration, or dependency boundary.
Existing student-data and projection safeguards therefore remain unchanged.

The enforced failure model is fail-closed: non-Ship children cannot create child
tasks; the orchestrator cannot delegate to Ship; Build and Verify cannot call
`git` or `gh`; Terra Review cannot edit; and Ship authority is available only
through explicit `/sdd-ship`. Current commands and agent instructions contain no
`Act as Sol/Terra` persona-simulation route and the suite verifies absence of
the retired lifecycle/runtime paths.

## Findings and Residual Risk

No BLOCKER or implementation defect was found.

1. **Condition — historical authorship/diff provenance:** frontmatter permissions
   and the runtime regression prove the current Terra edit prohibition, but they
   cannot prove who historically wrote `DESIGN.md` or provide a file-by-file
   change history. This Verify intentionally did not run Git/VCS commands.
2. **Residual risk — runtime/provider enforcement:** the Node suite statically
   validates repository configuration and prompt contracts; it cannot demonstrate
   that a future OpenCode runtime/provider honors model pinning. Drift must be
   corrected in the existing SDD Lite files, not with a second routing system.

## Baseline Applicability

The applicable Professional Engineering Baseline obligations are authoritative
configuration, failure/authorization boundaries, and reproducible runtime
contract testing; the focused Node suite covers them. Product journeys, UI state,
API/database contracts, persistence, responsive behaviour, and student privacy
DTO testing are not applicable because no product runtime surface changed.
