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

## DEC-003 — RT is independent from XP

**Status:** Accepted

### Decision
Task Register (RT) uses only evaluated task records: 10, 5 and 0. `NOT_EVALUATED` is excluded.

### Rationale
Task completion and classroom-observation evidence measure different things.

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

## DEC-010 — Technical stack is intentionally undecided before SPEC-0001

**Status:** Accepted

### Decision
No frontend, backend, database, deployment or repository stack is chosen in the SDD foundation.

### Rationale
The project has no existing codebase. Stack selection belongs in the first Design so it can be reasoned about once and then treated as settled.
