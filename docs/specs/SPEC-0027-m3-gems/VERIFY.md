# SPEC-0027 Build Evidence

This is Build evidence only; final Terra Verify has not been performed.

## Commands

| Command | Result |
|---|---|
| `pnpm typecheck` | PASS; web and API TypeScript checks completed. |
| `pnpm exec vitest run packages/domain/test/xp.test.ts apps/api/src/xp/repository.test.ts apps/api/src/rt/service.test.ts apps/web/src/workspace/demo-presentation.test.ts apps/api/test/integration/migrations.test.ts` | PASS; 5 files, 21 tests. |
| `pnpm build` | PASS; Vite production web build and API TypeScript build completed. |

## Current Build slice evidence — private action state and built application journey

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 4 files, 15 tests. Covers manual/result gem mutation lineage, tuple action-state null/ACTIVE/REVERSED mapping, authenticated ownership/status/privacy/closed DTO behavior, exact query construction, and retained idempotency keys. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed. |
| `pnpm build` | PASS; built React/Vite application and API TypeScript build completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | NOT PASSING; 2 attempts using automatic `webServer.env` key injection reached the built Fastify app and completed the ACTIVE/REVERSED journey, then failed at the archived-year assertion because the app rehydrated the still-selected active year. The test now navigates explicitly to the archived year/student tuple; no third attempt was run. |

## Latest Build correction evidence

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 1 file, 8 tests. Covers archived assessment-context readability, tuple query construction, and supplied idempotency-key reuse. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed after the harness, archived-context, and key-scope changes. |
| `pnpm build` | PASS; production web/API builds completed after the same changes. |

The focused Playwright journey was attempted exactly twice in this Build
correction slice. Both attempts used automatic `webServer.env.GEM_CURSOR_KEYS`;
neither used a manual environment prefix or manual process termination. A
third run is intentionally deferred to Terra Verify after the explicit
archived-tuple navigation correction.

## Latest Build slice evidence — obsolete legacy coin test cleanup

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/test/integration/game-master-content.test.ts apps/api/test/integration/coins-readonly.test.ts apps/api/test/integration/coins-reconciliation-readonly.test.ts --reporter=dot` | PASS; 3 files, 14 tests. The mixed game-master fixture retains the explicit legacy coin mutation `404` assertions; the three authenticated legacy read contracts remain covered by the read-only suites. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed. |
| `pnpm build` | PASS; production web/API builds completed. |

## Current Build slice evidence — legacy coin cleanup and gem route privacy

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/test/integration/gems-routes.test.ts apps/api/test/integration/coins-readonly.test.ts apps/api/test/integration/coins-reconciliation-readonly.test.ts apps/api/test/privacy/gems-dto.test.ts --reporter=dot` | PASS; 4 files, 4 tests. Real Fastify/SQLite coverage proves gem ownership, 401/404/422/409 contracts, closed balance/ledger/catalogue DTOs, invalid cursor responses, old coin advantage rejection, and unchanged legacy coin tables. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed after removing mutation-era workspace API types/helpers. |
| `pnpm build` | PASS; production web/API builds completed. |

## Latest startup rollback evidence

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/test/integration/startup-reconciliation.test.ts --reporter=dot` | PASS; 1 real SQLite integration test proves failure after the first of two RT baseline receipts rolls back XP completion/catch-up transitions and unlocks, XP/RT receipts, gem movements/allocations/redemptions, XP cursor, and RT CAS/consumption fields. The failed `createServer` returns no app/routes; a clean retry completes startup and serves `/health`. |
| `pnpm exec vitest run apps/api/test/integration/startup-reconciliation.test.ts apps/api/src/xp/level-grant-transition-port.test.ts apps/api/src/rt/service.test.ts apps/api/test/integration/transactions.test.ts --reporter=dot` | PASS; 4 files, 15 tests. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed after the startup rollback coverage and RT baseline alias correction. |
| `pnpm build` | PASS; production web/API builds completed after the startup rollback coverage and RT baseline alias correction. |

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/gems/service.test.ts --reporter=dot` | PASS; 1 real SQLite file, 3 tests. XP receipt lineage still passes, and result reward grant/spend/correction proves exact source-family identities, full redemption refund before correction, immutable released allocations, reversed redemption state, and exact correction replay. |
| `pnpm exec vitest run apps/api/src/gems/service.test.ts apps/api/src/rt/service.test.ts apps/api/src/xp/level-grant-transition-port.test.ts --reporter=dot` | PASS; 3 files, 14 tests. XP and RT source-boundary regressions remain green alongside the gem-domain slice. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed after gem lineage validation changes. |
| `pnpm build` | PASS; production web/API builds completed after gem lineage validation changes. |

## Current Build slice evidence

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/xp/level-grant-transition-port.test.ts apps/api/src/gems/service.test.ts apps/api/src/rt/service.test.ts apps/api/test/integration/transactions.test.ts --reporter=dot` | PASS; 4 files, 15 tests. Real SQLite coverage includes historical 174/175/>175 completion, inert rerun, startup XP catch-up/terminal probe, malformed lineage rejection, gem source behavior, RT revision behavior, and transaction-token tests. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed after startup reconciliation wiring. |
| `pnpm build` | PASS; production web and API builds completed after startup reconciliation wiring. |
| `pnpm exec vitest run apps/api/test/integration/xp-routes.test.ts apps/api/src/rt/routes.integration.test.ts apps/api/test/integration/transactions.test.ts --reporter=dot` | PASS; 2 files, 3 tests, including server route registration with the pre-readiness reconciliation path. |
| `pnpm exec vitest run apps/api/test/integration/migrations.test.ts --reporter=dot` | PASS; 1 file, 6 tests. Added exact effective-0012 XP metadata/data preflight, complete gem postflight, every named-stage injection, and snapshot rollback coverage for XP plus `coin_ledger`, `coin_rewards`, `advantage_redemptions`, and `coin_spend_allocations`. |
| `pnpm --filter @eclipse/api typecheck` | PASS; API TypeScript check completed after migration hardening. |
| `pnpm exec vitest run apps/api/src/rt/service.test.ts apps/api/src/gems/service.test.ts --reporter=dot` | PASS; 2 files, 7 tests. Real SQLite RT tests cover stable student-ID bulk application, a multi-entitlement scope, reordered exact replay, changed-fingerprint conflict rollback, injected multi-student rollback, revision grant/revoke/reinstate, and CAS. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed after the RT source-boundary changes. |
| `pnpm exec vitest run apps/api/src/gems/cursor.test.ts apps/api/test/integration/migrations.test.ts packages/domain/test/xp.test.ts apps/api/src/xp/repository.test.ts apps/api/src/rt/service.test.ts apps/web/src/workspace/demo-presentation.test.ts` | PASS; 6 files, 23 tests. |
| `pnpm exec vitest run apps/api/src/gems/cursor.test.ts apps/api/src/xp/repository.test.ts apps/api/src/rt/service.test.ts apps/api/test/integration/migrations.test.ts packages/domain/test/xp.test.ts apps/web/src/workspace/demo-presentation.test.ts` | PASS; 6 files, 23 tests after coordinator wiring. |
| `pnpm test` | FAIL; 40 files passed, 2 legacy coin-writer suites failed 10 tests because removed coin mutation endpoints correctly return `404` while old tests still expect mutation behavior. |
| `pnpm build` | PASS; Vite production web build and API TypeScript build completed after correction changes. |
| `pnpm typecheck && pnpm test && pnpm build` | PASS; 42 files, 179 tests; production web/API builds completed. |
| `pnpm typecheck && pnpm test && pnpm build` | PASS after coin cleanup; 42 files, 178 tests; production web/API builds completed. |
| `pnpm typecheck && pnpm test && pnpm build` | PASS after final UI/coin cleanup; 43 files, 179 tests; production web/API builds completed. |
| `pnpm exec playwright test --trace off` | FAIL/PARTIAL; the configured 49-scenario run timed out at 120 seconds. Several existing XP/workspace scenarios and the fallback route scenario failed after the focused StudentPanel replacement; no final M3 browser acceptance can be claimed. |
| `pnpm exec vitest run apps/api/test/privacy/gems-dto.test.ts apps/api/test/integration/coins-readonly.test.ts apps/api/test/integration/coins-reconciliation-readonly.test.ts apps/api/test/integration/seed-demo.test.ts apps/api/test/integration/migrations.test.ts apps/api/test/integration/transactions.test.ts apps/api/src/gems/cursor.test.ts` | PASS; 7 files, 19 tests. |
| `pnpm exec playwright test apps/web/e2e/routing.spec.ts --trace off` | PARTIAL; 1/2 routing scenarios passed. The fallback scenario timed out waiting for the `Events` heading. |
| `pnpm typecheck && pnpm exec vitest run apps/api/test/privacy/gems-dto.test.ts apps/api/test/integration/migrations.test.ts apps/api/test/integration/transactions.test.ts && pnpm build` | PASS; typecheck, 8 focused tests, and production web/API builds completed after StudentPanel restoration. |
| `pnpm exec playwright test apps/web/e2e/spec-0004-xp.spec.ts apps/web/e2e/teacher-workspace.spec.ts apps/web/e2e/routing.spec.ts --trace off` | NOT RUN; the prior Playwright web server remained bound to port 3304, so the configured harness refused a second server. |
| `pnpm exec vitest run apps/api/src/rt/service.test.ts --reporter=dot` | PASS; 5 RT tests cover replay/conflict rollback and revision grant/revoke/reinstate behavior. |
| `pnpm typecheck && pnpm test && pnpm build` | PASS; 43 files, 181 tests; production web/API builds completed. |
| `pnpm exec vitest run apps/api/test/integration/migrations.test.ts apps/api/src/rt/service.test.ts --reporter=dot` | PASS; 10 tests covering migration postflight/drift rollback and RT atomic/revision behavior. |
| `pnpm typecheck` | PASS after cursor validation and root-logger corrections. |
| `pnpm exec vitest run apps/api/test/privacy/gems-dto.test.ts apps/api/test` | PASS; 18 files, 78 tests. |
| `pnpm exec vitest run apps/api/src/gems/service.test.ts apps/api/src/xp/level-grant-transition-port.test.ts apps/api/src/xp/repository.test.ts apps/api/src/rt/service.test.ts` | PASS; 4 files, 13 tests. Real SQLite XP source-boundary coverage proves threshold success, exact replay, reversal/reinstatement lineage, changed-receipt rejection, and transaction rollback. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed after the source-boundary changes. |
| `pnpm build` | PASS; Vite production web build and API TypeScript build completed. |

## Findings

- The migration applies after `0012_rt_absent_term_energy`, creates only gem
  tables/catalogue/indexes, and repeat application is inert in the focused
  migration suite.
- The shared domain level module now reports uncapped annual totals at the
  permanent L8 maximum with canonical progress fields and safe-integer checks.
- Gem read routes are authenticated and ownership-scoped; projection code was
  not changed.
- The gem service now supports result-reward grants,
  gem spending/allocation, manual advantage reversal, and XP transition grant
  application. These paths are not yet wired into XP/RT source transactions.
- The private panel now renders a minimal Spanish gem balance/catalogue/spend
  surface; legacy coin mutation client methods are removed, but the old
  CoinActions implementation has been removed and replaced with gem actions plus
  labelled read-only coin history.
- The approved `GEM_CURSOR_KEYS` contract is now implemented with HKDF-SHA-256,
  AES-256-GCM, scope-bound AAD, key rotation, startup validation, disabled
  Fastify request logging, redacted serializers, and allowlisted application
  request records.
- XP repository operations now return emitted transition IDs; source and replay
  ownership lookups run inside the immediate transaction, and production XP/RT
  route registration requires the coordinator. RT now validates revision
  continuity, performs CAS-backed grants, and appends revoke/reinstate movements
  with spent-source refunds; full receipt fingerprint and startup semantics remain.
- StudentPanel now restores the existing XP DOM classes, labels, specialty
  affordances, feedback, retry, Undo, and tablet focus trap while retaining
  gem actions and read-only coin history. Browser confirmation is still pending
  because the configured server could not be restarted in this pass.
- Gem cursors now reject empty tokens and map malformed/unauthenticated cursor
  decoding to the Design's `422 VALIDATION_FAILED` contract. HTTP request
  completion and error records now use the root Fastify application logger only;
  no request logger path remains.
- Result correction now reverses linked active redemptions before appending
  correction movements and supports exact same-key replay. Movement insertion
  enforces the complete amount/kind/predecessor matrix and copied owner,
  student, year, currency, family, and unit lineage. Result/spend/reversal
  operations use canonical semantic fingerprints and generated operation source
  identities.
- Migration `0013_gems` now verifies required tables, indexes, fixed catalogue
  rows, and foreign-key integrity after DDL within the migration transaction;
  it also performs exact effective-0012 XP metadata/data preflight and complete
  gem metadata/data/PRAGMA postflight. Every declared migration stage is
  injectable only through the explicit test seam; focused tests prove rollback
  restores schema SQL and ordered XP/legacy coin rows with no gem object or
  `0013_gems` marker.
- Build remains incomplete: complete gem mutation/orchestration and receipt
  semantics, RT startup/bulk edge cases, migration fault-injection/preflight
  coverage, and Playwright journey coverage are still pending in `TASKS.md`.

- The XP-owned transition port now completes only missing authoritative L2-L8
  transitions, preserves the permanent L8 boundary, returns the exact completion
  result, and exposes bounded contiguous `listAfter` pages. Startup begins its
  independent scan at sequence zero and verifies the empty XP terminal probe.
- Startup now executes XP completion/catch-up and the RT-owned global baseline
  enumeration before registering routes, inside one immediate transaction. RT
  discovery is confined to the RT port; the coordinator receives one
  revalidated snapshot per baseline entitlement.
- This Build slice does not yet claim the required injected partial-baseline
  rollback/readiness/no-route test, nor complete gem matrix/result semantics.

- The XP source slice now validates authoritative event/reversal ownership,
  exact transition receipt and ledger movement linkage, contiguous sequence
  advancement, cursor completeness, and replay integrity inside the same
  immediate transaction. The migration now seeds the required XP cursor and
  stores the receipt movement link required by the approved Design.

- RT bulk writes now establish all submitted entries and entitlement states
  before applying gems, then invoke the required coordinator once per affected
  student in stable ID order inside one immediate transaction. Exact request
  replay rechecks every submitted scope and accepts reordered entries because
  the request fingerprint is student-ID canonicalized.
- RT revision application now validates the stable revision operation identity,
  continuity/opposite-state predecessor, immutable consumption linkage,
  persisted UTC timestamps, exact source-family movement linkage, and exact
  revision fingerprints. Active unconsumed revisions CAS their grant linkage;
  consumed inactive/active revisions refund-and-revoke or reinstate without
  reopening allocations.
- During focused execution, the RT predecessor lookup defect was traced to a
  shared helper still hard-coded to `XP_TRANSITION`; parameterizing its source
  kind restored RT revoke/reinstate lineage while preserving XP behavior. The
  focused suite and typecheck/build pass after that correction.

- The startup integration test exposed that the RT baseline enumeration port
  selected `e.*` while its snapshot mapper required camel-case fields. The
  baseline lookup now aliases all RT entitlement fields explicitly, preserving
  the RT-owned source boundary and allowing the required CAS/receipt path to run.

The obsolete standalone coin lifecycle/reconciliation suites were replaced by
read-only contract suites. The mixed game-master fixture now includes explicit
legacy mutation-absence assertions and no longer contains unreachable
mutation-only bodies. Current passing counts must not be interpreted as
complete M3 acceptance.

This slice also removed client-side coin mutation-era types/helpers and added
real HTTP gem ownership/status/privacy coverage, and removed the obsolete mixed
game-master mutation-only test bodies. No production coin writes, conversion,
or dual-write path was added.

## Residual risk

The implementation must not be treated as release-ready. Broader gem matrix,
RT receipt, migration, coin/UI cleanup, and browser acceptance remain pending;
this Build slice does not claim Terra Verify or release readiness.

## Terra Verify — 2026-09-12

**Verdict: BLOCKED.** This is the Level C final verification pass. All tasks in
`TASKS.md` are marked complete, but a required real-browser acceptance journey
does not pass. No Git/VCS, Ship, or manual process termination was used.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 4 files, 15 tests. Confirms focused gem lineage/action-state ownership and closed DTO coverage plus typed client tuple/key calls. |
| `pnpm typecheck && pnpm build` | PASS; recursive web/API typecheck and production build completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; exactly one clean Terra Verify attempt. Playwright bootstrapped, seeded, built, and started the configured Fastify server with `webServer.env.GEM_CURSOR_KEYS`; no manual environment prefix or process kill was used. The journey completed the ACTIVE/REVERSED/reload portions, then timed out at the archived-year read-only assertion. |

### Contract comparison

- **Action-state privacy and fail-closed read:** focused API tests pass. The
  route validates the exact owned student/year/context tuple before the
  repository read and maps only the closed DTO fields. The UI clears state while
  loading and disables mutations when state is absent/error.
- **Reload persistence:** the one real Fastify/built-React journey reached and
  passed its ACTIVE and REVERSED reload assertions before the later failure.
- **Archived readability and read-only UI:** BLOCKED in the built application.
  After the test archives the owned year and navigates to its explicit hash
  tuple, `WorkspaceApp` initially loads only active years. Because active years
  still exist, it never loads the requested archived year, replaces `yearId`
  with an active selection, and the required historical banner/read-only panel
  is absent. The failing evidence is e2e line 72:
  `Historical year — records are read-only.` was not found.
- **Responsive/mobile, keyboard/focus, Spanish UI, scoped idempotency, and
  WorkspaceApp selection/rehydration:** source and focused tests provide partial
  evidence, but the only required browser journey stops before its viewport and
  focus assertions. They cannot be accepted as final runtime evidence.
- **Automatic cursor-key harness:** present and exercised: `playwright.config.ts`
  supplies `GEM_CURSOR_KEYS` in `webServer.env`; the clean attempt reached the
  built Fastify application rather than failing at cursor-key startup.

### Findings

1. **CRITICAL — archived context route rehydration is broken.** This is a
   concrete implementation defect, not a Design ambiguity: `WorkspaceApp.tsx`
   only falls back to `workspaceApi.years(true)` when there are no active years,
   even when the URL explicitly requests an owned archived year. It therefore
   fails the approved archived-readable/read-only acceptance and the user
   required WorkspaceApp rehydration regression.
2. **WARNING — client mutation-key retention is broader than the approved
   definitive-outcome rule.** `StudentPanel.tsx` clears `keyRef` for every
   caught HTTP failure and `refresh()` swallows post-mutation action-state read
   failures, allowing success feedback/key reset after a failed refresh. The
   Design requires retaining a key across ambiguous failures and not announcing
   finalized success until action-state reread succeeds. This needs focused
   component/runtime coverage in the Build correction.

### Residual risk

No material Design, migration, data-integrity, or server-side privacy-contract
contradiction was found in this Verify pass; do **not** route to Sol Design.
Return to Luna Build for the archived URL-year rehydration defect and the
idempotency/refresh-state correction, then run one fresh focused browser
journey. Do not claim responsive/keyboard acceptance until that journey reaches
and passes those assertions.

## Luna Build correction — 2026-09-12

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 1 file, 10 tests. Adds archived-year lookup and deterministic-versus-ambiguous gem-key regression coverage. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed after the correction. |
| `pnpm build` | PASS; production React/Vite and API builds completed after the correction. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; exactly one Build attempt in this slice, run before the final derived archived-year guard was added. It reached the archived assertion and timed out; no second Build journey was run. |

### Correction evidence and residual risk

- `WorkspaceApp` now requests archived years when the URL explicitly names a
  year absent from active results, preserves the requested year/group/student
  selection, and derives historical read-only state from the selected year.
- `StudentPanel` now propagates post-mutation refresh failures, announces
  success only after action-state reread succeeds, clears keys after
  deterministic HTTP outcomes, and retains them only for ambiguous failures.
- The required built-app browser journey remains unproven in Build because the
  one permitted run preceded the final guard. Terra Verify must run that journey
  once and record the responsive, keyboard, and archived read-only assertions.

## Terra Verify — 2026-09-12 (after latest Build correction)

**Verdict: BLOCKED.** This Level C Verify used exactly one fresh focused
Playwright journey; it was not retried. No Git/VCS, Ship, lifecycle/runtime
markers, manual environment prefix, or manual process termination was used.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 4 files, 17 tests. Confirms tuple-scoped closed action-state mapping and privacy/ownership statuses, ACTIVE/REVERSED server state, archived owned reads, typed tuple reads, archived-year lookup predicate, and deterministic-versus-ambiguous idempotency classification. |
| `pnpm typecheck` | PASS; recursive web and API TypeScript checks completed. |
| `pnpm build` | PASS; production Vite web build and API TypeScript build completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; exactly one fresh Chromium journey. The configured web server bootstrapped, seeded, built, and served the real Fastify/built React app using `webServer.env.GEM_CURSOR_KEYS`. It completed the ACTIVE and REVERSED action/reload sequence and the fail-closed action-state failure/retry sequence, then timed out at the archived-year banner assertion. No retry was run. |

### Contract comparison

- **Private action-state contract and failure boundary:** PASS in focused runtime
  tests and source inspection. `gems/routes.ts` verifies the owned
  student/year/context tuple before `repository.actionState`, and maps only the
  closed allowlist. `StudentPanel` clears action state while loading and disables
  mutations on absent/error state. The browser journey observed the Spanish
  `No se pudo cargar el estado. Reintentar` failure state, no grant control, and
  successful rehydration after retry.
- **Reload persistence and mutation refresh/idempotency:** PASS up to the failed
  later assertion. The fresh browser journey observed ACTIVE result state and
  REVERSED redemption after reload, then REVERSED result state after correction
  and a second reload. `StudentPanel` retains a key only for status-less
  ambiguous failures, clears it after deterministic outcomes or successful
  refresh, and propagates refresh failure before success feedback.
- **Cursor supply and process diagnostics:** PASS by executable configuration and
  source inspection. `playwright.config.ts` supplies `GEM_CURSOR_KEYS` through
  `webServer.env`, demonstrated by the real server reaching the journey; the
  server has a distinct constant keyring-startup message and emits
  `Fastify listen failed on <host>:<port>:` only from the asynchronous listen
  failure handler.
- **Archived readable/read-only, responsive/mobile, and keyboard/focus:**
  BLOCKED. The sole fresh browser journey did not reach its archived panel,
  viewport, or focus assertions. Source code retains the requested-year lookup,
  historical read-only guard, Spanish labels, and mobile focus handling, but
  this is not substitute runtime evidence.

### Finding

1. **CRITICAL — archived URL rehydration still fails after a live archive.** The
   fresh page snapshot shows the archived year selected as an active
   `2026–2027` year and no historical banner. `WorkspaceApp` requests archived
   years only when the active-year response lacks the requested ID. During this
   journey the browser reuses the earlier successful active-years GET after the
   archive mutation, so that stale response still contains the requested year;
   the archived lookup and historical guard are bypassed. This violates the
   approved archived readability/read-only acceptance and prevents the required
   responsive and keyboard evidence from executing. Server mutation protections
   remain in place, but the private client read-only indication is not reliable
   after this live transition.

### Residual risk and route

Return only to **Luna Build** for a narrow stale-academic-year response/URL
rehydration correction and a focused regression that represents an archive after
the active-year list was previously read. This is an implementation/cache
consistency defect; current evidence exposes no Design, migration, server-side
privacy/security, or data-integrity contradiction, so it does **not** route to
Sol. After correction, Terra Verify must run one fresh focused built-app journey
and no retry loop.

## Luna Build completion pass — 2026-09-12

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 1 file, 11 tests. Covers valid URL year/student rehydration, invalid student clearing, archived/historical selection, normal selection predicates, and ambiguous-only gem-key classification. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed. |
| `pnpm build` | PASS; production React/Vite and API builds completed. |

### Build completion evidence and residual risk

- `WorkspaceApp` now revalidates every explicitly requested year against the
  include-archived response, so a previously loaded active-year response cannot
  hide a year archived later in the same browser session. URL year/group/student
  selections are preserved when valid and invalid student selections are cleared.
- Result-reward grant UI is Spanish and uses **Otorgar recompensa**, not a
  spending label. Existing mutation-key behavior retains keys only for
  status-less ambiguous failures; deterministic HTTP outcomes and successful
  post-mutation refresh clear them, while refresh failures prevent success
  feedback.
- The single built-app Playwright journey remains intentionally deferred to Terra
  Verify. No browser journey was run in this Build pass.

## Terra Verify — 2026-09-12 (final focused attempt)

**Verdict: BLOCKED.** The required focused checks pass, but the one permitted
fresh built-app browser journey fails at the owned archived-year read-only
acceptance. No retry was run.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 4 files, 18 tests. Includes real SQLite result correction/spend lineage, tuple-scoped action-state ownership/allowlist and archived-read coverage, WorkspaceApp requested-year/student rehydration coverage, and ambiguous-only gem idempotency-key classification. |
| `pnpm typecheck` | PASS; recursive web and API TypeScript checks completed. |
| `pnpm build` | PASS; production Vite web build and API TypeScript build completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; exactly one fresh Chromium journey. The configured web server bootstrapped and seeded a temporary database, rebuilt the application, and served the real Fastify/built React app with `webServer.env.GEM_CURSOR_KEYS`. The journey passed the reward grant, advantage spend/reversal, ACTIVE and REVERSED reload, and fail-closed action-state retry steps, then timed out at the archived-year banner assertion at e2e line 72. |

### Contract comparison

- **Context selection, private action state, reward grant/spend semantics, and
  reload persistence:** PASS through the browser steps before the later failure.
  The journey created the result reward, spent and manually reversed the
  advantage, observed the server `ACTIVE` reward and `REVERSED` redemption after
  reload, corrected the reward, and observed both finalized states after a second
  reload.
- **Fail-closed and retry recovery:** PASS in the browser journey. An intercepted
  action-state GET showed `No se pudo cargar el estado. Reintentar`, removed the
  grant control, and recovered through retry without a repeated mutation.
- **Server privacy/ownership and WorkspaceApp/idempotency focused coverage:**
  PASS in the 18 focused Vitest cases. The action-state route remains an
  authenticated owned tuple read with closed mapping; the client regression tests
  cover explicit-year revalidation and retain a mutation key only for ambiguous
  failures.
- **Archived readability and actual read-only/disabled mutations:** BLOCKED.
  The final page snapshot still renders the selected archived year as active and
  shows active XP and gem controls. `WorkspaceApp` computes the historical banner
  as `historical || years.every(year => Boolean(year.archivedAt))`; after the
  authoritative include-archived lookup returns both active and archived years,
  that expression is false even when the selected year is archived. This prevents
  the banner and fails to prove the required disabled mutation UI.
- **Responsive/mobile and keyboard/focus:** BLOCKED. The sole permitted journey
  stops before its tablet viewport and focus assertions; source inspection is not
  runtime acceptance evidence.

### Residual risk

The remaining issue is a narrow private client historical-state derivation
defect, not a Design, migration, server-side privacy/security, or data-integrity
contradiction. The final Build task remains unchecked. Return only to Luna Build
for a focused `showingHistorical`/selected-year read-only correction and its
regression test, then run one fresh Terra Verify journey; do not retry this
Verify attempt.

## Luna Build narrow correction — 2026-09-12

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 1 file, 11 tests. Mixed active/archived selected-year historical derivation, active-year navigation state, and valid/invalid URL student selection coverage pass. |
| `pnpm typecheck` | PASS; recursive web and API TypeScript checks completed. |
| `pnpm build` | PASS; production Vite web and API TypeScript builds completed. |

### Build evidence and residual risk

- `WorkspaceApp` now derives the banner, year selector badge, roster loading,
  student context, and private panel read-only state from the selected year's
  `archivedAt`, not from all loaded years. Mixed active and archived year lists
  therefore keep an archived selection read-only while active selection remains
  writable.
- Invalid URL student selections remain cleared by the existing authoritative
  loaded-roster check; focused regression coverage preserves that behavior.
- The final built-app Playwright task remains unchecked and was not run in this
  Build correction. Terra Verify must run the single fresh journey and prove the
  archived banner, disabled controls, responsive, and keyboard assertions.

## Terra Verify — 2026-09-12 (after narrow Build correction)

**Verdict: BLOCKED.** Focused affected tests, typecheck, and build passed, but
the one permitted fresh built-app journey failed at the archived-year read-only
assertion. It was not retried. No manual environment prefix, process
termination, Git/VCS, Ship, or lifecycle markers were used.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 4 files, 18 tests. |
| `pnpm typecheck` | PASS; recursive web and API TypeScript checks completed. |
| `pnpm build` | PASS; production Vite web build and API TypeScript build completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; exactly one fresh Chromium journey. The configured web server bootstrapped, seeded, rebuilt, and served the Fastify/built React app using `webServer.env.GEM_CURSOR_KEYS`. It timed out at e2e line 72 waiting for `Historical year — records are read-only.`. |

### Contract comparison

- **Focused private action-state, ownership/privacy, ACTIVE/REVERSED, reload,
  correction, fail-closed/retry, Spanish, scoped idempotency, and WorkspaceApp
  selection coverage:** PASS in the focused 18-test runtime suite and in the
  browser journey before the later failure.
- **Archived selected-year readability, historical banner, and disabled mutation
  UI:** BLOCKED. The final browser snapshot renders the archived `2026–2027`
  selection without the historical banner and exposes active XP and gem controls.
  The journey therefore never reaches the required read-only controls assertion.
- **Responsive/mobile and keyboard/focus:** BLOCKED. The sole browser journey
  stops at line 72, before its viewport and focus assertions; source inspection
  is not runtime acceptance evidence.

### Finding and residual risk

1. **CRITICAL — archived selected-year state remains active in the built app.**
   The current source derives historical state from the selected year's
   `archivedAt`, but the fresh runtime snapshot still contains an active selected
   year after the archive API call. This is a concrete client rehydration/cache
   consistency defect and blocks required private read-only UI evidence.

No Design, migration, server-side privacy/security, or data-integrity
contradiction was demonstrated. Server-side archive mutation guards remain
present, but the browser did not prove disabled mutations, responsive/mobile, or
keyboard/focus. Return only to a narrow Luna Build correction; do not retry this
Terra journey.

## Luna Build stale-list correction — 2026-09-12

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; focused workspace contract suite passes, including stale selected-year revalidation after live archive, mixed active/archived selection, active navigation, and invalid student clearing. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed. |
| `pnpm build` | PASS; production React/Vite and API builds completed. |

### Root cause and correction

The prior `WorkspaceApp` academic-year effect ran only on mount (`[]`). After the
archive mutation, navigation to the same year with the selected student changed
the location but did not reload the year list; the cached active response still
contained the selected year with `archivedAt: null`. The selected-year-derived
historical guard therefore correctly evaluated false against stale data.

The effect now revalidates every explicit URL year when the location changes,
using the include-archived response before selecting the year. The focused
regression represents the stale active list and authoritative archived list.

The final built-app Playwright task remains unchecked and was not run, as
required. Terra Verify must run the single fresh journey to prove the browser
banner, disabled controls, responsive, and keyboard assertions.

## Terra Verify — 2026-09-12 (post-fix final attempt)

**Verdict: BLOCKED.** The focused affected suite, typecheck, and build passed.
The one permitted fresh built-app Playwright journey failed and was not retried.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 4 files, 19 tests. Covers result-reward/redemption correction lineage, tuple-scoped action-state ownership/closed DTOs and archived reads, supplied-key idempotency, selected-year rehydration helpers, stale-list regression, and ambiguous-only mutation-key classification. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed. |
| `pnpm build` | PASS; production Vite web build and API TypeScript build completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; exactly one fresh Chromium journey. The configured web server bootstrapped, seeded, rebuilt, and served the Fastify/built React app with automatic `webServer.env.GEM_CURSOR_KEYS`. It reached the archived-year assertion and timed out at e2e line 72 waiting for `Historical year — records are read-only.`. |

### Contract comparison

- **Assessment selection; reward mutation; ACTIVE reload; redemption/reversal;
  REVERSED reload; correction reload; and fail-closed action-state retry:** the
  browser journey passed these steps before the later failure. The focused suite
  also passed the corresponding action-state, idempotency, and ownership/privacy
  evidence.
- **Archived readable student/context, Spanish read-only UI, and unavailable
  mutations:** BLOCKED. The final browser snapshot rendered the archived
  `2026–2027` selection as active, with no historical banner and active XP/gem
  controls. It did not reach the Spanish read-only or unavailable-mutation
  assertions.
- **Responsive/mobile and keyboard/focus:** BLOCKED. The sole journey stopped
  before its viewport and focus assertions; focused/source evidence is not a
  substitute for the required browser acceptance.

### Finding and residual risk

1. **CRITICAL — live archive rehydration remains broken in the built app.** After
   the archive request and explicit hash navigation, the runtime still selected
   an active year. This blocks the private historical/read-only UI proof and all
   downstream responsive/keyboard evidence. No Design, migration, server-side
   privacy/security, or data-integrity contradiction was demonstrated.

`TASKS.md` remains unchanged: its final browser task is still unchecked. No
Git/VCS, Ship, manual environment prefix, or manual process termination was
used.

## Luna Build — concrete archived-year reload blocker — 2026-09-12

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts --reporter=dot` | PASS; 1 file, 14 tests. Covers active reload selection, archived/historical reload selection, valid archived student restoration, invalid selection clearing, unchanged active navigation, and no-store/cache-busting year reads. |
| `pnpm typecheck && pnpm build` | PASS; web/API typecheck and production builds completed after the final lower-layer correction. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; second and final permitted execution for this resume. Automatic configured `webServer.env.GEM_CURSOR_KEYS` was used. The journey still timed out at line 72 before archived controls, responsive/mobile, and keyboard/focus assertions. |

### Final Build result and runtime divergence

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts apps/api/test/integration/roster.test.ts --reporter=dot` | PASS; 2 files, 22 tests. Includes Fastify-injected archived-year DTO evidence and WorkspaceApp selection helper coverage. |
| `pnpm typecheck` | PASS; web and API checks completed. |
| `pnpm build` | PASS; production Vite/API build completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; exactly one and final browser execution. It reached the archived assertion and stopped; no retry. |

The actual built runtime state was: URL requested the archived year/student
tuple, but the rendered selector still selected `2026–2027`, the header showed
`2026–2027 · Demo · Groupe principal`, no historical banner was present, and
the selected student panel still exposed active XP/gem controls. Expected state
was the same student/year with the archived year DTO's non-null `archivedAt`, a
historical banner, and read-only controls.

The exact remaining divergence is between the server/API DTO evidence (the
explicit `includeArchived=true` Fastify response contains `archivedAt`) and the
real built `WorkspaceApp` runtime state: that DTO does not reach the mounted
app's selected-year state in this journey, which remains the active demo-year
record. The 14 mocked tests missed it because they never mounted the app or ran
the URL parsing, effect ordering, reducer/context updates, built static asset,
and Fastify-served reload path together; the added API test proves only the
server boundary, while helper tests prove pure selection behavior.

Build status: **BLOCKED** on the real production path. Playwright status:
**FAIL — stop after the one permitted execution**. Responsive/mobile and
keyboard/focus assertions were not reached and remain unproven.

### Build diagnosis and correction

The first focused browser attempt showed the selected archived year rendered with
active metadata after reload. The focused lower-layer correction made academic
year reads server-authoritative by using `cache: 'no-store'` plus a unique reload
query, and `WorkspaceApp` now requests the include-archived response directly
when an explicit URL year exists instead of first selecting from an active-only
response. Existing URL selection and invalid-student clearing behavior remain
covered by the focused suite.

The final permitted browser execution continued to render the active year, so
Build cannot claim the archived read-only journey, disabled controls,
responsive/mobile, or keyboard/focus acceptance. No Playwright retry is allowed
under this resume's two-execution limit. `TASKS.md` therefore retains the final
journey item unchecked.

## Luna Build — concrete production-path diagnosis — 2026-09-12

Before implementation, the real path was traced from `/#/workspace` through
`HashRouter`/`WorkspaceApp`, `workspaceApi.years`, Fastify's
`GET /api/v1/academic-years`, and the built-app server in `apps/api/src/server.ts`.
The concrete divergence is that the 14 existing regressions exercise exported
selection helpers and a mocked `fetch` request shape; they do not mount
`WorkspaceApp`, run its location/year/group effects, or prove the built
`apps/web/dist` artifact receives the archived-year DTO. The browser failure is
therefore still compatible with green mocks: the production effect's
`years(true)` response is the authoritative boundary that must carry
`archivedAt` into `WorkspaceApp` before selected-year/read-only derivation.

The API route and DTO mapper do accept `includeArchived=true` and expose
`archivedAt`; the client URL parser reads the hash query. The remaining Build
scope is to add a real Fastify/API DTO plus mounted production state/effect-path
regression (including reload, archived student restoration, active navigation,
and invalid selection clearing), then correct only the proven production-path
divergence if that regression fails.

### Focused diagnosis evidence

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts apps/api/test/integration/roster.test.ts --reporter=dot` | PASS; 2 files, 22 tests. Fastify inject proves active omission plus explicit `includeArchived=true` DTO `archivedAt`; WorkspaceApp-path tests prove authoritative selected-year and student selection rules. |

## Luna Build — mounted production-path correction — 2026-09-12

The previous helper/API tests did not mount `WorkspaceApp`, execute `HashRouter`
hash parsing, or exercise real reducer/effect ordering. A focused `happy-dom`
harness now mounts the real app under `StrictMode` and `HashRouter`, feeds
Fastify-shaped JSON responses, and covers active initial mount, archived
initial/reload, valid archived student restoration, invalid selection clearing,
active transition, and active navigation.

### Pre-fix failure and exact transition

The mounted regression was intentionally run before the production change and
failed. The authoritative response was the archived year DTO with
`archivedAt: "2026-09-12T12:00:00.000Z"`. A stale active response for the same
year then completed with `archivedAt: null`. The `years` effect had no request
generation guard, so its final `setYears(available)` action replaced the
archived list with the stale active list. Selected-year derivation then read
`archivedAt: null`, producing no historical banner and active controls.
StrictMode's real effect rehydration exposed the ordering; abort alone was
insufficient because the response boundary can still resolve.

### Correction and focused evidence

`WorkspaceApp` now assigns a generation to each academic-year request and
ignores stale success/finally callbacks. Only the newest response may update
`years`, selection, and loading state. No test-only branch, delay, or cache
workaround was added.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/WorkspaceApp.integration.test.tsx apps/web/src/workspace/workspace-api.test.ts apps/api/test/integration/roster.test.ts apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts --reporter=dot` | PASS; 6 files, 31 tests. Mounted real `WorkspaceApp`/`HashRouter` regression plus Fastify-shaped roster and existing gem/privacy coverage. |
| `pnpm typecheck` | PASS; web and API checks completed. |
| `pnpm build` | PASS; production Vite React and API builds completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; exactly one and final allowed browser execution. The real built Fastify/React journey timed out at e2e line 72 waiting for `Historical year — records are read-only.`; no retry was run. |

### Browser divergence and residual risk

The mounted Vitest path now ends with the archived DTO selected and the
historical banner rendered, but the built browser still renders no banner
after the live archive and explicit hash navigation. The browser diverges at
the archived selected-year/read-only boundary; responsive, mobile, and
keyboard/focus assertions were not reached. SPEC-0027 remains blocked pending
further production-path investigation; no second Playwright run is permitted.

## Luna Build — served-build investigation and final permitted journey — 2026-09-12

The serving path was checked before the final journey. Vite transforms
`apps/web/index.html` into `apps/web/dist/index.html`; its hashed assets and
Fastify's `resolve(process.cwd(), 'apps/web/dist')` use the same static root.
Playwright has `reuseExistingServer: false`, runs the root `pnpm build`, and
starts Fastify from the repository root on port 3304. No application service
worker, cache storage, alternate web root, or Vite fallback was found. The
initial dist artifact was older than the source; the required build regenerated
it, and the webServer build served its own current hashed artifact from that
same root. This was not a reused server or wrong package output.

Production academic-year writers/effects were enumerated. `WorkspaceApp` owns
`years`, `yearId`, `groupId`, `students`, and `summaries`; its location effect
parses URL state and dispatches context/selection changes, its academic-year
effect is the only writer of `years`/default selection and uses the generation
guard, and its selected-year `archivedAt` derives historical/read-only state.
`useTeacherContext` is an independent loader for non-workspace routes;
`ClassroomSetup` reads active years only for create-only setup and does not write
WorkspaceApp state. No other production writer was found for the selected year,
historical/readOnly state, hash rehydration, or default selection.

The mounted integration suite now models the real concurrent transition: an
active list is loaded first, then reload receives the archived DTO and stale
active DTO, with the authoritative response completed first. The pre-fix
transition remains exact: stale active `archivedAt: null` success dispatched
after authoritative archived success and replaced `years`; the generation guard
prevents that transition in mounted source execution.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/WorkspaceApp.integration.test.tsx --reporter=dot` | PASS; 1 file, 3 tests. |
| `pnpm exec vitest run apps/web/src/workspace/WorkspaceApp.integration.test.tsx apps/web/src/workspace/workspace-api.test.ts apps/api/test/integration/roster.test.ts apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts --reporter=dot` | PASS; 6 files, 32 tests. |
| `pnpm typecheck` | PASS; web and API checks completed. |
| `pnpm build` | PASS; Vite production web and API builds completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | FAIL; exactly one and final execution for this resume. ACTIVE/REVERSED/reload and action-state retry passed; line 72 timed out before archived read-only, responsive/mobile, or keyboard/focus assertions. No retry was run. |

### Final served runtime state and residual risk

The served snapshot showed the requested archived year/group/student URL tuple,
but the selector/header still showed active `2026–2027 · Demo · Groupe
principal`; no historical banner was present and XP/gem controls remained
enabled. The archive request returned `204` before navigation, and focused
Fastify coverage proves the owned `includeArchived=true` DTO has non-null
`archivedAt`. No browser network capture was installed, so the response
body/order at the failing navigation is not directly observed. Build remains
blocked on this unresolved runtime transition between the archived response and
`WorkspaceApp` state; no cache, service-worker, reused-server, or wrong-output
cause was proven. Further Playwright execution is prohibited for this resume.

## Luna Build — diagnostic and final browser evidence — 2026-09-12

Relevant production writers were inspected once before instrumentation.
`WorkspaceApp` is the sole writer of academic-year list/selection state; its
location and academic-year effects drive selected-year-derived historical and
read-only state. The expected sequence is hash parse, effect dispatch,
academic-year response/write, selected-year derivation, group/student reads,
then archived UI and responsive/focus checks.

Temporary diagnostics were scoped to the focused built Playwright runtime and
removed after diagnosis. They captured academic-year URLs/statuses, selected
year IDs and `archivedAt`, order, hash, and WorkspaceApp transitions. The one
diagnostic journey showed the initial active response/writes, then no
academic-year request, location effect, selection writer, or render transition
after the external archive. The page was already at the exact hash passed to
`page.goto()` on line 71, so no browser navigation/reload occurred. The exact
divergence was the missing browser reload event, not an unidentified production
writer or stale response.

The smallest correction changed that acceptance step to `page.reload()`;
assertions were retained. Focused checks ran before the final journey:

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/WorkspaceApp.integration.test.tsx apps/web/src/workspace/workspace-api.test.ts apps/api/test/integration/roster.test.ts apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts --reporter=dot` | PASS; 6 files, 32 tests. |
| `pnpm typecheck` | PASS; web and API checks completed. |
| `pnpm build` | PASS; production Vite/API builds completed. |
| Focused Playwright diagnostic | FAIL at archived banner; exact evidence above. |
| Focused Playwright final | FAIL after archived banner passed: line 74 strict-mode violation because two legitimate `Este registro es de solo lectura.` notices matched. |

The first final command attempt was a pre-browser syntax error from cleanup
removing the test closing brace; it started no browser. The single final
Chromium execution reached the archived banner and stopped at the duplicate
notice locator. Responsive/mobile and keyboard/focus assertions were not
reached. No retry is permitted under the two-browser-execution limit.

### Build status and residual risk

**BLOCKED — Build is not complete.** Temporary diagnostics are absent, with no
production logging or behavior change left behind. The acceptance test needs a
precise scoped locator correction without weakening the assertion, followed by
a newly authorized browser execution; responsive and keyboard evidence remain
unproven for this resume.

## Luna Build — narrow test-only locator cleanup — 2026-09-12

The failing StudentPanel assertion was scoped to the semantic `Gemas` region.
The global WorkspaceApp historical banner remains asserted separately; no
production notice or assertion was removed or weakened.

| Command | Result |
|---|---|
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | PASS; exactly one focused Chromium journey, 1 passed in 23.2s. It reached ACTIVE/REVERSED reload persistence, correction and finalized disabled mutations, action-state failure/retry, archived read-only behavior, responsive/mobile viewport, and keyboard/focus assertions. |

Build is complete for Terra Verify. Previously accepted Vitest, typecheck, and
build evidence was not rerun because this slice changed only a Playwright
locator.

## Terra Verify — 2026-09-12 (final review of fresh Build evidence)

**Verdict: BLOCKED.** The fresh focused built-app journey is accepted as runtime
evidence for the assertions it executes; it passed once (`1 passed`, `23.2s`)
after the test-only semantic locator scope correction. No Playwright, Vitest,
typecheck, or build command was rerun in this Verify pass: the latest change is
test-locator-only, and rerunning the already-passing browser journey would be
unnecessary duplicate evidence.

| Command/evidence | Result |
|---|---|
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` (fresh Build evidence) | PASS; 1 focused Chromium test in 23.2s. The real Fastify/built React journey covers gem ACTIVE/REVERSED reload persistence, correction/reversal finalization, action-state read failure/retry, archived selected-year read-only/disabled controls, 800px responsive viewport, and visible keyboard focus. |
| Additional commands in this Terra pass | NOT RUN; no lower-layer source changed after the recorded focused Vitest/typecheck/build evidence, and no genuine lower-layer execution gap was found. |

### Final contract comparison

- **Recorded browser assertions:** PASS for the journey assertions above. The
  scoped `Gemas`-region locator preserves the independent global historical
  banner assertion and does not weaken production behavior.
- **Gem/legacy-history failure isolation:** UNTESTED. The approved Design and
  completed Task require separate transient gem-read and legacy-coin-read
  failures, preserving the other already-loaded region and recovering with
  retry. The only current focused Playwright interception is the action-state
  GET at `apps/web/e2e/spec-0027-gem-action-state.spec.ts:57-63`. Repository
  inspection found no focused client test covering the required gem-read or
  coin-read isolation/retry scenarios. The action-state case is a distinct
  contract and cannot substitute for either scenario.

### Blocking finding

1. **CRITICAL — two approved browser acceptance scenarios lack passed runtime
   coverage.** `DESIGN.md` requires both transient gem-read and legacy-coin-read
   failure isolation/retry (`DESIGN.md:1160-1163`); `TASKS.md` repeats those
   requirements (`TASKS.md:88-92`). The fresh passing journey does not execute
   either one. Under SDD Lite, source inspection and an adjacent action-state
   failure test cannot establish scenario compliance.

### Residual risk and handoff

The current implementation remains unproven to preserve loaded legacy history
during a gem-read outage, or to keep gem actions available during a legacy-coin
history outage. This is a narrow missing acceptance-evidence/test scenario, not
a demonstrated Design, migration, server-side privacy/security, data-integrity,
or cross-domain architecture contradiction. Do not redesign or reopen completed
slices. SPEC-0027 is **not ready for orchestrator handoff** until Luna supplies
focused coverage for those two approved failure-isolation scenarios and Terra
records their passing runtime evidence.

## Luna Build — focused client failure-isolation evidence — 2026-09-12

The approved gap was covered with a deterministic happy-dom component path using
the real `StudentPanel`, `GemActions`, and `LegacyCoinHistory` components. No
Playwright or browser journey was run, and Terra status remains unchanged.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/StudentPanel.failure-isolation.test.tsx --reporter=dot` | PASS; 1 file, 2 tests. Proves gem balance/action-state read failure is fail-closed, loaded coin history remains visible, local gem retry recovers actions without reloading coin reads, and coin read failure/retry preserves enabled gem actions without reloading gem balance/action-state reads. |
| `pnpm typecheck` | PASS; web and API TypeScript checks completed after the focused production retry change. |

### Scope and residual risk

- `StudentPanel.tsx` changed only the gem data retry from full-page reload to a
  local deterministic retry, preventing unrelated legacy history reloads.
- No XP, RT, migration, startup, lineage, archive, or projection logic changed.
- Browser/Terra evidence is intentionally unchanged; no Playwright command was
  run in this Build slice.

## Terra Verify — 2026-09-12 (final Level C verification)

**Verdict: PASS.** All `TASKS.md` items are complete. The two previously
missing failure-isolation scenarios now have fresh, passing runtime coverage;
the recorded built-app journey remains the applicable browser proof for all
other required browser assertions.

| Command | Result |
|---|---|
| `pnpm exec vitest run apps/web/src/workspace/StudentPanel.failure-isolation.test.tsx apps/web/src/workspace/WorkspaceApp.integration.test.tsx apps/web/src/workspace/workspace-api.test.ts apps/api/test/integration/roster.test.ts apps/api/src/gems/service.test.ts apps/api/test/integration/gems-routes.test.ts apps/api/test/privacy/gems-dto.test.ts --reporter=dot` | PASS; 7 files, 34 tests, 9.00s. The two new deterministic `StudentPanel` cases prove (1) gem balance/action-state read failures leave loaded legacy history visible and local retries never reload coin reads, and (2) legacy coin history read failure/retry leaves gem actions usable and never reloads gem balance/action-state reads. The retained mounted workspace, API ownership/privacy, and gem lineage suites also pass. |
| `pnpm typecheck` | PASS; recursive web and API TypeScript checks completed. |
| `pnpm exec playwright test apps/web/e2e/spec-0027-gem-action-state.spec.ts --trace off` | NOT RERUN. The last passing focused journey remains valid evidence for its unchanged real Fastify/built React assertions: ACTIVE/REVERSED reload persistence, action-state retry, archived read-only/disabled controls, 800px viewport, and visible keyboard focus. The production change is confined to the gem-data retry callback; the recorded Playwright journey does not intercept or exercise gem-data/legacy-coin read failures, so rerunning it would not validate the changed behavior. The fresh mounted `StudentPanel` runtime cases above directly exercise both required isolation/recovery paths. |

### Final contract comparison

- **Gem-read failure isolation and recovery:** PASS. Fresh component runtime
  evidence preserves loaded read-only coin history through gem and action-state
  failures; local retries recover gem actions without reloading coin reads.
- **Legacy-coin-read failure isolation and recovery:** PASS. Fresh component
  runtime evidence keeps loaded gem actions enabled while legacy history fails
  and retries, without reloading gem state.
- **Prior built-app acceptance:** PASS by recorded focused Playwright evidence
  (1 passed in 23.2s): real API mutation/reload state, action-state retry,
  archived read-only controls, responsive viewport, and keyboard focus. Those
  paths are unchanged by the local retry correction.
- **Design/task/code alignment:** PASS. The local retry change in
  `StudentPanel.tsx` satisfies the isolated-region contract without changing
  API ownership, migration, persistence, XP/RT, projection, or legacy coin
  immutability boundaries.

### Residual risk

- The two isolation cases use deterministic happy-dom component runtime rather
  than Playwright network interception. This is acceptable here because they
  directly execute the changed local retry path, while the real built-app
  journey remains recorded for browser-only behavior.
- C-01 encrypted-restic backup/restore evidence remains a separate
  production-only condition and is outside SPEC-0027.

**SPEC-0027 is ready for Ship.** No Git/VCS or Ship action was performed.
