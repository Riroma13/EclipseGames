---
description: Start an SDD Lite change from a Design contract.
agent: sdd-lite-orchestrator
---

Start SDD Lite for `$ARGUMENTS`.

Inspect existing work first. Classify the change as Level A, B, or C. Create or
update the selected SPEC's DESIGN.md with behaviour, scope, ownership,
data/API/UI effects, privacy and failure boundaries, tests, acceptance,
rollout, and a Simplicity Check. Explore with Luna, then delegate Design only to
`sdd-lite-design` running Sol. For Level C, run a separate
`sdd-lite-review-terra` review after Sol finishes; Terra must not author or
rewrite DESIGN.md. Never perform Git/VCS operations or Ship. After Design is
sound, continue implementation through `sdd-lite-build` running Luna.
