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
→ maintainer approval
→ Tasks
→ Tasks Review
→ Apply
→ Verify
→ Archive
→ Health Report
→ Repository Ready
→ Automated Git Handoff
→ Repository Ready on synchronized main
→ STOP
```

The normal path above includes the explicit maintainer approval gate between Architecture Review and Tasks. The existing Design Refinement and Tasks Refinement rules remain available only for real blockers or concrete required corrections, and the Apply Summary remains the required record after Apply and before Verify; neither changes the canonical phase order.

For a future SPEC cycle, `Repository Ready: YES` is the explicit workflow authorization to enter the routine Automated Git Handoff defined in Section 13. Routine successful Git/GitHub steps do not require an additional confirmation.

Outside that future-SPEC handoff, do not perform Commit, Push, Pull request, CI, Merge, Release, Tag, or other VCS delivery actions unless explicitly authorized.

Editing this workflow does not authorize or execute the handoff for the current SPEC or this documentation task. The current task remains documentation-only and performs no Git handoff.

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
- repository has passed the gate for the active SPEC's Automated Git Handoff.

For a future SPEC cycle, the next transition is:

`Repository Ready` → `Automated Git Handoff`

The successful terminal state after that handoff is exactly:

`Repository Ready on synchronized main`

Then:

`STOP`

The current documentation edit does not enter this transition and does not authorize any Git action for the current SPEC.

---

# 13. Automated Git Handoff

The Automated Git Handoff is a deterministic post-Repository-Ready state machine for future SPEC cycles. It uses normal Git/GitHub operations; it does not authorize a custom script, a stacked delivery model, or a new SDD phase. It begins only after the active SPEC is `Repository Ready: YES` and ends only at the exact successful terminal state `Repository Ready on synchronized main`.

This section is not retroactive. Editing `docs/SDD-WORKFLOW.md` does not trigger the handoff, and this current documentation task must not apply it to the current SPEC.

## 13.1 State machine

| State | Entry guard | Action | Success transition |
|---|---|---|---|
| `Repository Ready` | All preconditions pass | Enter the handoff without a routine confirmation | `Commit` |
| `Commit` | Approved current-SPEC change set is known | Stage only approved changes and create one commit | `Push` |
| `Push` | Active SPEC branch is the only target | Push the active SPEC branch and set upstream when needed | `Pull request` |
| `Pull request` | No existing active-SPEC PR, or an existing PR can be reused | Create or reuse one PR targeting `main` | `CI` |
| `CI` | Required checks are available | Wait for required GitHub checks | `Merge` |
| `Merge` | Required checks pass and no conflicts exist | Squash-merge the PR into `main` | `Synchronization` |
| `Synchronization` | The merge completed | Synchronize local `main` and verify repository state | `Repository Ready on synchronized main` |
| Any state | A listed exception occurs | Stop, preserve the state, report evidence, and request maintainer input | `STOP` |

## 13.2 Preconditions

All of these conditions must hold before staging:

- The current branch is the active SPEC branch.
- Never operate directly on `main`.
- Verify is `PASS` or `PASS WITH CONDITIONS` with no `BLOCKER`.
- Repository Ready is `YES`.
- The working tree contains only repository files.
- `git diff --check` passes.
- No unexpected unrelated project files will be staged.

If any precondition fails, do not begin the Commit state.

## 13.3 Commit

- Stage only approved current-SPEC changes.
- Create one concise conventional commit based on the SPEC title and scope.
- Do not rewrite unrelated history or amend unrelated commits.

## 13.4 Push

- Push only the active SPEC branch.
- Set the upstream when needed.

## 13.5 Pull request

- Create one PR targeting `main` when no active-SPEC PR exists; otherwise reuse the existing PR.
- The PR body summarizes the SPEC, the Verify result, and any remaining conditions.
- Do not use stacked PRs or alternate bases unless a future approved workflow explicitly requires them.

## 13.6 CI

- Wait for all required GitHub checks.
- A CI failure stops automation with the failing check and available evidence recorded.
- Never weaken tests to obtain green CI.
- Merge conflicts stop automation and request maintainer input.

## 13.7 Merge

- Merge only after required checks pass and no conflicts exist.
- Squash-merge into `main`.
- Use a concise conventional squash message based on the SPEC title.
- Do not use merge commits or rebase merge by default.

## 13.8 Synchronization

- Switch the local repository to `main`.
- Fetch and pull with `--ff-only`.
- Verify that local `main` equals `origin/main`.
- Verify a clean working tree.
- Optionally delete the merged local SPEC branch only when it is safe, including that it is no longer current, is merged, and has no unpushed work.
- Never delete remote branches unless GitHub deletes them automatically or an explicit policy permits it.

Only after every synchronization check passes, report the successful terminal state exactly as:

`Repository Ready on synchronized main`

Then:

`STOP`

## 13.9 Stop/exception policy

Automation must stop immediately and request maintainer input for:

- CI failure;
- merge conflicts;
- unexpected files;
- wrong branch or base;
- ambiguous Git state;
- a force-push requirement;
- history rewriting beyond the normal squash merge;
- credentials or authentication failure;
- any material decision.

On an exception, do not bypass checks, improvise a workaround, continue to a later state, rewrite history, force-push, or delete branches to hide the problem. Report the current branch, PR/base state, relevant check or Git evidence, and the exact reason for stopping. No further handoff action occurs until the maintainer resolves the exception.

## 13.10 Still maintainer-controlled

Release, Tag, production deployment, destructive Git operations, force push, and branch-history rewriting outside the normal squash merge remain maintainer-controlled.

## 13.11 Human-on-exception principle

Do not request confirmation at routine successful Git steps. Involve the maintainer only for exceptions or material decisions.

---

# 14. Working Set discipline

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

# 15. Review-loop minimization

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

# 16. Project-specific safety checks

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

# 17. Automation policy

Automation should remain thin.

Do not create custom orchestration, agent frameworks, metrics pipelines or workflow scripts merely because another project has them.

Automate only after repeated manual friction demonstrates a real need.

The Automated Git Handoff in Section 13 is the approved policy response to repeated post-Repository-Ready Git friction. It describes normal Git/GitHub operations and does not require a custom orchestration script, agent framework, metrics pipeline, or repository workflow file.

Repository documents and normal development commands should remain understandable without the automation layer.

---

# 18. Stop conditions

These are SDD phase-level stop conditions. Automated Git Handoff exceptions are governed by Section 13 and stop delivery while requesting maintainer input, even when they do not indicate an implementation BLOCKER.

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
