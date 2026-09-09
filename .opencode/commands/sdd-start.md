---
description: Start an SDD Lite change from a Design contract.
agent: sdd-lite-design
---

Start SDD Lite for `$ARGUMENTS`.

Inspect existing work first. Classify the change as Level A, B, or C. Create or
update the selected SPEC's DESIGN.md with behaviour, scope, ownership,
data/API/UI effects, privacy and failure boundaries, tests, acceptance,
rollout, and a Simplicity Check. For Level C, request Terra review when the
Design identifies architecture, migration, privacy/security, or significant
cross-domain risk. Never perform Git/VCS operations or Ship. After Design is
sound, continue implementation through the normal Build agent.
