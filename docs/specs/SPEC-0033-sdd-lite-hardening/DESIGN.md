# SPEC-0033 — SDD Lite Hardening Design

## Contract

Harden the existing SDD Lite control plane only. Ship may inspect and perform
its existing authorized Git/VCS handoff, but is read-only with respect to work
content. It must never edit `DESIGN.md`, `TASKS.md`, `VERIFY.md`, implementation,
tests, configuration, or candidate documentation. Stale, contradictory,
incomplete, or failing evidence produces a bounded correction-required report
and stops; Ship never silently corrects content.

Ship PR bodies must preserve literal Markdown. Create or edit non-trivial bodies
through literal-safe temporary files under `/tmp`, pass them with
`--body-file`, clean them up, and never stage them. Do not prescribe an
interpolated non-trivial Markdown string through `--body`.

Verify begins with the active SPEC `DESIGN.md`, `TASKS.md`, current `VERIFY.md`
when present, the TASKS Read Order, and only directly named Expected Change
Surface and completed-task evidence. It may expand narrowly only for an
explicit unresolved question. Broad scans are not default; genuine
privacy/data-integrity/security/migration/integration risk remains a valid
reason for targeted expansion.

## Scope and acceptance

Only existing SDD Lite command/agent documentation and the focused governance
test are affected, plus these three SPEC artifacts. No product runtime,
database, or user-facing behavior changes. Existing exact routing, model
defaults, permissions, and Ship-only Git/VCS boundary remain authoritative.

- Ship immutability and correction-required stopping are explicit.
- PR body handling requires `/tmp`, `--body-file`, cleanup, and literal Markdown
  preservation without staging.
- Verify has the prescribed read order and targeted expansion discipline.
- `scripts/sdd-lite.test.mjs` cheaply asserts all new requirements and preserved
  invariants without invoking expensive agents.
- Focused validation is `pnpm test:sdd-lite` only.

## Simplicity check

Prompt/config wording plus static assertions are sufficient. No runtime state,
new phase, command, permission family, parser, or product abstraction is
needed.
