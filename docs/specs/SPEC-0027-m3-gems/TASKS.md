# SPEC-0027 Build Plan

This is a plain implementation plan derived from the approved `DESIGN.md`; it
is not lifecycle state.

## Foundation and migration

- [x] Complete the transactional `0013_gems` migration with exact `0012` preflight,
  gem schema, fixed catalogue, indexes, and rollback tests.
  (Preflight now compares effective XP metadata and data; postflight validates
  XP and gem metadata/data/PRAGMA state; all named stages have an explicit test
  seam and rollback proof covering XP plus all four legacy coin tables.)
- [x] Add Drizzle schema declarations for gem tables.
- [x] Add the runner-owned immediate transaction token and transaction tests.
  (Token lifecycle, nested/forged-token, and RT coordinator integration
  coverage now exist; broader source-domain integration remains pending.)

## Canonical XP seam

- [x] Make the shared L1-L8 thresholds, safe integer validation, uncapped total,
  and MAX_LEVEL progress authoritative for domain/API summaries and transitions.
- [x] Return transition IDs from XP create/reverse and reconcile them atomically.
  (Transition IDs are returned, replay/source lookups are inside the immediate
  transaction, and XP source application now validates exact source lineage,
  receipt/movement links, contiguous sequences, and the reconciliation cursor.)
- [x] Complete the authoritative XP transition port with historical L2-L8
  completion, exact `{throughSequence,appendedTransitions}` output, and a
  contiguous paged drain with terminal probing.

## Gem domain and API

- [x] Implement append-only gem lineage, allocations, reconciliation receipts,
  result rewards, advantages, correction/reversal, and idempotency.
  (Initial grants/spends/reversal/correction paths exist; RT bulk source ordering,
   required coordinator transaction boundary, revision CAS, exact revision
   fingerprints, immutable consumption linkage checks, revoke/reinstate, spent-
   source refund ordering, generated source identities, and result/spend replay
   linkage are enforced in `gems/service.ts`; focused real-SQLite coverage proves
   result correction refunds the full redemption before source correction.)
- [x] Add exact server-mapped gem DTOs, authenticated ownership checks, encrypted
  scoped ledger cursors, and gem routes.
- [x] Remove coin mutation routes/services/UI/seed/reconciler while preserving
  the three historical read contracts and assessment-context routes.
    (Production coin repository/service writers, seed writes, reconciler, client
    mutation methods, and the dead CoinActions component are removed; the mixed
    game-master test now retains only explicit mutation-absence assertions.)

## Startup/manual baseline slice

- [x] Run XP completion, XP receipt/cursor drain, and RT global binary-ID
  baseline enumeration through one runner-owned immediate transaction before
  route registration/readiness; reject gaps, changed snapshots, and non-empty
  terminal probes.
- [x] Add focused real SQLite coverage for historical 174/175/>175 totals,
  inert completion rerun, startup cursor catch-up, malformed lineage rejection,
  and typecheck/build/runtime route wiring.
- [x] Add the remaining injected startup rollback coverage for partial XP/RT
  baseline receipts and failed readiness/no-route assertion. Real SQLite
  integration coverage now snapshots XP completion/catch-up, XP and RT receipts,
  gem movements/allocations/redemptions, cursor, and RT CAS state; it also proves
  the failed server is not constructed before a successful retry serves health.

## UI and evidence

- [x] Add the private action-state API contract: export the closed
  `GemActionStateDto`, add the exact student/year/assessment tuple repository
  read and explicit server mapper, and register the authenticated
  `GET /api/v1/students/:studentId/gem-action-state` route. Add focused real
  SQLite/Fastify status, ownership, privacy, and server-allowlist tests for
  null/`ACTIVE`/`REVERSED` reward and redemption combinations, owned archived
  reads, `401`, malformed `422`, and hidden cross-owner/year/group `404`
  responses with no excluded lineage, operation, reason, timestamp, score,
  name, or owner fields.
- [x] Complete the private Spanish gem actions and isolated read-only legacy
  coin history. Add the typed action-state fetch and rehydrate controls after
  assessment selection, every successful reward/correction/spend/reversal, and
  page reload. Keep all mutation controls disabled with a useful retry state
  when the action-state read or post-mutation refresh fails, preserve loaded
  gem/legacy-history data across isolated read failures, and retain one
  idempotency key across each ambiguous mutation retry without repeating a
  successful mutation during refresh recovery. Cover loading, empty, error,
  retry, disabled, editable, saved, and finalized client states.
- [x] Add and pass focused Playwright acceptance using the real Fastify server
  and built React application, then record the command evidence in `VERIFY.md`.
  The journey must prove separate gem and immutable legacy-coin regions; real
  API-backed reward/redemption `ACTIVE` state after reload; correction/reversal
  `REVERSED` persistence and non-repeatability after a second reload; action-
  state, gem-read, and coin-read failure isolation with keyboard-reachable
  recovery; owned archived student/context read-only behavior; and laptop plus
  tablet responsive, visible-focus, keyboard, dialog containment/return, and
  no-horizontal-clipping states. It must assert observed methods/URLs, preserve
  Fastify `/` plus HashRouter ownership, and make no projection claim or change.
- [x] Preserve the completed non-action-state domain, migration, cursor,
  existing gem-route privacy/integration, and legacy coin immutability coverage
  already recorded in `VERIFY.md`; it does not satisfy the pending private
  action-state or built-application browser acceptance above.

## Review workload forecast

- Estimated changed lines: well above 400 if all contract sections are
  implemented. No VCS/PR decision is made in Build; work should be completed
  as focused autonomous slices while preserving this plan.

## Cursor security

- [x] Implement the approved `GEM_CURSOR_KEYS` keyring, HKDF/AES-GCM cursor
   codec, scope binding, rotation, startup validation, URL/log redaction, and
   focused crypto tests.

## Current Build correction slice

- [x] Configure Playwright to inject `GEM_CURSOR_KEYS` through `webServer.env`
  and distinguish Fastify listen failures from startup keyring failures.
- [x] Reset the private gem mutation key when student, year, group, or
  assessment scope changes; retain it only for an ambiguous retry.
- [x] Keep owned archived assessment contexts readable and mutation controls
   read-only, with Spanish labels and focused selection/rehydration regression
   coverage. Browser revalidation remains pending after the harness correction.

## Terra Verify BLOCKED correction

- [x] Preserve an explicitly requested archived year/student URL tuple when
  active years also exist, and derive historical read-only state from the
  rehydrated year as a second client-side guard.
- [x] Retain a gem mutation idempotency key only across ambiguous failures;
  clear it after deterministic HTTP outcomes or a successful post-mutation
  action-state refresh, and propagate refresh failures so success is not shown.
- [x] Re-run the single built-app Playwright journey in Terra Verify after these
  corrections; no additional Build journey is run in this slice. The permitted
   fresh Terra run failed at the archived-year banner assertion; no retry was
   run. The later focused run passed after semantically scoping the StudentPanel
   read-only locator to the `Gemas` region.

## Current narrow Build correction

- [x] Derive the historical banner, selector state, student read-only context,
   and roster loading from the authoritative selected year, including mixed
   active/archived loaded years; revalidate an explicit URL year on navigation
   so a stale active-year response cannot hide a year archived during the
   session; cover active navigation, stale-list rehydration, and invalid
   student selection clearing in focused regression tests.

## Current concrete archived-year reload blocker

- [x] Prevent browser-cached academic-year reads from replacing an explicitly
  selected archived year with stale active metadata during reload.
- [x] Add focused regressions for active reload, archived/historical reload,
  valid archived student restoration, invalid student clearing, and unchanged
  active-roster navigation.
- [x] Run the required typecheck, build, and one configured focused journey;
  record actual results in `VERIFY.md` without weakening existing assertions.
  Focused Fastify/API DTO coverage was added and passed, and typecheck/build
   passed; previously accepted focused Vitest/typecheck/build evidence remained
   valid because this slice changed only the Playwright locator, and the
   configured journey passed after that correction.

## Current mounted production-path correction plan

- [x] Establish a focused happy-dom React integration harness that mounts the
  real `WorkspaceApp` under `HashRouter`, parses the initial year/group/student
  hash, runs its real reducer/effects, and feeds Fastify-shaped roster
  responses. Capture the pre-fix failure and exact archived-value transition:
  stale active `archivedAt: null` completed after the authoritative archived
  `archivedAt` response and overwrote `years`.
- [x] Implement only the production correction proven by the mounted harness;
  cover active initial mount, archived initial/reload, valid archived student
  restoration, invalid selection clearing, active transition, and normal active
  navigation.
- [x] Strengthen mounted coverage with an active-list-then-archive reload
  sequence whose StrictMode responses resolve as authoritative archived followed
  by stale active data.
- [x] Run focused Vitest, typecheck, build, and only after all pass the single
  configured SPEC-0027 Playwright journey; record only actual evidence in
  `VERIFY.md`.

The mounted Vitest harness and production correction passed; the configured
Playwright journey passed after the test-only locator correction.

Diagnostic evidence: after the external archive, the page was already at the
same hash passed to `page.goto()`, so no navigation, academic-year request,
WorkspaceApp effect, or state writer ran. Temporary focused-runtime diagnostics
were removed. The final journey was corrected to use `page.reload()` and then
reached the archived banner, but stopped on the existing strict locator because
two legitimate read-only notices matched. The locator was then scoped to the
 semantic `Gemas` region; production notices and assertions were retained.

## Current focused client evidence gap

- [x] Add deterministic component coverage for isolated gem read/action-state
  failure and retry while preserving loaded legacy coin history and avoiding
  unrelated history reloads.
- [x] Add deterministic component coverage for isolated legacy coin read
  failure and retry while preserving usable gem state/actions and avoiding
  unrelated gem reloads.
