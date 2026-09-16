# Tasks: SPEC-0039 M8 Teacher Workspace

## Expected Change Surface

- API: `apps/api/src/server.ts`, `game/*`, `projection/*`, plus narrow batch read ports in roster, avatar-core, XP, RT, gems, and behaviour; add explicit classroom/Show Student contracts, composer, process-local lease registry, mappers, routes, configuration, and focused tests.
- Web: `apps/web/src/workspace/*`, `projection/*`, `game/game-api.ts`, `main.tsx`, and `styles.css`; reuse `AvatarPreview`, add Classroom Mode and restricted viewer flows.
- Tests: `apps/api/test/privacy/projection.test.ts` and focused API/domain tests; `apps/web/src/**` focused component/integration tests and `apps/web/e2e/teacher-workspace.spec.ts` (built-artifact browser evidence before Ship).
- Remove fixture projection bootstrap/routes and `showStudent=true` runtime handling; retain migration `0002` and dormant table. No migration is expected; QR dependency/lock changes are optional only if local and network-free.

## Read Order

1. `DESIGN.md` Sections 2–8, especially D04–D18, threat matrix, test contract, and AC-01–AC-15.
2. `apps/api/src/server.ts`, `projection/routes.ts`, `projection/mapper.ts`, `game/service.ts`, and `game/routes.ts`.
3. Existing owner modules and ports: `roster/*`, `avatar-core/*`, `xp/*`, `rt/*`, `gems/*`, `behaviour/*`, plus `apps/api/src/auth/routes.ts` and HTTP errors.
4. `apps/web/src/main.tsx`, `workspace/WorkspaceApp.tsx`, `workspace/workspace-api.ts`, `projection/ProjectionApp.tsx`, `workspace/AvatarPreview.tsx`, and existing focused tests/E2E.

## Bounded Implementation Slices

### Slice 1 — Contracts and canonical composition

- [x] Define exact `ClassroomStudentDto`, `ShowStudentDto`, display scene types, owner batch ports, and server allowlist mappers; implement one-request/one-batch classroom composer with required/optional failure policy and Alert-only mapping.
- [x] RED/GREEN tests: key allowlists, join ordering, missing Energy/behaviour, required failure, ~30-student batch-call counts, and no domain writes. Evidence: focused API unit tests.

### Slice 1 result

- Implemented shared exact DTO and display-scene contracts in `packages/contracts/src/index.ts`.
- Added server-side allowlist mappers and an injectable composer that calls each owner batch port once, preserves roster order, fails closed for missing/failed required data, and maps optional Energy/behaviour failures to `null`.
- Focused evidence: `pnpm exec vitest run apps/api/src/projection/classroom-composer.test.ts` — 1 file, 4 tests passed; `pnpm --filter @eclipse/api typecheck` — passed.
- No domain writes are performed by the composer; Slice 2 lease security and all later slices remain pending.

### Slice 2 — Lease security model (RED before GREEN)

- [x] RED tests first for guessed/replayed/cross-lease secrets, >=128-bit CSPRNG opaque credentials, >=64-bit CSPRNG bootstrap codes, concurrent exchange, clock boundaries, replacement/revoke events, server-side grant/cookie binding validation, restart, 5-per-client/session and 20-per-teacher/grant rolling-10-minute code throttles with 429, fingerprint replay/conflict, and 30–300-second configuration validation.
- [x] Implemented process-local hashed grant registry, encrypted-at-rest replay material, deterministic idempotent create replay, one-time atomic bootstrap exchange, opaque HttpOnly/Secure-in-production/SameSite=Strict viewer cookie with restricted path and TTL-aligned Max-Age, server-authoritative binding/revocation, bounded throttling, and fail-closed restart semantics. Evidence: `pnpm exec vitest run apps/api/src/projection/lease-registry.test.ts` — 1 file, 6 tests passed; `pnpm --filter @eclipse/api typecheck` — passed.

### Slice 2 result

- Added `apps/api/src/projection/lease-registry.ts` with CSPRNG credentials, SHA-256 verifier storage, process-local encrypted replay material, atomic one-time exchange, binding checks, revocation/replacement/restart handling, rolling-window throttling, cookie policy, and TTL validation.
- Added RED-before-GREEN focused coverage in `apps/api/src/projection/lease-registry.test.ts`.
- Slice 3 API/runtime registration and all later slices remain pending.

### Hash-only replay correction

- [x] Remove encrypted or otherwise recoverable `accessToken`, `accessCode`, and token-bearing `accessUrl` material from the lease registry. Preserve same-key/same-payload idempotency without duplicate mutation by returning an explicit non-secret `200` replay receipt; return `409` for same-key/different-payload without bootstrap secrets. A new idempotency key intentionally creates a replacement grant and returns newly generated bootstrap secrets once. Add focused negative tests proving lost bootstrap secrets cannot be recovered or replayed, while same-key replay does not create a second grant and exchange remains single-use.

#### Hash-only replay correction result

- Implemented in `apps/api/src/projection/lease-registry.ts`: records retain only token/code hashes, same-key replay returns `{ grantId, expiresAt, replay: true }`, and conflicting payloads return `409` without secrets.
- Focused evidence: `pnpm exec vitest run apps/api/src/projection/lease-registry.test.ts` — 1 file, 8 tests passed.

### Slice 3 — API and runtime authority

- [x] Add classroom-card, create/revoke, exchange, viewer, and teacher display-control routes with owner-as-404, exact status/body validation, no-store headers, redacted logs, and lineage/archive checks; extend `game/service.ts` display precedence/fallback.
- [x] Remove fixture registration/bootstrap and `showStudent=true`; add integration/privacy tests for 401/404/409/422/429, exact DTOs, refresh/no extension, concurrency, dormant-table unread, and route absence.

### Slice 3 result

- Canonical API/runtime authority is registered through game and Show Student routes; fixture projection routes/bootstrap remain absent and the dormant `projection_students` table is not read.
- Added API-wide `no-store`/`no-referrer` response headers, UUID-v4 revoke idempotency validation, exact restricted DTO paths, owner/academic-year/student lineage checks, archive invalidation, and batch gem reads (no per-card gem query loop).
- Focused evidence: `pnpm exec vitest run apps/api/src/projection/routes.integration.test.ts apps/api/test/privacy/projection.test.ts` — 2 files, 7 tests passed; `pnpm --filter @eclipse/api typecheck` — passed.
- Slice 4 UI work and Slice 5 acceptance evidence remain pending.

### Slice 3 correction result

- Targeted correction: removed teacher-session authentication from Show Student exchange; exchange now accepts only the opaque token/code and resolves owner/session authority from the server-side lease. Viewer reads remain cookie-only and validate the stored grant/version before composing the restricted DTO. Focused integration coverage proves unauthenticated exchange, exact credential bodies, cookie-only revoked access, and no identifier broadening. Slice 3 remains incomplete pending the broader API/runtime authority requirements above.

### Slice 4 — Workspace, projection, and viewer UI

- [x] Extend `game-api.ts`, `WorkspaceApp`, and shared components for Classroom Mode, create/copy/code/QR, disabled/empty/loading/error/retry states, stale abort guards, focus/live-region/accessibility, responsive display, and `/show-student` exchange/expiry/revoke/resume-latest-scene behavior.
- [x] Evidence: focused web component/integration tests covering context races, URL stripping, keyboard/focus, reduced motion, and safe-field/negative-field rendering.

### Slice 4 result

- Added canonical web client methods for classroom cards and Show Student create/revoke/exchange/viewer flows, including correct 204 handling and abort signals.
- Added Classroom Mode to the existing workspace with server-allowlisted cards, shared `AvatarPreview`, disabled/empty/loading/error/retry states, local copy/QR text alternative, temporary lease feedback, focus restoration/trapping, and responsive/reduced-motion styles.
- Added `/show-student` hash exchange/viewer with immediate credential stripping, expiry focus/status handling, safe fields only, and projection Show Student overlay that yields to the latest canonical scene after removal.
- Focused evidence: `pnpm exec vitest run apps/web/src/game/game-api.test.ts apps/web/src/projection/ShowStudentApp.test.tsx apps/web/src/workspace/AvatarPreview.test.tsx apps/web/src/workspace/WorkspaceApp.integration.test.tsx` — 4 files, 12 tests passed; `pnpm --filter web typecheck` — passed. No Playwright or full Verify run.
- Slice 5 acceptance evidence remains pending.

### Slice 5 — Acceptance evidence

- [x] Update `teacher-workspace.spec.ts` with built-artifact teacher/Classroom/viewer journey, refresh, replacement, revoke, expiry, latest-scene fallback, and DOM/network/URL/storage privacy assertions; record rollout conditions B-01/C-01 for Verify.

### Slice 5 result

- Added the focused built-artifact journey and privacy assertions to `apps/web/e2e/teacher-workspace.spec.ts`, including canonical context/student selection, Classroom Mode, URL/QR-equivalent access, viewer refresh, replacement, revoke, expiry response, latest-scene fallback, and DOM/network/document URL/storage checks.
- Targeted Playwright evidence: `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "SPEC-0039 Slice 5 built artifact"` — 1 test passed; final fallback asserts only that the Show Student subtree is cleared while the Projection IDLE heading and safe roster remain visible.
- B-01 remains open: annual-only legacy XP stays annual-only and M8 consumes only authoritative term/session identity. C-01 remains open: production use remains blocked pending retention/deletion, backup expiry, and encrypted-restic restore verification.

## Critical Terra Verification Gate

**REQUIRED** — Level C design explicitly requires targeted Terra review before Build because M8 replaces a projection privacy authority and introduces unauthenticated, time-bounded student-data access. Build must not begin until this gate is satisfied.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

## Terra correction result

- TTL UI correction applied in `ClassroomMode.tsx`: display, countdown, and polite expiry announcements derive from the server `expiresAt`, including configured 30–300 second leases; focused web tests and web typecheck pass.
- Lease privacy correction resolved in `apps/api/src/projection/lease-registry.ts`: verifier/hash-only registry storage is paired with an explicit non-secret idempotent replay receipt, preserving the hash-only privacy boundary. Focused evidence: `pnpm exec vitest run apps/api/src/projection/lease-registry.test.ts` — 1 file, 8 tests passed.
