# SESSION.md — Protocole Éclipse

**CURRENT SDD state:** SPEC-0017 M0 is complete under SDD Lite and SPEC-0018
has shipped. The only workflow is DESIGN -> BUILD -> VERIFY -> SHIP. The
remaining unstaged work is isolated SDD Lite maintenance; no product SPEC is
active.

**Cutover:** Portable Apply, Apply Summary, runtime state, traces, checkpoints,
and related recovery machinery were removed. SDD Lite uses only DESIGN.md,
TASKS.md, VERIFY.md, and repository evidence until explicit `/sdd-ship`.
**SPEC status:** SPEC-0001, SPEC-0002, SPEC-0003, SPEC-0004, SPEC-0005, and SPEC-DEMO-001 are archived. SPEC-DEMO-001 preserves their canonical roster ownership/archive semantics, private `/#/workspace` fast-action shell, and real XP contracts.
**SPEC-0004 settled design:** Immutable XP evidence plus target-only compensating reversals; event-time specialty snapshot and flat +1 bonus; active-event annual derivation; one L2–L8 durable unlock with append-only GRANT/REVOKE/REINSTATE reconciliation transitions for SPEC-0005; exactly-three qualifying event-record badges with coherent current state; teacher-private API/detail and idempotent current-summary replays; a bounded zero-row roster-ordered group summary distinct from `TeacherStudentDto` and fixture DTOs; one explicit workspace XP action provider with base/bonus/effective feedback and the existing 10-second presentation undo. XP will use only an exported roster context adapter over `ownedStudentContext` and existing `lockStudentGroupCorrection`; roster ownership, specialty and archive semantics remain SPEC-0002-owned. No projection contract, client privacy filter, generic event bus, or coin ledger is introduced.
**Production condition:** C-01 remains production-only because encrypted restic execution was not demonstrated. Real student data and production use remain blocked until SPEC-0014/0016 retention/deletion, backup-expiry, and encrypted-restic restore conditions are complete.
**Conditions preserved:** C-01 remains a production-only privacy/recoverability gate. SPEC-0005 must transactionally reconcile ordered immutable level transitions and prove replay safety before consuming level-up coin entitlements; the refined Design has no durable cursor/completion marker, relying on full atomic replay plus unique source identity.
**Health result:** SPEC-DEMO-003 Health: PASS WITH CONDITIONS; fresh unit/typecheck/build/focused privacy, seed, Projection, and relevant journey checks passed. Full Playwright showed shared-fixture/order-sensitive failures in affected coin-loading tests, which pass in isolation; no active application defect or CRITICAL/BLOCKER was proven. C-01 remains a production-only privacy/recoverability gate.
**Repository Ready:** YES for SPEC-DEMO-001, SPEC-0005, and SPEC-DEMO-003. SPEC-DEMO-003 Health remains `PASS WITH CONDITIONS`; its Repository Ready gate is complete with the shared-fixture warning and C-01 preserved. No VCS handoff was executed in this run.
**Exact next step:** `STOP — maintainer review before explicit /sdd-ship` for
the isolated SDD Lite maintenance change. Preserve C-01 as production-only.
