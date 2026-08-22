# AGENTS.md — Protocole Éclipse

## Session startup

At the start of every session, read in this order:

1. `.ai/context/PROJECT.md`
2. `.ai/context/SESSION.md`
3. `.ai/context/DECISIONS.md`
4. `.ai/context/KNOWN_ISSUES.md`
5. `.ai/context/ROADMAP.md`
6. The active approved `docs/specs/SPEC-XXXX/DESIGN.md`, if one exists

Do not ask the maintainer to re-explain information already recorded in these files.

## Source of truth

Use this authority order:

1. Approved Design of the active SPEC
2. `docs/SDD-WORKFLOW.md`
3. `.ai/context/PROJECT.md`
4. `.ai/context/DECISIONS.md`
5. Current implementation evidence: code, schema and tests
6. `.ai/context/SESSION.md`, `ROADMAP.md` and `KNOWN_ISSUES.md`

If two sources conflict, stop only when the conflict affects correctness, privacy, data integrity or acceptance criteria.

## Core engineering principles

- Spec-Driven Development for non-trivial work.
- Think deeply in Design; execute predictably afterwards.
- TDD for domain rules and calculations.
- Make the smallest change that fully satisfies the approved Design.
- Do not introduce architecture during Tasks or Apply.
- Do not reopen settled decisions without concrete new evidence.
- Prefer clear module ownership over clever abstractions.
- Optimize for maintainability, low coupling and fast classroom interaction.

## Project constraints

- Academic evaluation, gamification, behaviour and narrative are separate domains.
- Behaviour must never reduce academic grades, XP evidence or RT.
- XP is evidence for observation; it is not the official grade.
- Student educational data is private.
- Classroom projection must expose only explicitly classroom-safe fields.
- The MVP has no individual student accounts.
- The product must remain practical for groups of about 30 students.
- No public ranking of students by academic or gamification performance.
- Narrative is lightweight and must not consume significant class time.

## Agent boundaries

- Design decides.
- Architecture Review validates Design; it does not redesign without a blocker.
- Tasks derive work directly from approved Design.
- Apply executes approved Tasks.
- Verify checks implementation against approved Design and acceptance criteria.
- Archive records outcomes and learning.
- Normal post-Repository-Ready Commit, Push, PR, CI, Squash-Merge and Synchronization are performed by the Automated Git Handoff defined in `docs/SDD-WORKFLOW.md`.
- Release, Tag, production deployment, destructive Git operations, force push, and history rewriting outside normal squash merge remain maintainer-controlled.
- Exceptions and material decisions always return to the maintainer.
- Editing this workflow does not trigger it or apply it retroactively to the current SPEC. No commit, push, PR, CI, merge, release, tag, branch change, or other VCS action is authorized for the current documentation task.

Detailed workflow rules live only in `docs/SDD-WORKFLOW.md`.
