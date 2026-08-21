# SPEC-XXXX — <Title>
## Design

**Status:** Draft | Review | Approved  
**Owner:**  
**Date:**  
**Related decisions:**  
**Depends on:**  

> Philosophy: **Think hard once, then execute.**
>
> This Design must make downstream work predictable.
> Include enough detail to implement safely, but omit sections that are genuinely not relevant.

---

# 1. Context

## 1.1 Current state
What exists today?

## 1.2 Problem
What concrete problem are we solving?

## 1.3 Why now
Why does this work belong in the current roadmap position?

---

# 2. Goals

- G1:
- G2:

Goals must describe observable outcomes.

---

# 3. Non-goals

Explicitly state what this SPEC will not solve.

- NG1:
- NG2:

---

# 4. Functional scope

## 4.1 User flows

Describe the end-to-end teacher or classroom flows affected.

## 4.2 Business rules

List exact rules.
Use formulas, state tables and invariants where useful.

## 4.3 Edge cases

Document only realistic or correctness-relevant edge cases.

---

# 5. Existing architecture relevant to this change

Describe only the architecture needed to understand this SPEC.

Do not repeat the whole repository architecture.

---

# 6. Proposed design

## 6.1 Overview

Explain the solution in one coherent model.

## 6.2 Components

| Component | Responsibility | Owns data? |
|---|---|---|
| | | |

## 6.3 Data flow

Describe relevant reads, writes and events.

## 6.4 State transitions

Where the feature has state, define valid transitions explicitly.

---

# 7. Domain model

## 7.1 Entities / value objects

| Entity / value | Purpose | Key invariants |
|---|---|---|
| | | |

## 7.2 Domain invariants

Examples for this project may include:
- behaviour never reduces academic grades;
- coin balance never becomes negative;
- a closed evaluation does not mutate silently;
- classroom-safe DTOs never contain private fields.

Document only invariants relevant to this SPEC.

---

# 8. Data model

Skip if no persistence changes.

## 8.1 Existing data affected

## 8.2 New tables / entities / fields

## 8.3 Constraints and indexes

## 8.4 Migration strategy

## 8.5 Data lifecycle / retention

Where student educational data is involved, note retention implications.

---

# 9. Interfaces and contracts

Use only the subsections that apply.

## 9.1 Application/service contracts

## 9.2 API contracts

For each relevant contract define:
- method / operation;
- authorization;
- input;
- output;
- validation;
- errors.

## 9.3 Events

## 9.4 UI contracts

For privacy-sensitive UI, define exactly which fields are exposed.

---

# 10. Module boundaries

| Module | Owns | May depend on | Must not own |
|---|---|---|---|
| | | | |

Explain any new dependency direction.

Do not create a shared/common module merely for convenience.

---

# 11. Dependencies

## 11.1 Existing dependencies used

## 11.2 New dependencies proposed

For every new dependency explain:
- why it is needed;
- why native/current alternatives are insufficient;
- maintenance/security implications.

Avoid adding dependencies by default.

---

# 12. Security, authorization and privacy

Skip only when truly irrelevant.

## 12.1 Actors

Who can perform each operation?

## 12.2 Authorization

Where is authorization enforced?

## 12.3 Data exposure

Classify fields as:
- teacher-private;
- classroom-safe;
- exportable;
- internal-only.

## 12.4 Student data constraints

Describe:
- minimization;
- logging restrictions;
- accidental exposure prevention.

## 12.5 Tenant/data isolation

Use only if the system actually introduces multiple data owners requiring isolation.
Do not invent multi-tenancy.

---

# 13. Compatibility

## 13.1 Existing behaviour preserved

## 13.2 Breaking changes

## 13.3 Backward compatibility

Skip when the project has no relevant prior behaviour.

---

# 14. Failure modes

| Failure | Expected behaviour | Recovery |
|---|---|---|
| | | |

Focus on realistic failure paths:
- duplicate actions;
- failed writes;
- invalid state transitions;
- partial bulk actions;
- export failures;
- stale closed evaluations;
- privacy boundary mistakes.

---

# 15. Observability

Use only what the feature needs.

Possible items:
- structured application errors;
- audit events;
- minimal operational logging;
- privacy-safe diagnostics;
- metrics if justified.

Never log sensitive student data unnecessarily.

---

# 16. Testing strategy

## 16.1 Unit tests

Which domain rules require direct tests?

## 16.2 Integration tests

Which module/data interactions must be covered?

## 16.3 Authorization/privacy tests

Required whenever private/classroom-safe boundaries are touched.

## 16.4 UI/E2E tests

Cover only critical user flows.

## 16.5 Regression cases

List concrete bugs or business-rule regressions this SPEC must prevent.

---

# 17. Rollout

How will this change become active?

For early local-only development, keep this minimal.

---

# 18. Rollback

How can the change be safely reversed?

Include migration rollback/data recovery only where relevant.

---

# 19. Extensibility

Answer explicitly:

1. What future extension does this Design intentionally support?
2. What is deliberately **not** generalized yet?

Avoid speculative framework-building.

---

# 20. Settled decisions

List the decisions downstream phases MUST NOT reconsider.

- SD-01:
- SD-02:

If a downstream phase discovers new evidence that invalidates one, it must report a BLOCKER rather than silently redesign.

---

# 21. Working Set

The Working Set is the expected implementation surface.

## 21.1 Expected files/modules to create

- `...`

## 21.2 Expected files/modules to modify

- `...`

## 21.3 Expected files/modules not to modify

- `...`

This is a prediction, not an artificial restriction.
Unexpected files require explanation, not automatic failure.

---

# 22. Read Order

Downstream agents should read the minimum useful set in this order:

1. `...`
2. `...`
3. `...`

Do not re-explore the whole repository without evidence that the Working Set is insufficient.

---

# 23. Implementation constraints

Concrete constraints that Tasks and Apply must preserve.

- IC-01:
- IC-02:

---

# 24. Acceptance criteria

Acceptance criteria must be objective and testable.

- [ ] AC-01:
- [ ] AC-02:
- [ ] AC-03:

Include privacy/security acceptance criteria when relevant.

---

# 25. Open findings

Classify each unresolved finding:

### BLOCKER
Must be resolved before Design approval.

### CONDITION
Does not block approval. Carry forward as an acceptance criterion or implementation constraint.

### NON-BLOCKING
Record and continue.

If none:

`None.`

---

# 26. Design handoff

## Downstream agents must know

Summarize the final implementation model in a few bullets.

## Downstream agents must not reconsider

Repeat only the highest-risk settled decisions needed to prevent redesign.

---

# Architecture Review result

To be filled by review:

**Result:** APPROVED | APPROVED WITH CONDITIONS | BLOCKED

### Findings
- ...
