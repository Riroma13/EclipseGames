---
description: Verify an SDD Lite change against its Design and evidence.
agent: sdd-lite-verify-luna
---

Verify SDD Lite work for `$ARGUMENTS`.

Compare DESIGN.md, TASKS.md, current code, tests, privacy boundaries, and
acceptance criteria. Run sufficient checks, make only bounded Build corrections
when the Design already authorizes them, and create or refresh VERIFY.md with
commands, results, findings, and residual risk. Use Terra only when the change
is Level C or the evidence reveals a delicate architecture, migration,
privacy/security, or cross-domain concern. Never perform Git/VCS operations.
