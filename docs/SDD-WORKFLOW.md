# SDD-WORKFLOW.md — Protocole Éclipse

## 1. Purpose

This document defines the single canonical Spec-Driven Development workflow for the repository.

The goal is:

> **Think hard once, then execute.**

Design receives the highest reasoning effort.
Downstream phases should consume the approved decisions rather than repeatedly rediscovering or redesigning the solution.

---

# 2. Canonical workflow

```text
Design
→ Architecture Review
→ Design Refinement only if there is a real blocker
→ Tasks
→ Tasks Review
→ Tasks Refinement only if there is a real blocker
→ Apply
→ Apply Summary
→ Verify
→ Archive
→ Health Report
→ Repository Ready
→ STOP
```

The workflow stops at **Repository Ready**.

The following are separate maintainer-controlled actions:

```text
Commit
Push
Merge
Release
Tag
```

Do not perform them unless explicitly requested.

---

# 3. Source-of-truth principle

Repository artifacts are authoritative.

Use this order:

1. approved Design for the active SPEC;
2. this canonical workflow;
3. `.ai/context/PROJECT.md`;
4. `.ai/context/DECISIONS.md`;
5. implementation evidence: code, schema and tests;
6. temporary context files.

Avoid copying the same rule into several documents.

When a stable rule is already defined in PROJECT or DECISIONS, Design should reference it and describe only what is specific to the active change.

---

# 4. Finding semantics

Every review finding must be classified as one of three types.

## BLOCKER

A blocker stops the workflow.

Use only when continuation would risk:
- incorrect architecture;
- data corruption;
- privacy/security failure;
- impossible implementation;
- contradiction with a settled product invariant;
- unverifiable essential acceptance criterion.

A blocker must be resolved before continuing.

## CONDITION

A condition does not stop execution.

Carry it forward as:
- an acceptance criterion;
- an implementation constraint;
- a required test;
- a rollout condition.

## NON-BLOCKING

Record and continue.

Examples:
- optional cleanup;
- wording;
- naming preference;
- speculative improvement;
- documentation enhancement that does not affect execution;
- future optimization.

Do not block for theoretical completeness.

---

# 5. Review outcomes

Reviews should normally produce exactly one of:

- `APPROVED`
- `APPROVED WITH CONDITIONS`
- `BLOCKED`

Do not invent additional states unless a future repository decision explicitly requires them.

---

# 6. Phase rules

## 6.1 Design

### Purpose
Resolve the problem once.

### Required behaviour
Design must:
- understand the current repository state;
- define scope and non-goals;
- settle architecture relevant to the SPEC;
- define domain/data/API/UI contracts where relevant;
- identify privacy and authorization boundaries;
- define migrations and compatibility when relevant;
- define failure modes;
- define testing;
- define Working Set;
- define Read Order;
- define acceptance criteria;
- state settled decisions that downstream phases must not reconsider.

### Design should not
- create implementation code;
- optimize for hypothetical future scale without evidence;
- introduce unrelated refactors;
- demand sections that are not relevant.

Use:
`docs/templates/design-enterprise-template.md`.

---

## 6.2 Architecture Review

### Purpose
Validate that Design is executable, safe and consistent with repository architecture and product constraints.

### Review questions
- Is the problem correctly understood?
- Is the proposed architecture internally coherent?
- Are module/data boundaries clear?
- Does it preserve settled decisions?
- Are privacy/security boundaries safe?
- Are migrations and failure modes safe where relevant?
- Can Tasks be derived without redesign?
- Are acceptance criteria objective?

### Architecture Review must not
- redesign because of stylistic preference;
- reopen resolved findings;
- replace an adequate architecture with a theoretically nicer one;
- expand scope without evidence.

A review should normally finish in one pass.

---

## 6.3 Design Refinement

Run only when Architecture Review produced a real blocker or concrete required correction.

Refinement must patch specific findings.

Do not rewrite the entire Design unless the blocker proves the core design invalid.

After refinement, review only the changed/high-risk portions plus affected acceptance criteria.

---

## 6.4 Tasks

### Purpose
Convert approved Design into executable implementation steps.

Tasks must:
- follow Design Working Set and Read Order;
- preserve module boundaries;
- preserve settled decisions;
- order work by dependency;
- include tests with implementation;
- identify migrations before code that depends on them;
- keep steps independently verifiable where practical.

Tasks must not:
- introduce new architecture;
- create new scope;
- reinterpret business rules;
- reopen approved Design choices.

If Tasks cannot be written without making a new architectural decision, report a Design BLOCKER.

---

## 6.5 Tasks Review

Validate that Tasks:
- fully cover acceptance criteria;
- follow dependency order;
- include required tests;
- do not contain hidden redesign;
- do not omit migrations/privacy work;
- use the expected Working Set unless deviation is justified.

Result:
- APPROVED;
- APPROVED WITH CONDITIONS;
- BLOCKED.

---

## 6.6 Tasks Refinement

Only patch concrete review findings.

Do not regenerate Tasks from scratch for minor issues.

---

## 6.7 Apply

### Purpose
Execute approved Tasks.

### Rules
- consume Design Read Order first;
- stay within Working Set unless implementation evidence requires expansion;
- explain unexpected files/dependencies;
- implement tests alongside code;
- do not add new architecture;
- do not widen scope;
- do not silently change business rules.

Local implementation choices are allowed when they do not alter approved contracts or architecture.

If implementation reveals that Design is wrong, stop and report a BLOCKER.

Do not redesign silently.

---

# 7. Apply phase summary

Every meaningful Apply phase should conclude with:

```markdown
=== PHASE X COMPLETE ===

Files created:
- ...

Files modified:
- ...

Working Set:
- Planned:
- Actual:
- Accuracy / deviations:

Unexpected Files:
- None / ...

Unexpected Dependencies:
- None / ...

Acceptance Criteria covered:
- [x] ...
- [ ] ...

Build:
- ...

Lint:
- ...

Typecheck:
- ...

Tests:
- ...

Privacy / Security impact:
- None / ...

Known Issues:
- None / ...

Ready for next phase: YES | NO
```

Keep it factual.

---

# 8. Apply Summary

After all Apply tasks for the SPEC are complete, create a consolidated summary in the SPEC folder.

Recommended path:

`docs/specs/SPEC-XXXX/APPLY-SUMMARY.md`

Include:
- files changed;
- key implementation decisions;
- Working Set planned vs actual;
- migrations;
- tests added;
- acceptance criteria implementation mapping;
- deviations from Design;
- unresolved non-blocking issues.

Apply Summary does not replace phase summaries.

---

# 9. Verify

### Purpose
Answer one question:

> Does the implementation satisfy the approved Design and acceptance criteria?

Verify against:
- approved Design;
- acceptance criteria;
- tests;
- actual code/schema;
- privacy/security constraints.

Verify must not:
- redesign the feature;
- invent new requirements;
- reopen resolved findings without new evidence;
- fail a SPEC for optional improvements.

### Verify outcome

Use:
- `PASS`
- `PASS WITH CONDITIONS`
- `FAIL`

A FAIL requires concrete evidence tied to:
- acceptance criteria;
- Design;
- data/privacy correctness;
- broken implementation.

---

# 10. Archive

After successful Verify:

- mark Design status complete/archived as appropriate;
- preserve final Tasks, Apply Summary and Verify evidence;
- update `.ai/context/DECISIONS.md` only for genuinely durable decisions;
- update `KNOWN_ISSUES.md` for deferred debt;
- update `ROADMAP.md`;
- update `SESSION.md`.

Do not copy implementation detail into stable context unless future sessions truly need it.

---

# 11. Health Report

Perform a lightweight repository health check appropriate to the current project maturity.

Check only relevant areas:
- tests;
- lint;
- typecheck;
- build;
- migrations/schema state;
- privacy boundary regressions;
- obvious dependency or architecture drift;
- stale SDD context.

Avoid creating a large audit framework unless repeated experience proves it useful.

---

# 12. Repository Ready

Repository Ready means:
- active SPEC Verify passed;
- required documentation is updated;
- no unresolved BLOCKER remains;
- build/test health is acceptable;
- SESSION contains the exact next step;
- repository is ready for maintainer-controlled version-control actions.

Then:

`STOP`

Do not automatically commit, push, merge, release or tag.

---

# 13. Working Set discipline

Design predicts the likely implementation surface.

Downstream phases should use that prediction to reduce exploration.

Workflow:

```text
Design
→ Working Set + Read Order

Tasks
→ derive work using that set

Apply
→ read expected files first

Verify
→ compare expected vs actual changes
```

Working Set is not a prison.

Expand it when concrete evidence requires additional files.
Record why.

Do not repeatedly scan the whole repository after Design without evidence.

---

# 14. Review-loop minimization

Default target:
- one Architecture Review;
- zero Design Refinements unless needed;
- one Tasks Review;
- zero Tasks Refinements unless needed;
- one Verify.

Resolved findings remain closed unless new implementation evidence invalidates them.

Avoid reviewer churn caused by:
- wording;
- personal style;
- optional abstractions;
- speculative performance;
- hypothetical future products.

---

# 15. Project-specific safety checks

Any SPEC touching these areas requires explicit tests:

## Academic calculations
- XP specialty bonus;
- level thresholds;
- RT average;
- rubric suggestion;
- final Observation grade.

## Behaviour separation
Verify that behaviour never:
- subtracts XP;
- changes RT;
- changes rubric grade;
- changes closed evaluation results.

## Coins
Verify:
- no negative balance;
- restrictions by behaviour state;
- one advantage per assessment context.

## Projection/privacy
Verify classroom mode does not expose:
- real names;
- RT exact value;
- rubric;
- grades;
- comments;
- incidents;
- disciplinary history.

## Closed evaluations
Verify:
- closed snapshot does not silently change;
- reopen is explicit and traceable.

---

# 16. Automation policy

Automation should remain thin.

Do not create custom orchestration, agent frameworks, metrics pipelines or workflow scripts merely because another project has them.

Automate only after repeated manual friction demonstrates a real need.

Repository documents and normal development commands should remain understandable without the automation layer.

---

# 17. Stop conditions

Stop and surface a BLOCKER when:
- the requested implementation contradicts an approved Design;
- a privacy boundary cannot be preserved;
- data migration risks corruption without a safe strategy;
- Tasks require architecture that Design did not settle;
- implementation evidence invalidates a critical Design assumption.

Do not stop for:
- optional refactors;
- naming preferences;
- future scalability ideas;
- documentation polish;
- speculative enhancements.
