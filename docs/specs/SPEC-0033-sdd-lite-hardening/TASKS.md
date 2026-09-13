# SPEC-0033 — Implementation Tasks

Plain implementation plan for the approved Design; tasks are not lifecycle
state and are not an allowlist.

## Tasks

- [x] Mark the current-task-only circuit-breaker guidance in the Verify command
      and Luna agent authority sources; keep historical `VERIFY.md` failures as
      evidence only and prohibit runtime counters/state machinery.
- [x] Extend `scripts/sdd-lite.test.mjs` with marker and structural assertions
       for current-task semantics, excluding circuit-breaker policy from
       `VERIFY.md` while preserving the absent runtime machinery check.
- [x] Correct Ship Verify freshness to be candidate-scoped: reuse successful
      matching evidence unless material candidate change or contradiction makes
      it stale; green Ship preflight must not force a Verify rewrite or loop.
- [x] Clean the incorrect SPEC-0033 `VERIFY.md` BLOCKED verdict and duplicate
      text while preserving historical failed-test evidence and recording the
      need for fresh runtime verification.
- [x] Run `pnpm test:sdd-lite` once in the coordinator's fresh bounded
       verification task and record its exact result in `VERIFY.md`.

## Expected Change Surface

The maintainer-approved user instructions require these exact constraints:

- Implement SPEC-0033 exactly as specified by the maintainer-approved user
  instructions in this task.
- Use only Luna work; do not invoke or simulate Sol, Terra, Explore, Engram,
  Playwright, Ship, or Git/VCS mutation.
- Create concise artifacts:
  - `docs/specs/SPEC-0033-sdd-lite-hardening/DESIGN.md`
  - `TASKS.md`
  - `VERIFY.md`
- Do not create other artifact types.
- Do not touch product code, SPEC-0030/M4, global OpenCode configuration, or
  broaden SDD Lite architecture.
- Do not commit.
- Do not touch product code, SPEC-0030/M4, global OpenCode configuration, or
  broaden SDD Lite architecture.
- Extend `scripts/sdd-lite.test.mjs` with cheap governance assertions; do not
  create tests invoking expensive agents.
- Run only the focused SDD Lite governance/config check needed, preferably
  `pnpm test:sdd-lite`; no product tests, Playwright, Terra, Sol, Engram, Ship,
  or Git/VCS.

Expected implementation surface: the SPEC-0033 `DESIGN.md`, `TASKS.md`, and
`VERIFY.md`; `.opencode/commands/sdd-ship.md`,
`.opencode/commands/sdd-verify.md`; `.opencode/agents/sdd-lite-ship.md`,
`.opencode/agents/sdd-lite-verify-luna.md`; and
`scripts/sdd-lite.test.mjs`. These are constraints, not permission to broaden
scope.

## Critical Terra Verification Gate: NOT REQUIRED

## Evidence plan

Focused static governance validation only. No runtime harness applies because
this is command/agent configuration and documentation; rollback is limited to
the files above.
