---
description: Start an SDD Lite change from a Design contract.
agent: sdd-lite-orchestrator
---

Start SDD Lite for `$ARGUMENTS`.

Inspect existing work first and keep context bounded to the selected SPEC.
Classify the change as Level A, B, or C. Create or update the selected SPEC's DESIGN.md with behaviour, scope, ownership,
data/API/UI effects, privacy and failure boundaries, tests, acceptance,
rollout, and a Simplicity Check. Explore with Luna, then delegate Design only to
`sdd-lite-design` running Sol when a Design decision is required. For Level C,
run a separate targeted
`sdd-lite-review-terra` review after Sol finishes; Terra must not author or
rewrite DESIGN.md. Never perform Git/VCS operations or Ship. After Design is
sound, continue one implementation slice through `sdd-lite-build` running Luna.

Use the exact real phase agents: Explore `sdd-lite-explore` (Luna), Design
`sdd-lite-design` (Sol), Level C review `sdd-lite-review-terra` (Terra), and
Build `sdd-lite-build` (Luna). If any required exact agent is unavailable,
disallowed, or cannot be invoked, stop with `ROUTING ERROR`; never substitute
General, another phase agent, or persona simulation. Design-review blockers
return to `sdd-lite-design`.

Within one bounded Luna task, if the same debugging/testing strategy fails
twice, stop and return exactly: Task, Repeated strategy, Evidence from attempt
1, Evidence from attempt 2, Why another repetition is unlikely to add
information, Recommended next narrower investigation. A second execution needs
concrete lower-layer root-cause evidence and a fix; never repeat a third time,
escalate models, invoke Terra/Sol, broaden scope, or repeat Playwright.
