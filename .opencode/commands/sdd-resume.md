---
description: Resume incomplete SDD Lite work from repository evidence.
agent: sdd-lite-orchestrator
---

Resume SDD Lite work for `$ARGUMENTS` using this deterministic state machine.

SDD_CONTRACT:RESUME_MISSING_TASKS_LUNA_PLANNING_ONLY
SDD_CONTRACT:RESUME_IMPLEMENT_ONE_SLICE_ONLY
SDD_CONTRACT:RESUME_NO_DESIGN_REENTRY

Select one evident SPEC from repository evidence without runtime state, traces,
fingerprints, checkpoints, or lifecycle markers. Never guess between ambiguous
SPECs, invoke Ship, or perform Git/VCS actions.

CASE A — DESIGN.md is missing:
- STOP and instruct the maintainer to use `/sdd-start`.
- Do not invoke `sdd-lite-design`, Sol, or any replacement.

CASE B — DESIGN.md exists and TASKS.md is missing:
- Invoke exactly one `sdd-lite-build` running Luna with the explicit
  `SDD_CONTRACT:LUNA_PLANNING_ONLY` contract.
- The child may read DESIGN.md and narrowly inspect evidence needed to create
  TASKS.md with Expected Change Surface, Read Order, bounded task slices, and
  Critical Terra Verification Gate.
- It must not edit DESIGN.md, implement a slice, invoke another child, invoke
  Sol or Terra, run broad verification, or use Git/VCS.
- After TASKS.md exists, return exactly `TASKS READY` and STOP. Do not continue
  into implementation.

CASE C — DESIGN.md and TASKS.md exist with incomplete work:
- Invoke exactly one `sdd-lite-build` running Luna for only the first incomplete
  bounded task slice, then STOP.
- Do not automatically execute the next slice.

CASE D — all TASKS.md work is complete:
- STOP and direct the maintainer to `/sdd-verify`.
- Never re-enter Design.

Resume Build only through the exact real agent `sdd-lite-build` running Luna. Do
not automatically invoke Sol or Terra unless the selected Design explicitly
requires that gate. If the
required exact agent is unavailable, disallowed, or cannot be invoked, stop
with `ROUTING ERROR`; never substitute General, another phase agent, or persona
simulation. Any required return to Design uses only `sdd-lite-design` running
Sol, and a Level C review uses only `sdd-lite-review-terra` running Terra.

Within one bounded Luna task, after the same debugging/testing strategy fails
twice, stop and return exactly: Task, Repeated strategy, Evidence from attempt
1, Evidence from attempt 2, Why another repetition is unlikely to add
information, Recommended next narrower investigation. Permit a second
execution only after concrete lower-layer root-cause evidence and a fix. Never
automatically repeat a third time, escalate models, invoke Terra/Sol, broaden
scope, or repeat Playwright.
