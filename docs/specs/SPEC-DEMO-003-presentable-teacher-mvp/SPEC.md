# SPEC-DEMO-003 — Presentable Teacher MVP

### Requirement: Private context

Workspace MUST require authentication, keep private state out of URLs/storage, identify active year/group, and show a data summary. Failure MUST NOT appear as zero.

#### Scenario: Load private context
- GIVEN authenticated teacher and active year/group
- WHEN `/#/workspace` loads
- THEN context and summary precede actions

### Requirement: Roster and identity

Workspace MUST support dense scanning, name/alias search, and selection for groups up to 30 without ranking. Detail MUST show identity, specialty, XP, level/progress, badges, and explain “Eclipse Points”.

#### Scenario: Find a student
- GIVEN a populated roster
- WHEN the teacher searches a name/alias and selects it
- THEN matching identity and private detail are unmistakable

### Requirement: XP action and recovery

Teacher MUST award existing XP categories/values without grade inference. Feedback MUST distinguish pending, success, error/retry, and undo/reversal; duplicate submits MUST be prevented.

#### Scenario: Award and undo
- GIVEN selected student and valid XP action
- WHEN submitted and reversed within the undo window
- THEN truthful pending, success, and reversal feedback appears

### Requirement: Eclipse Points

UI MUST use “Eclipse Points”; internal `coin` contracts remain unchanged. Existing context, costs, balance, one-per-assessment, redemption, reversal, and failures MUST work. Grades MUST NOT be stored or inferred.

#### Scenario: Redeem and reverse
- GIVEN sufficient balance and assessment context
- WHEN an advantage is redeemed then reversed
- THEN cost, enforcement, and balance are truthful

#### Scenario: Genuine failure
- GIVEN insufficient balance, duplicate use, or failed write
- WHEN redemption is attempted
- THEN an error appears; success is not claimed

### Requirement: Factual activity

Workspace SHOULD show at most three XP evidence records, only category, values, reversal, and time. It MUST never show comments, grades, or fabricated activity. None MUST be zero; failure MUST be unavailable with retry.

#### Scenario: Distinguish activity states
- GIVEN no evidence or load failure
- WHEN activity displays
- THEN it shows zero activity or unavailable/retry

### Requirement: Safe Projection handoff

Workspace MUST expose an accurately labelled link to fixture-backed `/` Projection. It MUST carry no private/selected-group state or imply equivalence; server allowlists remain authoritative.

#### Scenario: Open the Projection
- GIVEN a teacher is in the private workspace
- WHEN the labelled link is followed
- THEN `/` opens separately without private payload or teacher-data fallback

### Requirement: Minimal setup

Setup UI MUST use existing roster contracts and preserve ownership, archive, alias, batch-size, atomicity, and correction-lock rules. It MUST NOT bypass read-only behavior or add infrastructure.

#### Scenario: Create permitted roster data
- GIVEN a writable owned context
- WHEN valid roster creation is submitted
- THEN data refreshes; invalid, archived, or locked requests remain rejected

### Requirement: Synthetic demo seed

Only on maintainer approval, development seed MUST provide 16 fictional students, varied truthful progression, multiple badges, 0/1/2/3 balances, and useful Camille state, preserving DEC-014’s fixed grants. IDs/sources MUST be preflighted; writes MUST be transactional, fail closed, replay-idempotent, and production-refusing. Otherwise no change.

#### Scenario: Replay or collision
- GIVEN clean, seeded, or colliding development data
- WHEN the deterministic seed runs
- THEN it creates the plan, replays safely, or aborts before partial additions

### Requirement: Accessible privacy

The journey MUST support 320px, 800px, projector sizes, visible focus, reduced motion, and no overflow. Existing selectors/routes and auth, ownership, XP, coin, reversal, and Projection contracts MUST remain compatible. Academic, gamification, behaviour, narrative, and privacy MUST NOT change.

#### Scenario: Navigate accessibly
- GIVEN a keyboard user at a narrow viewport
- WHEN student detail opens
- THEN focus is visible, motion is reducible, and content does not overflow

## Non-requirements

No dashboards/charts, fake metrics/activity, rankings, admin navigation, student accounts, history redesign, new BFF/domain/schema/migrations/dependencies/endpoints, or grade inference; C-01 remains production-only.

## Architecture Review Conditions

Tasks MUST carry the unchanged maintainer seed gate and name: `apps/web/src/workspace/workspace-api.test.ts`, `apps/web/src/workspace/demo-presentation.test.ts`, `apps/web/e2e/teacher-workspace.spec.ts`, `apps/web/e2e/auth-projection.spec.ts`, `apps/api/test/privacy/projection.test.ts`, and conditional `apps/api/test/integration/seed-demo.test.ts`. XP wrapper MUST type `academicYearId`/`limit=3` and unavailable-versus-zero.
