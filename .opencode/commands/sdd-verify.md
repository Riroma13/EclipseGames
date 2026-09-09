---
description: Verify an SDD Lite change against its Design and evidence.
agent: sdd-lite-orchestrator
---

Verify SDD Lite work for `$ARGUMENTS`.

Compare DESIGN.md, TASKS.md, current code, tests, privacy boundaries, and
acceptance criteria. Resolve the change level from DESIGN.md before delegating:
Levels A/B go directly to `sdd-lite-verify-luna`; Level C goes directly to the
existing `sdd-lite-verify-terra` agent. SPEC-0018 is Level C and must use Terra
without first invoking Luna or any legacy orchestration layer. Run sufficient checks,
make only bounded Build corrections when the Design already authorizes them,
and create or refresh VERIFY.md with commands, results, findings, and residual
risk. Never perform Git/VCS operations.
