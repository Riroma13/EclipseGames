# Initial OpenCode prompt — Protocole Éclipse

Use the following prompt after placing this SDD foundation in the new repository.

---

You are starting the implementation of a new project called **Protocole Éclipse**.

The repository currently contains only the SDD foundation and no product code.

Your first task is **not to implement the application**.

## Required startup

Read these files in order:

1. `AGENTS.md`
2. `.ai/context/PROJECT.md`
3. `.ai/context/SESSION.md`
4. `.ai/context/DECISIONS.md`
5. `.ai/context/KNOWN_ISSUES.md`
6. `.ai/context/ROADMAP.md`
7. `docs/SDD-WORKFLOW.md`
8. `docs/templates/design-enterprise-template.md`

Treat repository artifacts as the source of truth.

## Goal

Create the first SDD Design:

`docs/specs/SPEC-0001-platform-foundation/DESIGN.md`

SPEC-0001 must establish the smallest maintainable technical foundation capable of supporting the known Protocole Éclipse roadmap.

## Important context

There is no existing codebase and no approved stack.

Do not copy CRM-Master, Beehive or any other project architecture.

Do not choose technologies merely because they were used elsewhere.

Reason from this project's real constraints:

- single teacher first;
- groups of around 30 students;
- fast live classroom interaction;
- laptop/tablet primary;
- classroom projection;
- private educational data;
- no individual student accounts in MVP;
- academic evaluation, gamification, behaviour and narrative must remain separate;
- simple deployment and maintenance are preferred;
- the system should remain small;
- strong tests are required for domain calculations and privacy boundaries;
- future reuse in other subjects is desirable, but premature abstraction is not.

## SPEC-0001 Design must decide

At minimum:

1. frontend architecture;
2. backend/application architecture;
3. database/persistence;
4. teacher authentication;
5. repository structure;
6. domain/module boundaries;
7. API/data-access style;
8. testing stack;
9. migration strategy;
10. local development workflow;
11. deployment target and topology;
12. backup/restore baseline;
13. classroom-safe vs teacher-private data boundary;
14. error handling and minimal observability;
15. dependency policy;
16. initial security/privacy model.

## Design quality bar

Apply the philosophy:

> Think hard once, then execute.

The Design should contain enough concrete decisions that Tasks and Apply will not need to redesign the platform.

Prefer a boring, cohesive architecture over an enterprise architecture.

Explicitly state:
- alternatives considered;
- why the selected architecture fits this product;
- what is intentionally deferred;
- what future agents must not reconsider;
- expected initial repository tree;
- Working Set;
- Read Order;
- acceptance criteria.

Do not implement code.

Do not initialize frameworks.

Do not create package files.

Do not create Tasks yet.

## Architecture Review

After drafting the Design, perform one Architecture Review using `docs/SDD-WORKFLOW.md`.

The review may return only:
- APPROVED
- APPROVED WITH CONDITIONS
- BLOCKED

The review validates the Design; it does not redesign it because of preference.

Only refine the Design if a real BLOCKER exists.

## End state

Stop when:
- `DESIGN.md` exists;
- Architecture Review is recorded in it;
- there are no unresolved BLOCKER findings.

Then report:

1. selected architecture;
2. main reasons;
3. major alternatives rejected;
4. conditions carried forward;
5. exact next SDD step.

Do not start Tasks or implementation until the maintainer approves the Design.
