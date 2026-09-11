# SPEC-0026 — Teacher Context Request Generation

## Classification

**Level A — local teacher-context correctness maintenance.** The change is
limited to asynchronous context loading in the web client. It has no schema,
API, domain, authentication, ownership, navigation-model, or projection
contract change.

## Root Cause and Behaviour

`apps/web/src/app/teacher-context.tsx` starts independent year and group
effects. Their cleanup calls `AbortController.abort()`, but abort is only a
transport optimization: a response that has already resolved, or a mocked/
cached response that ignores abort, can still run its continuation. The
continuation has no authoritative generation/current-context check. A delayed
old group response can therefore repopulate `groups` and select an old
`groupId` after a teacher has switched year. The adjacent year request has the
same concrete risk and can restore an old year or reconcile the URL after a
new navigation/refresh.

Required behaviour is latest-request-wins. Every year load and group load
captures a monotonically increasing generation and the exact current context
it serves. A completion may commit records, selection, loading, errors, or URL
reconciliation only when its generation is current and the live context still
matches its captured request. Aborted or stale completions are silent. The
generation guard is authoritative; `AbortController` remains for resource
efficiency and prompt cancellation, not correctness.

When selecting a year, clear the old `groups` and `groupId` immediately, clear
the group query, and begin loading only that year. Old group data must never be
shown while the new year is pending. A valid returned group selection is
reconciled only against groups belonging to the current year: preserve a
still-valid URL group, otherwise choose the first group, or clear the group
when none exists. Canonical `replaceState` keeps the existing hash route and
opaque `year`/`group` query shape, removes obsolete group values, and preserves
only the existing `new=1` flag. Existing auth recovery, historical read
semantics, ownership-as-server-response, navigation, and privacy boundaries
remain unchanged.

## Scope and Ownership

| File | Planned action | Ownership |
|---|---|---|
| `apps/web/src/app/teacher-context.tsx` | Modify | Generation refs, request snapshots, clearing, and canonical reconciliation |
| `apps/web/e2e/teacher-workspace.spec.ts` | Modify | Focused delayed-response browser regressions |
| `apps/web/src/app/*.test.ts` or existing web unit-test location | Modify/create only if established by Build | Pure generation/current-context regression coverage |

No API, database, contracts, projection, auth, router, storage, retry,
timeout, or broad state-management files are in scope.

## Data, API, and UI Effects

The same authenticated `workspaceApi.years(false)` with its
`includeArchived=true` fallback and `workspaceApi.groups(yearId)` calls remain
the sole data sources. No DTO or endpoint changes occur; no private data is
logged or persisted. UI state changes only by preventing stale commits:
loading reflects the current request, errors belong to the current request,
and a failed current load retains safe context and existing recovery semantics.
Historical years remain readable and read-only. No old roster/group is exposed
under a new year.

## Regression Coverage and Acceptance

Focused coverage must use controlled delayed responses and prove:

1. Rapid year switching: a delayed old group response cannot overwrite the new
   year's groups, selected `groupId`, loading state, error, or URL.
2. A delayed old academic-year response cannot restore an old year after a new
   hash navigation or refresh intent.
3. New year plus group selection resolves only after the new year's group list;
   the final UI and hash contain the canonical new year/group and no stale
   group cards or roster context.
4. Delayed responses during hash navigation preserve the destination route and
   do not leak old private context; valid historical selection and auth expiry
   regressions remain green.

Acceptance is met when only current-generation/current-context completions
commit, old group/groupId are intentionally cleared during year loading, the
canonical URL is reconciled as specified, existing auth/historical/
ownership/navigation/privacy behaviour is preserved, and focused plus
existing relevant tests pass without weakened assertions.

## Privacy, Failure, and Baseline Boundaries

Server authentication and ownership remain authoritative; a stale or failed
request never grants access or proves resource existence. `401` handling,
historical reads, safe user messages, and projection separation are preserved.
Stale/aborted failures produce no error; genuine current failures remain
visible and retryable under existing behaviour. No sleeps, automatic retries,
timeout changes, or test weakening are permitted.

Applicable Professional Engineering Baseline obligations are complete journey
coverage, one authoritative in-memory/URL context, intentional loading and
error states, persistence/reload and navigation correctness, authorization/
privacy preservation, and responsive teacher interaction preservation. API,
database, editable configuration, and migration obligations are N/A because no
such boundary changes.

## Rollout

Web-only source/test rollout with no migration, feature flag, dependency, or
server rollout. Rollback removes the generation guard and its focused tests;
no persisted data or API compatibility is affected.

## Simplicity Check

This is the smallest reliable fix at the existing hook boundary: request
snapshots, monotonic generation checks, and immediate dependent-context
clearing. It deliberately does not introduce a cache, reducer rewrite, client
data library, retry policy, sleeps, timeout changes, or new abstraction layer.
