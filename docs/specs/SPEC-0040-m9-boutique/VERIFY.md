# SPEC-0040 Slice 5 Verification

**Verifier:** Direct bounded recovery
**Scope:** Slice 5 — teacher workspace journey only
**Terra:** Not run. `TASKS.md` explicitly declares `Critical Terra Verification Gate: NOT REQUIRED`.
**Playwright:** Not run. No unresolved browser-only question remained; built-artifact Playwright is planned before Ship.

## Read-order evidence

Read in the required order:

1. `DESIGN.md`, including D16, D22–D24, and AC-08–AC-10.
2. `TASKS.md`, including the Expected Change Surface, completed Slice 5 tasks, and Terra gate.
3. Existing `VERIFY.md`, including the prior bounded correction finding.
4. `AvatarWorkflow.tsx` and `AvatarWorkflow.test.tsx` as the directly relevant correction surface.

## Commands and results

All commands were run from the repository root. No Git/VCS commands were run.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts apps/web/src/workspace/AvatarWorkflow.test.tsx apps/web/src/workspace/StudentPanel.failure-isolation.test.tsx` | **PASS**, exit 0; 3 files, **30 tests passed**. |
| `pnpm --filter @eclipse/web typecheck` | **PASS**, exit 0. |
| `pnpm --filter @eclipse/web build` | **PASS**, exit 0; Vite produced the web bundle. |

## Slice 5 implementation comparison

| Contract/task area | Evidence | Result |
|---|---|---|
| D22 owned-item state | `AvatarWorkflow.tsx:121`; owned items render visible `Comprado` | PASS |
| D16 purchase/equip separation | `AvatarWorkflow.tsx:87–110`; purchase refreshes boutique without `saveAvatar`; `equip` separately calls `saveAvatar` | PASS |
| D22 equipped state | `AvatarWorkflow.tsx:121`; equipped items retain `Equipado` while the separate action remains absent/disabled | PASS |
| Locked state | `AvatarWorkflow.test.tsx:266–279`; level-locked item shows requirement and disabled purchase | PASS |
| Insufficient-funds and policy states | `AvatarWorkflow.test.tsx:281–297`; typed failures map to required Spanish messages | PASS |
| Retry/isolation/read-only | `AvatarWorkflow.tsx:32–50, 87–100, 114–121`; focused tests cover same-key retry, stale response suppression, loading recovery, and disabled read-only actions | PASS |
| Privacy boundary | Scoped student/year client routes and no private boutique audit fields in rendered UI; server allowlists remain covered by prior slices | PASS for Slice 5 client surface |

## Acceptance coverage

- **D22 / AC-09:** PASS for the bounded Slice 5 surface. Focused runtime evidence covers `Comprado`, separate `Equipar`, `Equipado`, locked, insufficient-funds, policy-blocked, retry, isolation, and read-only behavior.
- **AC-08:** No contrary change found; purchase and equip remain separate explicit actions.
- Other acceptance criteria are outside this Slice 5 verification scope and remain dependent on evidence from their respective slices.

## Findings and residual risk

- The prior `Comprado` correction is present and its focused assertions pass.
- Playwright was not run; responsive, focus, and live-region behavior remain source/focused-test evidence until Ship verification.
- The web build emits existing duplicate `qrcode` and `@types/qrcode` package-key warnings; unrelated and intentionally unchanged.
- Server-side entitlement, persistence, transaction atomicity, projection allowlists, and privacy enforcement are outside this Slice 5-only run.

## Verdict

**PASS WITH WARNINGS — Slice 5 final bounded evidence is green.**
