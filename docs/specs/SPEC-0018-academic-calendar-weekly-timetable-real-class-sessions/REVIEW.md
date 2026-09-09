# Terra Architecture Review — SPEC-0018

## Outcome: PASS WITH CONDITIONS

The refined Level C Design closes the prior build blocker without expanding scope. It preserves the React/Fastify/SQLite boundaries, teacher-private server DTO authority, explicit-session model, and the existing roster ownership of academic-year mutation. No remaining design finding blocks Build.

## Re-review of prior findings

| Finding | Verdict | Current Design evidence |
|---|---|---|
| **B-01 — roster/calendar lifecycle seam** | Resolved | `roster.updateYear` and archive now call the narrow calendar guard in the same `BEGIN IMMEDIATE` transaction. Proposed year dates reject configured term/holiday ranges and persisted session snapshots outside the year (`DESIGN.md:41`). Archive rejects an active session, then permits closed-history reads. The calendar still reads roster identity only through its named adapter; no generic lifecycle engine or roster-table access is introduced (`DESIGN.md:19,41`). |
| **C-01 — session lineage** | Resolved | Calendar, term, slot, group, year, and owner lineage is constrained by composite keys/FKs, then verified by a same-transaction full-chain query for date/time containment. The downstream adapter returns only that verified chain (`DESIGN.md:37`). Required malformed/cross-calendar/cross-group lineage RED tests are explicit (`DESIGN.md:62`). |
| **C-02 — idempotency/replay** | Resolved | One request journal has `UNIQUE(owner_teacher_id, idempotency_key)`, making a UUID-v4 key single-use across start and end. The fingerprint includes operation, route target, and canonical body; only exact same-operation replay returns `200`, while changed input and cross-operation reuse return `409` (`DESIGN.md:35,56`). Pre- and in-transaction lookup plus `BEGIN IMMEDIATE` gives concurrent duplicates one durable session/request result (`DESIGN.md:22,56`). |

## Confirmed safeguards

- **Transaction/concurrency:** setup, start, year mutation, and archive share serialized `BEGIN IMMEDIATE` write paths; constraint/write races map to `409` without partial state. The planned race tests cover setup/start versus update/archive and duplicate start/end (`DESIGN.md:22,41,62`).
- **Privacy:** every route is teacher-owned; calendar/session DTOs contain no student data; no projection mapper or route changes; safe-metadata audit logging is required (`DESIGN.md:54,60`).
- **Tests and rollout:** TDD covers rules/DST, database lineage, lifecycle/race and replay boundaries, Fastify ownership/privacy, and focused Playwright flows. Migration precedes routes/UI; there is no seed, conversion, reverse migration, or feature flag (`DESIGN.md:62,72`).
- **Simplicity:** six narrow calendar tables, native `Intl`, injected clock, and two named adapters are proportionate. No scheduler, recurrence engine, generic idempotency subsystem, projection contract, or speculative downstream work is proposed (`DESIGN.md:82`).

## Retained production condition

**C-01 (production privacy/recoverability gate) remains open and unchanged.** Real student data and production use remain blocked until SPEC-0014/0016 deliver retention/deletion, backup-expiry, and executed encrypted-restic restore evidence (`.ai/context/KNOWN_ISSUES.md:31-44`). This is not a Build blocker for SPEC-0018.

## Prior blocker history

The prior review was **BLOCKED** because existing roster date updates and archives bypassed calendar/session protection. The refined Design now specifies the atomic guard, enforceable lineage, and exact request-journal replay contract; B-01 and the prior design C-01/C-02 are closed.

## Review basis

Inspected the refined Design against the adjacent prior review, SDD Lite and project authorities, and current roster service/repository/routes, schema/migrations, Fastify registration, idempotency conventions, and roster test layout. No Git/VCS command, product-code change, task artifact, or verification artifact was created.
