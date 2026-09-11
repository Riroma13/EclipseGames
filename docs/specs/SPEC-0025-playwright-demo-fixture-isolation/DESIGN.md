# SPEC-0025 — Playwright Demo Fixture Isolation

## Classification

**Level A — local test-harness maintenance.** No application, production, schema,
privacy DTO, or user-facing behaviour changes.

## Behaviour and Root Cause

Every Playwright invocation must own a fresh SQLite database and perform the
normal demo setup before serving tests. The current `playwright.config.ts`
hardcodes `/tmp/eclipse-playwright.sqlite` and sets `reuseExistingServer: true`.
That permits a prior server/database to be adopted; bootstrap is non-destructive,
and seed may be skipped entirely. A prior mutation or archived `DEMO_PRESET`
(`Weekend Story`) therefore survives and can either appear stale or make the
fail-closed seed preflight throw. Explore found no current E2E test mutating the
fixed preset; the contamination is the shared harness lifecycle.

## Technical Approach and Ownership

Change only the Playwright web-server configuration. At config evaluation,
generate one unique path in the OS temporary directory for that invocation.
Pass that exact path to bootstrap, `seed:demo`, and the API process. Set
`reuseExistingServer: false`, so setup always runs and an occupied endpoint
fails rather than attaching to an unknown server. The setup chain remains
ordered: bootstrap, demo seed, web build, then API startup. The invocation owns
the generated database path and server process; `bootstrap.ts` and
`seed-service.ts` retain ownership of setup semantics and collision protection.

The deterministic reset boundary is **before server readiness**: a new path is
selected, setup completes against that empty database, and only then can tests
run. No application reset endpoint, arbitrary deletion, or per-test reset is
introduced. The temporary file is disposable harness state; server shutdown
ends the invocation lifecycle.

## Data, API, UI, Privacy, and Failure Effects

- Data: only temporary Playwright SQLite state changes; fixed IDs and the normal
  fictional roster remain unchanged. Same-database seed replay remains
  idempotent and fail-closed.
- API/UI: no route, DTO, React, authentication, or normal demo workflow change;
  Weekend Story continues to be supplied by the existing demo seed.
- Privacy: the generated path contains no student data supplied by users, and
  no database contents or credentials are logged. Production seed refusal is
  unchanged.
- Failure: bootstrap or seed failure stops the chain and prevents a server from
  becoming ready. A stale/external server is never reused. Build or API
  startup failure remains a failed Playwright invocation, not a fallback to
  existing state.

Normal Playwright worker parallelism is preserved within one invocation. Any
mutating test must create and persist uniquely named test entities, retain
ownership of those entities, and mutate/archive only those entities. It must
not mutate or archive canonical seed records such as `Weekend Story`. If a
regression genuinely requires mutation of canonical state, it must run behind
a separate invocation boundary with its own database; it must not share an
invocation with read-only canonical-seed assertions. This design does not
globally serialize workers and does not claim per-test database isolation.
Separate invocations receive separate databases; no timeout, retry, sleep,
record rename, or serialization is used as a workaround.

## Planned File Ownership

| File | Planned action |
|---|---|
| `playwright.config.ts` | Allocate the invocation database, pass it consistently, and force setup/server startup. |
| `apps/web/e2e/*.spec.ts` or focused harness test location | Add regression coverage only where needed; do not change product assertions or seed data. |

No API, seed-service, migration, schema, or UI file is planned for modification.

## Tests and Acceptance

Focused Playwright/harness evidence must prove:

1. A fresh invocation displays the canonical `Weekend Story` seed without
   mutating it.
2. A mutating regression creates and persists a uniquely named entity that it
   owns, edits or archives only that entity, and leaves the canonical seed
   record unchanged; a fresh invocation still runs setup and sees the canonical
   `Weekend Story` seed.
3. Focused tests, including the canonical-seed assertion and mutating
   regression, can run concurrently under normal Playwright workers without
   cross-test contamination, global serialization, or invocation order
   dependence.
4. Repeated invocations, including two consecutive runs, both seed successfully
   and do not depend on the prior database/server.

Acceptance is met when setup is mandatory per invocation, the database path is
unique per invocation, the normal seed contract remains green, all four cases
pass concurrently and in either order, mutating coverage owns non-canonical
entities (or uses a separate invocation boundary), and no product or
production behaviour changes.

## Baseline, Threat Boundary, Rollout

Applicable Professional Engineering Baseline obligations are deterministic
setup, intentional loading/readiness and failure states, repeatable recovery,
persistence/reload correctness, and test coverage of the end-user demo journey.
Responsive UI, classroom interaction, authorization, and production backup are
N/A because this is test infrastructure only. Process integration is applicable:
the path is internally generated and bounded, setup commands remain ordered,
and no untrusted path or unrelated process is accepted; RED coverage proves
stale-server reuse and skipped-seed conditions fail closed. Git/VCS, routing,
PR, and deployment boundaries are N/A.

Rollout is a single harness change with focused and full Playwright verification.
No migration, feature flag, dependency, or production rollout is required.

## Simplicity Check

This is the smallest reliable fix: one generated temp-path value and one
`reuseExistingServer` setting at the existing harness boundary. It reuses the
current bootstrap and seed, keeps workers parallel, adds no reset framework,
lock, retry policy, timeout tuning, serialization, API, or application state.
