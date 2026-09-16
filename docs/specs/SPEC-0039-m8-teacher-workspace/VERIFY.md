# VERIFY — SPEC-0039 M8 Teacher Workspace

**Status:** PASS (non-blocking warnings)  
**Verification scope:** Explicit Terra gate (`Critical Terra Verification Gate: REQUIRED`)  
**Date:** 2026-09-16

## Decision

**Ready for `/sdd-ship` verification.** The prior essential D07 privacy defect is corrected: restricted Show Student behaviour is now `{state:'ALERT'}` only, and `NORMAL`, `VIGILANCE`, and `RED_CODE` map to `null`. No bounded Luna correction is required. This verification does not Ship.

## Bounded review record

Reviewed in the required order: active `DESIGN.md`, `TASKS.md`, prior `VERIFY.md`, TASKS Read Order, Expected Change Surface, and completed-slice evidence; then `server.ts`, projection/game routes and services, canonical composer, lease registry, owner-bound database ports, auth/session handling, shared contracts, workspace/projection/viewer paths, and focused API/web tests.

Confirmed current controls:

- D07 is enforced by `toAlertOnlyBehaviour()` and negative runtime unit cases cover `NORMAL`, `VIGILANCE`, and `RED_CODE`.
- Classroom-card and Show Student reads await `composeClassroomCards()` through `createClassroomCompositionPorts()`; required data fails closed and optional Energy/behaviour becomes `null`.
- Lease reads validate the issuing teacher session, so logout/expiry revokes viewer access. Replacement, explicit close, context change, and unmount revoke the active grant; close failure preserves a retryable teacher state.
- `LocalQrCode` uses the local `qrcode` package to render SVG; no QR network path exists.
- The legacy projection repository/table remains only dormant migration compatibility code: it has no runtime import or registered fixture route. `showStudent=true` has no runtime handling.
- No M8 schema migration or excluded account, ranking, persistent history, entitlement, narrative, websocket, or generic-engine facility was found in the bounded surface.

Playwright was not rerun. The recorded one-test built-artifact journey remains applicable to browser-only questions; the only prior blocker was server mapper behaviour and is now covered by the targeted runtime test. No unresolved browser question justified another Playwright run.

## Commands actually run

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/projection/classroom-composer.test.ts apps/api/src/projection/lease-registry.test.ts apps/api/src/projection/routes.integration.test.ts apps/api/test/privacy/projection.test.ts` | PASS — 4 files, 20 tests. Covers D07 Alert-only mapping, allowlist/DTO boundaries, batch composition, lease expiry/replacement/revoke/throttling, session invalidation, owner/body/idempotency validation, and absent fixture route. |
| `pnpm exec vitest run apps/web/src/game/game-api.test.ts apps/web/src/projection/ShowStudentApp.test.tsx apps/web/src/workspace/AvatarPreview.test.tsx apps/web/src/workspace/ClassroomMode.test.tsx apps/web/src/workspace/LocalQrCode.test.tsx apps/web/src/workspace/WorkspaceApp.integration.test.tsx` | PASS — 6 files, 24 tests. Covers URL stripping, cookie refresh, safe rendering, context revocation/close/unmount retry, local QR, avatar reuse, and workspace context race handling. Test environment emitted non-fatal React `act(...)` warnings. |
| `pnpm --filter @eclipse/api typecheck && pnpm --filter web typecheck && pnpm --filter web build` | PASS — both typechecks and Vite production build. Build warned about duplicate `qrcode` and `@types/qrcode` keys in `apps/web/package.json`. |

Previously recorded, not rerun:

| Command | Result and relevance |
|---|---|
| `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "SPEC-0039 Slice 5 built artifact"` | PASS — one focused built-artifact journey: teacher workspace/Classroom Mode/viewer, URL/QR equivalent, refresh, replacement, revoke, expiry, latest-scene fallback, and DOM/network/URL/storage privacy assertions. |

## Acceptance mapping

| Acceptance | Status | Current evidence |
|---|---|---|
| AC-01 | PASS | `/#/workspace` remains the only teacher workspace; `WorkspaceApp` preserves existing M1–M7 owners and focused integration/browser evidence covers canonical navigation. |
| AC-02 | PASS | Composer uses one batch call per owner port, ordered in-memory join, required-failure policy, and no-write 30-student coverage. |
| AC-03 | PASS | Server-built classroom DTO is exact D05; privacy tests assert safe gameplay fields and negative private values. |
| AC-04 | PASS | `classroom-mapper.ts` maps only `ALERT`; current test proves all three prohibited states become `null`. |
| AC-05 | PASS | CSPRNG/hash registry, one-time exchange, HttpOnly scoped cookie, hash URL stripping, no storage, local SVG QR, and redacted API logging are present and covered. |
| AC-06 | PASS | Validated 30–300-second TTL, non-extending refresh, replacement/revoke, teacher logout/session expiry, and restart fail-closed are covered. |
| AC-07 | PASS | Projection overlay is removable on expiry/revoke and derives the latest underlying scene; focused browser evidence covers fallback. |
| AC-08 | PASS | Owner-as-404, exact schemas, generic lease failures, idempotency conflict, one-winner exchange, throttle buckets, lineage/archive checks, and stale cookie denial are covered. |
| AC-09 | PASS | Abort/generation guards clear stale cards, selection, lease material, and revoke invalid context; focused tests cover group/year changes. |
| AC-10 | PASS | Intentional loading, empty, null Energy, zero gems, no badges, retry, disabled, expired/revoked, disconnected, and sign-in states are implemented and focused tests cover the applicable paths. |
| AC-11 | PASS | Focus management/trapping/restoration, polite status, QR alternative, reduced-motion styling, tablet coverage, reload, and retry have focused tests; recorded built-artifact evidence covers the focused classroom journey. |
| AC-12 | PASS | Fixture route is absent; fixture repository is unimported by runtime; canonical game service plus composer own display composition. |
| AC-13 | PASS | No M8 migration or prohibited domain/account/ranking/history/websocket/engine/entitlement/narrative addition found. |
| AC-14 | PASS | Behaviour is read only to derive a qualitative state and D07 exports Alert only; no academic, XP, or RT writes occur in M8 paths. |
| AC-15 | PASS | B-01 and C-01 remain explicit in `DESIGN.md` and completed-task evidence. |

## Findings and residual risk

No essential defect remains in the verified bounded surface.

- **Non-blocking configuration hygiene:** Vite reports duplicate `qrcode` and `@types/qrcode` keys in `apps/web/package.json`; JSON last-key-wins behavior did not affect the build or local QR test. Remove duplicates in a separately bounded cleanup.
- **Non-blocking test hygiene:** focused happy-dom tests emit React `act(...)` environment warnings while passing. They do not indicate a failed assertion but should be resolved to improve signal quality.
- **Rollout conditions:** B-01 remains open (legacy XP remains annual-only). C-01 remains open and blocks production real-student use pending retention/deletion, backup-expiry, and encrypted-restic restore verification. Process-local leases remain intentionally single-instance MVP scope.

## Terra verdict

**PASS.** All AC-01–AC-15 are satisfied by current code, focused runtime evidence, and applicable prior built-artifact evidence. The SPEC is ready for explicit `/sdd-ship`; this pass performed no Git/VCS operation and did not Ship.
