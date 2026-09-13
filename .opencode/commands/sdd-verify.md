---
description: Verify an SDD Lite change against its Design and evidence.
agent: sdd-lite-orchestrator
---

Verify SDD Lite work for `$ARGUMENTS`.

Compare DESIGN.md, TASKS.md, current code, tests, privacy boundaries, and
acceptance criteria. Route by the explicit verification gate, not by level:
default to `sdd-lite-verify-luna`, including Level C. Use the existing
`sdd-lite-verify-terra` agent only when TASKS.md explicitly says
`Critical Terra Verification Gate: REQUIRED` or the maintainer explicitly
requests Terra. Never use Terra merely due to Level C, after every Build, or in
an automatic Terra-Build-Terra loop. Run sufficient checks,
make only bounded Build corrections when the Design already authorizes them,
and create or refresh VERIFY.md with commands, results, findings, and residual
risk. Never perform Git/VCS operations.

Use the exact real verification agent: default `sdd-lite-verify-luna` (Luna), or
the explicitly gated `sdd-lite-verify-terra` (Terra). If the required exact
agent is unavailable, disallowed, or cannot be invoked, stop with `ROUTING ERROR`;
never substitute General, another phase agent, or persona simulation.
A correction returns only to `sdd-lite-build` running Luna.
SDD_CONTRACT:VERIFY_LUNA_DEFAULT
SDD_CONTRACT:VERIFY_TERRA_EXPLICIT_GATE
SDD_CONTRACT:VERIFY_FAIL_CLOSED_ROUTING

Start Verify with the active DESIGN.md, TASKS.md, current VERIFY.md when
present, the TASKS Read Order, and directly named Expected Change Surface and
completed-task evidence. Expand only for an explicit unresolved question and
keep that expansion narrow and targeted. Broad scans are not default; genuine
privacy, data-integrity, security, migration, or integration risk may justify
targeted expansion.
SDD_CONTRACT:VERIFY_BOUNDED_READ_ORDER
SDD_CONTRACT:VERIFY_SCOPE_EXPANSION_GATED
SDD_CONTRACT:VERIFY_PLAYWRIGHT_NONDEFAULT

Circuit-breaker attempts are scoped only to the current bounded agent task and
session. A fresh task starts at zero. Historical failures recorded in
`VERIFY.md` are context only, and only commands actually executed during the
current task count. If the same debugging/testing strategy fails twice in the
current task, stop and return exactly: Task; Repeated strategy; Evidence from
attempt 1; Evidence from attempt 2; Why another repetition is unlikely to add
information; Recommended next narrower investigation. Permit a second
execution only after concrete lower-layer root-cause evidence and a fix. Do not
automatically repeat a third time, escalate models, invoke Terra/Sol, broaden
scope (scope broadening), or repeat Playwright. Do not add runtime counters,
 tracking, or state machinery.
SDD_CONTRACT:CIRCUIT_BREAKER_CURRENT_TASK_ONLY
