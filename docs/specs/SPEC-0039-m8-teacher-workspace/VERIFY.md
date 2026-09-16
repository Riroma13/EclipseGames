# VERIFY — SPEC-0039 M8 Teacher Workspace

**Status:** PASS WITH WARNINGS
**Verification scope:** Required Terra verification gate (`Critical Terra Verification Gate: REQUIRED`)
**Date:** 2026-09-16

## Terra decision

**PASS WITH WARNINGS.** The resolved contract is D08/D09/D14 as currently written: the registry retains SHA-256 verifiers/hashes and non-secret receipt metadata only; a same-key/same-payload request returns a `200` non-secret replay receipt, not the original bootstrap material. The first issuance alone returns the code and fragment URL. This removes the previous encrypted/recoverable replay-material blocker.

The implementation, focused runtime evidence, and privacy boundaries conform to that decision. Ship reported a documentation-hygiene warning for the now-implemented **Hash-only replay correction**. The current `TASKS.md` records that correction as checked and includes its code and focused-test evidence.

## Evidence reviewed

Read in the TASKS Read Order: current DESIGN.md Sections 2–8 (including D04–D18, threat matrix, test contract, and AC-01–AC-15), TASKS.md Expected Change Surface and all completed-slice evidence (including the hash-only replay and TTL UI corrections), and this current VERIFY.md. Inspected the current API contracts, composer, mappers, lease registry, route/server registration, game display authority, web workspace/projection/viewer paths, focused tests, and the focused built-artifact E2E specification.

Targeted privacy/configuration inspection confirms:

- `LeaseRecord` contains `tokenHash`, `codeHash`, and optional `viewerHash`; it contains no encrypted or recoverable bootstrap token, code, or URL. The current eight-test registry suite proves this negative boundary and non-secret replay receipt.
- `create()` returns secrets only on the initial `201` path. Same-key/same-payload returns `{ grantId, expiresAt, replay: true }`; a changed payload conflicts. Exchange remains single-winner and verifier/hash-based.
- Bootstrap URLs use the HashRouter fragment and `ShowStudentApp` removes the credential from browser history before the viewer read. No Show Student path uses local/session storage.
- Runtime registers the canonical game and Show Student routes; fixture routes/bootstrap and `showStudent=true` handling are absent. The dormant fixture repository/table remains only migration compatibility, not runtime authority. Targeted source inspection found no runtime registration or read of it.
- `ClassroomMode` derives its display, countdown, and polite expiry announcement from server `expiresAt`; the focused component suite covers the current correction.

No Git/VCS operation was performed. Playwright was not rerun: this correction resolves a server-side storage/replay control, and the current source/tests leave no unresolved browser-only question. The prior focused built-artifact journey remains recorded evidence, not new execution evidence.

## Commands actually run

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/projection/classroom-composer.test.ts apps/api/src/projection/lease-registry.test.ts apps/api/src/projection/routes.integration.test.ts apps/api/test/privacy/projection.test.ts` | PASS — 4 files, 20 tests. Includes hash-only replay receipt, one-time exchange, expiry/revoke/restart, throttling, exact DTO, and fixture-route privacy coverage. |
| `pnpm exec vitest run apps/web/src/game/game-api.test.ts apps/web/src/projection/ShowStudentApp.test.tsx apps/web/src/workspace/AvatarPreview.test.tsx apps/web/src/workspace/ClassroomMode.test.tsx apps/web/src/workspace/LocalQrCode.test.tsx apps/web/src/workspace/WorkspaceApp.integration.test.tsx` | PASS — 6 files, 25 tests. React test environment emitted non-fatal `act(...)` warnings. |
| `pnpm --filter @eclipse/api typecheck && pnpm --filter web typecheck` | PASS. |

Previously recorded, not rerun: `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "SPEC-0039 Slice 5 built artifact"` — PASS (1 focused built-artifact teacher/Classroom/viewer/privacy journey). Playwright remained non-default: current focused component coverage plus source inspection resolved the TTL correction and left no browser-only uncertainty.

## Design, tasks, code, and privacy comparison

| Area | Result | Evidence |
|---|---|---|
| D04–D07 composition and restricted DTOs | PASS | One batch owner call per composer port; required data fails closed, optional Energy/behaviour maps to `null`, and the Show Student mapper exposes Alert only. |
| D08–D10 lease, replay, and expiry | PASS | CSPRNG bootstrap material is hashed in the process-local registry; exact replay is non-secret; exchange writes a restricted opaque cookie and is single-use; TTL/revoke/replacement/restart fail closed. |
| D11–D17 client state and privacy | PASS | Hash credential stripping, cookie-only refresh, stale/revoke cleanup, allowlisted rendering, local QR, focus/status behavior, and expiry-derived countdown are present and focused-tested. |
| D18 runtime authority | PASS | `server.ts` registers canonical routes, `game/service.ts` composes the display overlay, and obsolete fixture runtime routes are absent. |
| Completed-task evidence | PASS | Slices 1–5 and the resolved hash-only replay correction are checked and have focused evidence in `TASKS.md`; `lease-registry.ts` and its passing test implement the correction. |

## Acceptance mapping

| Acceptance | Status | Current evidence |
|---|---|---|
| AC-01 | PASS | Existing `WorkspaceApp` remains the teacher surface; focused workspace integration tests pass. |
| AC-02 | PASS | Composer batch-port and no-domain-write tests pass. |
| AC-03 | PASS | Exact classroom allowlist and privacy integration tests pass. |
| AC-04 | PASS | Exact Show Student mapping and Alert-only behavior are covered. |
| AC-05 | PASS | Hash-only registry storage, non-secret replay receipt, fragment stripping, cookie exchange, and no-storage evidence pass. |
| AC-06 | PASS | TTL validation, fixed expiry, replacement/revoke, and restart failure coverage pass. |
| AC-07 | PASS | Projection overlay removal preserves the latest underlying scene; focused E2E evidence remains recorded. |
| AC-08 | PASS | Owner/body validation, generic failures, idempotency conflict, throttling, and concurrent exchange coverage pass. |
| AC-09 | PASS | Abort/generation and context-revocation coverage pass. |
| AC-10 | PASS | Loading, empty, retry, null Energy, zero gems, and expired/revoked states are intentionally rendered. |
| AC-11 | PASS WITH WARNING | Focused component evidence covers keyboard/focus, QR alternative, reduced motion, server-expiry-derived countdown, and retry. The current suite has non-fatal React `act(...)` environment warnings; prior built-artifact evidence is recorded. |
| AC-12 | PASS | Fixture runtime routes/bootstrap and `showStudent=true` are absent; canonical authority is registered. |
| AC-13 | PASS | No migration or prohibited account/ranking/engine/narrative scope was found in the expected surface. |
| AC-14 | PASS | Server-side allowlists and Alert-only, read-only behavior boundary pass privacy checks. |
| AC-15 | PASS | B-01 and C-01 remain explicit rollout conditions. |

## Findings and residual risk

### RESOLVED — stale task completion marker

Ship reported a stale completion marker for `TASKS.md` line 44. The current task record marks the hash-only replay correction `[x]` and records the matching implementation and focused 8-test lease-registry evidence; no code or security failure remains from that report.

### Residual risk

- The focused web suite emits non-fatal React `act(...)` environment warnings; this reduces test-output signal but did not fail any assertion.
- B-01 remains open: legacy XP is annual-only. C-01 remains open and blocks production real-student use pending retention/deletion, backup expiry, and encrypted-restic restore verification. Process-local leases remain a single-instance MVP boundary.
