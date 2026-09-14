# SPEC-0030 — M4 Alerts, Lives, Red Code, and Behavioural Restrictions

## Design

**Level C — Sol Design → Terra re-review → Luna Build → Terra Verify.** Cross-domain atomicity justifies re-review. SPEC-0018 owns sessions, SPEC-0019 RT entitlements, SPEC-0027 Gems; M4 owns behaviour.

## Behaviour and scope

| Lives | State | Bonus | Receive Gem | Spend Gem | Special activity |
|---:|---|---|---|---|---|
| 4 | `NORMAL` | yes | yes | yes | yes |
| 3 | `VIGILANCE` | yes | no | yes | yes |
| 2 | `ALERT` | zero | no | no | yes |
| 1/0 | `RED_CODE` | zero | no | no | excluded |

Zero is not a fifth state. Base XP persists; RT, Energy, grades, history, balances, and coins never change. Only the teacher changes one life in the matching active session. Lives persist through end/unopened dates to the next start. No automatic recovery, attendance, discipline/report confirmation, ranking, projection, event sourcing, configurable policy, or M11 work.

## State, session start, incidents, and proposals

`behaviour_student_state` stores `{student,owner,year,group,currentLives,lastEffectiveActionId,activeZeroSourceActionId}`; absence means four. New sessions have `real_class_sessions.behaviour_snapshot_version=1` and roster rows `{session,student,owner,year,group,term,livesAtStart,inheritedActionId,zeroSourceActionId}` for active roster IDs. Legacy closed sessions remain `NULL`.

Calendar requires `BehaviourSessionStartPort.onStarted(db,{sessionId,ownerTeacherId,academicYearId,groupId,termId},isReplay)`. After verified session insertion and before request/commit, it calls the port inside existing `BEGIN IMMEDIATE`; the port never begins/commits. It snapshots state/incidents and marks version 1; failure rolls back all. Replay runs inside that transaction: version 1 revalidates all lineage; `NULL` is inert. Existing uniques settle races; the version distinguishes empty rosters.

Actions append `{LOSS|RESTORE|CORRECTION,delta,session,lineage,request,fingerprint,correctionOf}`. `livesAtStart + SUM(delta ORDER BY createdAt,id)` must equal materialized state before/after each write. Bounds mismatch is `409`. Correction appends the inverse of only the latest effective same-session normal action.

Lives `0/1` create/revalidate one `UNIQUE(session,student)` incident. Trigger correction marks it corrected; re-entry reuses it as active with a new trigger; actions retain history. Falling to zero creates one proposal keyed by immutable zero-source action. Dismissal is `DISMISSED`; correction/restoration above zero makes an open proposal `WITHDRAWN` and clears the episode. Inherited zero never reopens it; restore then new fall creates another. No report is registered.

## Denied eligibility and M3 replay

Migration adds immutable `xp_evidence_events.gem_receipt_allowed_at_award`, copied at first crossing to `xp_level_unlocks.gem_receipt_allowed`; existing rows become `1`. Every grant/revoke/reinstate of that unlock inherits it, including startup completion. `gem_xp_transition_receipts` gains `outcome APPLIED|DENIED`; `movement_id` becomes nullable with `APPLIED ⇔ movement_id IS NOT NULL`. Existing receipts become `APPLIED`.

`applyXp` persists one receipt per contiguous transition before advancing `gem_reconciliation_cursors`. Allowed families retain M3. Denied families persist `DENIED`, null movement, and no ledger family. Replay/startup fingerprints eligibility/outcome, requires one receipt per `1..cursor`, and rejects denied-family movement. Existing atomic rollback plus immutable denial prevents catch-up.

`rt_streak_emerald_entitlements.gem_receipt_allowed` is captured at creation; existing rows become `1`. `gem_reconciliation_revisions.outcome` is `APPLIED|NO_MOVEMENT|DENIED`. Every revision keeps stable receipt identity. Denied revisions require null movement, never CAS-consume/create a ledger family; allowed revisions preserve M3 baseline/chains. XP snapshots eligibility before evidence; RT does so at entitlement creation.

Direct result-reward receive and advantage spend return `409 BEHAVIOUR_RESTRICTED` before request/resource/receipt, ledger, allocation, balance, or coin writes. Corrections/reversals remain allowed. Denied direct requests are not persisted or caught up. Special-activity selection omits lives `0/1`; no eligible participant returns atomic `409`.

## API, UI, privacy, migration, and rollout

Private cookie routes: behaviour GET by session; life loss/restoration by session/student; correction by action; proposal dismissal. UUID-v4 owner-scoped keys fingerprint operation/target/session/body: create `201`, exact replay `200`, changed reuse/race/restriction `409`; auth `401`, hidden absence/ownership `404`, malformed/non-roster `422`. Active-session XP/Gem calls require its matching ID/group; when none is active only `null` is valid and restrictions are inactive. RT retains session identity.

Closed DTOs expose only IDs, lives/state/restrictions, incident/proposal status. Logs omit names, values, bodies, keys, disciplinary data. Projection stays behaviour-free. Private Spanish UI uses **Vidas**, **Quitar vida**, **Restaurar vida**, **Deshacer**, **Propuesta de parte leve**, **Descartar propuesta**, with loading, empty, disabled, retry, error, success, read-only, reload, and context-change states.

`0014_behaviour_lives` adds six tables (state, roster, actions, incidents, proposals, requests), snapshot/eligibility/outcome columns, composite `RESTRICT` FKs/checks/uniques, and one-open-proposal/student. Preflight rejects active sessions and drift; no backfill/seed. Rollout: backup → migration → API/UI together. Backout disables M4 and restores the pre-use backup; after use, correct forward, never reverse DDL. C-01 blocks real-data production.

## Tests, acceptance, and Simplicity Check

Vitest TDD covers policy, carry, derivation, lifecycle, correction/replay/races, FKs. Integration proves start rollback/replay/empty roster; identity; base XP/zero bonus; allowed/denied XP live/replay/startup cursor chains; RT baseline/revision chains; no catch-up; Gem/game denial; corrections; unchanged allocations/balances/coins; privacy. Components cover Spanish states. Playwright proves start → zero/restrictions → end/unopened date → next-start carry → restore/retry/reload and no projection field.

Acceptance requires every rule and evidence above. **Threat matrix:** routing/auth/ownership/session identity and ordinary `404` for report-confirmation routes require RED tests; shell/subprocess/executable/VCS/process boundaries are N/A. **Simplicity Check:** one module, six tables, narrow source columns/receipt outcomes, one calendar port, existing synchronous transactions; no scheduler, engine, report system, setting, dependency, or projection model.
