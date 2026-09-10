# AGENTS.md — Protocole Éclipse

## Session startup

Read, in order:

1. `.ai/context/PROJECT.md`
2. `.ai/context/SESSION.md`
3. `.ai/context/DECISIONS.md`
4. `.ai/context/KNOWN_ISSUES.md`
5. `.ai/context/ROADMAP.md`
6. The active SPEC `DESIGN.md`, `TASKS.md`, and `VERIFY.md` when present

## SDD Lite

The only workflow is `DESIGN -> BUILD -> VERIFY -> SHIP`, governed by
`docs/architecture/sdd-lite.md`. Use `DESIGN.md`, `TASKS.md`, `VERIFY.md`, and
repository evidence. There is no runtime state machine, trace, fingerprint,
checkpoint, recovery, rebaseline, Apply, Archive, Health, or Repository Ready.

- Design decides scope, architecture, privacy, migration, and acceptance.
- Build implements the approved Design with Luna and never Ships.
- Verify records commands, results, findings, and residual risk in `VERIFY.md`.
- Ship requires explicit `/sdd-ship` and is the only SDD Git/VCS boundary.

## Product constraints

- Academic evaluation, gamification, behaviour, and narrative remain separate.
- Behaviour must never reduce academic grades, XP evidence, or RT.
- XP is evidence for observation, not the official grade.
- Student educational data is private.
- Classroom projection exposes only explicitly safe fields through server DTOs.
- The MVP has no individual student accounts or public rankings.
- Narrative remains lightweight and classroom-practical.

## Engineering rules

- Make the smallest change that satisfies the approved Design.
- Use TDD for domain rules and calculations.
- Prefer explicit cohesive modules over generic engines.
- Preserve the approved React/Vite, Fastify, SQLite/Drizzle, cookie-session,
  TypeScript-domain, server-allowlist, Vitest, and Playwright boundaries.
- Stop only for contradictory requirements, unsafe migration, meaningful
  privacy/security exposure, major unapproved scope, unresolved essential
  failures, or unsafe Ship ambiguity.
- Do not perform Git/VCS operations outside `/sdd-ship`.

## Professional Engineering Baseline

This baseline applies to every future agent and SPEC. Apply the relevant clauses
using repository evidence; SDD level controls ceremony, not engineering quality.

- Design and test complete end-user journeys, not only isolated components.
- Keep one authoritative source for important state; do not hardcode values that
  should be configurable. Automate or document reproducible repetitive setup,
  and never let development defaults reach production.
- Test runtime UI, API, and database contracts rather than trusting TypeScript
  alone.
- Make applicable loading, empty, error, retry, disabled, editable, and
  finalized states intentional; explain useful disabled actions.
- For editable configuration, provide edit, save, cancel, and failure recovery
  where applicable.
- Where relevant, verify persistence/reload, correction/retry,
  authorization/privacy, and responsive behaviour.
- Before Ship, focused browser coverage must prove meaningful teacher
  interactions and every Classroom interaction; automate manual regression when
  practical.

Design selects applicable baseline obligations and acceptance. Build implements
them without silently weakening them. Verify records evidence for each
applicable obligation and explains why any obligation is not applicable.
