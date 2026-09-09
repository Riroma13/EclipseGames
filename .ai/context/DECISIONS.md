# DECISIONS.md — Protocole Éclipse

This file records settled product and engineering decisions that should not be repeatedly reopened.

Architecture decisions that emerge from future SPECs may be recorded here or referenced from a dedicated ADR if their scope justifies it.

---

## DEC-001 — Separate academic, gamification, behaviour and narrative domains

**Status:** Accepted

### Decision
The system treats academic evaluation, gamification, behaviour and narrative as separate conceptual domains.

### Rationale
This prevents disciplinary state or game mechanics from contaminating academic assessment and keeps the product understandable and auditable.

### Consequences
- behaviour cannot lower XP or RT;
- narrative cannot automatically change grades;
- gamification rewards cannot become hidden grading rules;
- cross-domain effects must be explicitly documented.

---

## DEC-002 — XP is evidence, not the official grade

**Status:** Accepted

### Decision
XP records provide evidence for the quarterly classroom-observation rubric.

### Rationale
The teacher must retain professional judgement and cannot reduce classroom observation to a raw point total.

### Consequences
- XP suggests rubric levels;
- teacher reviews and may adjust;
- official Observation grade comes from the closed rubric.

---

## DEC-003 — RT is independent from XP (SUPERSEDED)

**Status:** Accepted

### Decision
Task Register (RT) uses only evaluated task records: 10, 5 and 0. `NOT_EVALUATED` is excluded.

### Rationale
Task completion and classroom-observation evidence measure different things.

The representative `NOT_EVALUATED` value is superseded by the current
canonical `ABSENT` semantics recorded in DEC-016.

---

## DEC-004 — No individual student accounts in MVP

**Status:** Accepted

### Decision
Students do not authenticate or access a personal portal.

### Rationale
The product is teacher-operated and classroom-projected. Student accounts would add complexity, privacy surface and administration without current need.

---

## DEC-005 — Private teacher mode and classroom-safe projection are separate data views

**Status:** Accepted

### Decision
Classroom projection receives only explicitly safe gamification fields.

### Rationale
Student educational and disciplinary information is private.

### Consequences
Privacy must be enforced at the authoritative data/API boundary where applicable, not only by hiding frontend elements.

---

## DEC-006 — No public rankings

**Status:** Accepted

### Decision
The product must not publicly rank students by XP, grade, RT, Energy, level or coins.

### Rationale
The goal is individual progress and motivation, not public comparison.

---

## DEC-007 — Closed quarterly evaluations use snapshot semantics

**Status:** Accepted

### Decision
Closing an evaluation freezes the rubric and calculated results as a snapshot.

### Rationale
Official term results must remain stable and auditable.

### Consequences
Any later correction requires explicit reopen and traceability.

---

## DEC-008 — Narrative remains lightweight

**Status:** Accepted

### Decision
Protocole Éclipse uses three short collective narrative events per term.

### Rationale
Narrative supports engagement but must not consume significant teaching time or evolve into a complex game system.

---

## DEC-009 — Build for one teacher first

**Status:** Accepted

### Decision
The initial product targets a single teacher managing their groups.

### Rationale
There is no demonstrated requirement yet for multi-school, multi-organization or tenant architecture.

### Consequences
Do not introduce multi-tenancy, organization hierarchies or enterprise administration without a future approved SPEC.

---

## DEC-010 — Technical stack was intentionally undecided before SPEC-0001

**Status:** Historical / Superseded by DEC-011

### Decision
No frontend, backend, database, deployment or repository stack is chosen in the SDD foundation.

### Rationale
The project has no existing codebase. Stack selection belongs in the first Design so it can be reasoned about once and then treated as settled.

---

## DEC-011 — SPEC-0001 platform foundation stack and boundaries

**Status:** Accepted

### Decision
The platform uses a React/Vite web app with a Fastify REST API, SQLite managed by Drizzle, opaque revocable cookie sessions, pure TypeScript domain modules, server-side projection allowlists, and layered Vitest plus Playwright testing. It runs as one Docker-deployed service with explicit web, API, domain, and contract package boundaries.

### Rationale
This topology keeps the single-teacher MVP operationally small while preserving privacy, testability, and clear ownership for downstream SPECs.

### Consequences
Server DTO mapping is the privacy authority; domain modules do not perform I/O; downstream work must preserve the selected stack and boundaries unless contradictory evidence creates a Design blocker.

---

## DEC-012 — Product simplicity is the default

**Status:** Accepted

### Decision

EclipseGames uses the simplest reliable solution for the teacher's classroom workflow as its default product and engineering bias. Complexity requires a concrete current requirement and remains bounded by privacy, authentication, correctness, data integrity, recoverability and testing.

### Rationale

The product is used live by teachers with classroom-sized groups, so unnecessary configuration, abstraction and scale-oriented infrastructure would obstruct the workflow without present value.

### Consequences

`.ai/context/PROJECT.md` is the canonical source for the operational rules. Every future Design includes a short **Simplicity Check**.

---

## DEC-013 — Assessment-context names are unique within an active group

**Status:** Accepted / archived with SPEC-DEMO-002

### Decision
Assessment contexts use trimmed display names and one active normalized name per group. Create-or-reuse is canonical: a new context returns `201`, an equivalent active retry returns `200` with the canonical DTO, and concurrent creates converge through the database invariant. Archived contexts may be replaced by a new active context; rename preserves stable identity and rejects active normalized collisions.

### Rationale
The teacher MVP has no assessment-management surface, so deterministic context identity is required to preserve the one-advantage-per-student/context rule without introducing a lifecycle engine or generic idempotency layer.

### Consequences
- The invariant is scoped to `group_id` and active contexts only.
- Migration preflight fails closed on legacy normalized duplicates.
- C-01 remains unrelated and production-only. D-06 was later updated by DEC-014 after maintainer runtime evidence; the change is limited to minimal deterministic point grants.

---

## DEC-014 — Minimal deterministic demo points for the verified journey

**Status:** Accepted / archived with SPEC-DEMO-002

### Decision
The normal service-owned deterministic demo seed includes two minimal fixed-ID, fixed-source, idempotent, fail-closed point grants for the seeded first student, producing a 2-point balance for the canonical local journey.

### Rationale
Maintainer runtime review proved the previous seed could not demonstrate the intended redemption and reversal journey without a manual point grant.

### Consequences
- The seed extension uses the existing coin repository grant only and preserves backend `coin` terminology.
- No automatic XP-route reconciliation, wallet/shop/dashboard/history mechanic, or new subsystem is introduced.
- Collision preflight, transactional insertion, replay idempotency, reward catalogue, redemption, and reversal remain tested.

---

## DEC-015 — Portable v1 lifecycle (SUPERSEDED)

**Status:** Historical / superseded by DEC-017

### Decision
EclipseGames previously used SDD Portable v1. This decision is retained as
historical evidence only; it is no longer executable policy.

### Rationale
The repository-native `docs/specs/` artifacts are already the authoritative
product record. A second product/spec tree or an independent Apply chain would
split lifecycle state and could reactivate historical work.

### Consequences
Portable runtime state, traces, model maps, and phase artifacts are obsolete.

---

## DEC-017 — SDD Lite is the single EclipseGames workflow

**Status:** Accepted / current control-plane decision

### Decision
EclipseGames uses DESIGN -> BUILD -> VERIFY -> SHIP. Design is the primary
contract, Tasks are a plain plan, Verify records evidence, and only explicit
`/sdd-ship` may perform Git/VCS handoff.

### Rationale
The product needs evidence-driven engineering without a second critical-system
control plane or parser-dependent lifecycle state.

### Consequences
- Public commands are `/sdd-start`, `/sdd-resume`, `/sdd-verify`, and
  `/sdd-ship`.
- Resume uses Design, Tasks, Verify, code, tests, and worktree evidence only.
- There is no Apply, Archive, Health, Repository Ready, runtime state, trace,
  fingerprint, recovery, checkpoint, or rebaseline phase.

---

## DEC-016 — SPEC-0017 canonical functional register

**Status:** Accepted / current canonicalization authority

### Decision
Later SPECs use the SPEC-0017 register as product authority. RT uses
`10 | 5 | 0 | ABSENT`, with `ABSENT` excluded from average, Energy, and
streak. Energy is derived from the current-term RT average. Emerald, Ruby, and
Diamond replace coins for future writes with no conversion or dual-write;
legacy coin records remain readable evidence. Lives map to
Normal/Vigilancia/Alerta/Código Rojo, and a real class session exists only
between explicit `Comenzar clase` and `Finalizar clase` actions within the
configured calendar. XP remains annual while RT, Energy, rubric, and close
snapshots are term-scoped.

### Rationale
The audit reconciles contradictory stable context without rewriting archived
SPECs or claiming future behavior exists. Explicit ownership and dependency
boundaries prevent legacy money, fixture values, or representative RT values
from becoming accidental product contracts.

### Consequences
- Future work follows M1–M12 dependency order from SPEC-0017.
- Server-side projection allowlists remain authoritative; private fields are
  never filtered only in React.
- `ABSENT` is not a reinterpretation of existing task rows; later RT
  persistence must define it explicitly.
- C-01 remains an open production privacy/recoverability gate: encrypted-restic backup and restore execution is not demonstrated.
