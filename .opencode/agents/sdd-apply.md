---
description: Retired Apply compatibility boundary; never execute work.
mode: subagent
model: openai/gpt-5.6-luna
hidden: true
---

# Retired Apply shim

STOP. This legacy agent is intentionally non-executable. It must never select a
SPEC, execute Apply, write lifecycle state, invoke another agent or skill, or
perform Git/VCS handoff. Use `/sdd-direct <SPEC-directory>` and the Portable
Direct agents only.
