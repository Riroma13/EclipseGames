# SPEC-0023 — Professional Engineering Baseline

## Design

**Level B — Sol Design → Luna Build → Luna Verify.** This change establishes repository governance documentation and one bounded static regression check. It changes no runtime, persistence, API, UI, authorization, privacy, migration, or product-domain boundary. Terra review is not justified; reclassify Level C only if Build discovers a required sensitive, architectural, migration, or significant cross-domain change.

## Behaviour

Root `AGENTS.md` gains a concise **Professional Engineering Baseline** that applies to every future agent and SPEC:

- Design and test real end-user journeys, not isolated components; use the smallest complete solution because SDD level controls ceremony, not quality.
- Do not accidentally hardcode configurable values. Keep one authoritative source for important state and automate or document reproducible repetitive development setup; development defaults must never leak into production.
- Test runtime UI/API/database contracts instead of trusting TypeScript alone.
- Make loading, empty, error, retry, disabled, editable, and finalized states intentional where applicable; explain useful disabled actions.
- Editable configuration provides edit, save, cancel, and failure recovery where applicable.
- User-facing work verifies persistence/reload, correction/retry, authorization/privacy, and responsive behaviour when relevant.
- Before Ship, focused browser coverage proves meaningful teacher interactions and every Classroom interaction. A manual regression receives automated coverage when practical.

Applicability is evidence-driven: a Design identifies relevant clauses and acceptance; Build implements them without silently weakening them; Verify records runtime evidence for each applicable clause and states why any clause is not applicable. This baseline does not turn every change into full-stack or browser work when no affected journey or boundary exists.

## Scope in and out

**In:** add the canonical baseline to `AGENTS.md`; add short stage-applicability cross-references to both SDD Lite guides; extend the existing static SDD Lite test only enough to protect canonical ownership and those references.

**Out:** application code, runtime hooks, product behaviour, schemas, APIs, UI, dependencies, agent/command routing, level definitions, Ship permissions, context/decision files, templates, historical SPECs, and any new phase, approval gate, state machine, trace, fingerprint, checkpoint, recovery, parser gate, or implementation hook. Stale `START-OPENCODE-PROMPT.md` remains explicitly out of scope: it is historical bootstrap guidance, not current SDD routing, and correcting it would broaden this change without helping baseline enforcement.

## Ownership and precedence

| Authority | Contract |
|---|---|
| Root `AGENTS.md` | Sole owner of the full Professional Engineering Baseline. Existing product, privacy, stack, stop, and Git/VCS invariants remain unchanged. |
| `docs/architecture/sdd-lite.md` | Detailed SDD Lite contract; cross-references `AGENTS.md` and states Design/Build/Verify applicability without copying the baseline. |
| `docs/SDD-WORKFLOW.md` | Concise operational authority; carries the same short cross-reference, not a second baseline. |
| Each future `DESIGN.md` | Selects applicable baseline obligations using repository evidence; it may refine feature-specific acceptance but cannot redefine the baseline. |

If wording conflicts, `AGENTS.md` governs baseline engineering practice; the SDD Lite documents continue to govern workflow and routing. Existing product authority and server-side privacy allowlists retain their current precedence.

## Data, API, UI, privacy, and failure boundaries

There are no data, schema, migration, API, DTO, UI, auth, deployment, or runtime effects. No student data is read or exposed. Existing domain separation, teacher-private access, projection allowlists, C-01, Level C routing, and Ship-only Git/VCS boundaries remain intact. Documentation drift fails only the opt-in static test; it must not block or alter application runtime.

## Tests and acceptance

Extend `scripts/sdd-lite.test.mjs` with one small static governance test. It must assert that `AGENTS.md` owns the named baseline and that both SDD Lite guides reference that canonical baseline plus Design/Build/Verify applicability. It must not parse every clause, inspect runtime code, create lifecycle state, or become a hook. The existing `pnpm test:sdd-lite` command remains the only entry point.

Acceptance requires: every stated baseline obligation is present once in canonical `AGENTS.md`; both guides cross-reference rather than duplicate it; stage responsibilities are explicit; current workflow, levels, Terra routing, privacy/product invariants, and Git restrictions are unchanged; the static suite passes; and only the four files below are changed during Build.

## Rollout

No migration, backfill, flag, dependency, deployment step, or phased rollout. Land `AGENTS.md`, `docs/architecture/sdd-lite.md`, `docs/SDD-WORKFLOW.md`, and `scripts/sdd-lite.test.mjs` together. Future work applies the baseline from its next Design onward. Rollback removes these documentation additions and the matching static assertion without runtime impact.

**Threat matrix:** N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes.

## Simplicity Check

One canonical checklist, two short cross-references, and one existing-suite assertion establish durable guidance without duplicated policy or workflow machinery. The check protects ownership and applicability only; human semantic review remains responsible for engineering quality.
