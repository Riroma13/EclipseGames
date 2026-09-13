# SPEC-0031 — Implementation Tasks

Plain implementation plan for the approved Design. Tasks are not lifecycle
state and are not an allowlist.

## Slice 1 — bounded SDD Lite control plane

This is one bounded incomplete task slice.

Correction pass scope:

- [x] Add explicit non-Ship Git/GitHub mutation denial to the orchestrator,
      preserving read-only inspection, destructive denies, and the Ship-only
      allowlist; add static governance coverage.
- [x] Add a prompt-level two-failure circuit breaker with the exact report
      fields, root-cause gate, and no third repetition/runtime tracking; add
      static governance coverage.
- [x] Make default `/sdd-verify` Luna and require either the exact
      `Critical Terra Verification Gate: REQUIRED` task line or explicit
      maintainer Terra request for Terra Verify; add static governance coverage.

- [x] Update `AGENTS.md`, `docs/SDD-WORKFLOW.md`, and
      `docs/architecture/sdd-lite.md` for bounded context, one-slice Resume,
      targeted Terra, and the Ship-only Git/VCS boundary.
- [x] Refine the four public command prompts and the existing `sdd-lite-*`
      agents without adding commands, phases, child delegation, or runtime
      state.
- [x] Apply only supported OpenCode permission syntax: global `doom_loop` deny,
      existing destructive Bash denies, non-Ship Git/GitHub denies, and the
      existing narrow Ship allowlist.
- [x] Extend `scripts/sdd-lite.test.mjs` with governance assertions for the
      contract, including Expected Change Surface flexibility and no default
      Playwright/product validation.
- [x] Run focused governance/config validation and record evidence in
      `VERIFY.md`.

This correction pass does not change product code, SPEC-0030, or the approved
Design; it only closes the three bounded control-plane policy defects above.

## Expected Change Surface

| Area | Expected files | Notes |
|---|---|---|
| Authority | `AGENTS.md`, `docs/SDD-WORKFLOW.md`, `docs/architecture/sdd-lite.md` | Documentation-only control-plane wording. |
| Commands | `.opencode/commands/sdd-{start,resume,verify,ship}.md` | Four public entry points only. |
| Agents | `.opencode/agents/sdd-lite-*.md` | Existing agents only; no nested child agents. |
| Permissions | `opencode.json` | Supported `doom_loop` and existing Bash patterns only. |
| Tests | `scripts/sdd-lite.test.mjs`, root `package.json` only if needed | Focused static governance test; no product or Playwright tests. |
| SPEC evidence | This `TASKS.md`, `VERIFY.md` | Standard SPEC-0031 artifacts. |

Expected Change Surface is a review forecast, not an allowlist. Luna may add a
necessary in-scope control-plane file and update this surface with the reason.
Product code, SPEC-0030, `.ai/context`, migrations, runtime
state, and Playwright fixtures are outside this change.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `pnpm test:sdd-lite` — recorded in `VERIFY.md`. |
| Runtime harness | N/A — no runtime/application boundary; `opencode debug config` validates installed permission resolution. |
| Rollback boundary | Revert only the files listed in Expected Change Surface; no product behavior or data changes. |

## Correction pass evidence

- Critical Terra Verification Gate: NOT REQUIRED for this bootstrap maintenance
  task; default verification remains Luna.
- No runtime tracking framework, attempt counter, checkpoint, lifecycle marker,
  or repeated Playwright execution is authorized or introduced.
