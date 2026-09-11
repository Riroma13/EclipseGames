# SPEC-0022 — Persistent Demo Development Workflow

## Design

**Level B — Sol Design → Luna Build → Luna Verify.** This local tooling bugfix
preserves existing Vite, Fastify, SQLite, migration, bootstrap, seed, and
watcher contracts. It changes no schema, production path, product API/UI,
student-data boundary, or deployment behavior. Reclassify to Level C if that
scope, arbitrary deletion, or unrelated-process termination becomes necessary.

## Behaviour and scope

`pnpm dev:demo` resolves development defaults before any side effect:
`NODE_ENV=development`, the canonical demo SQLite path, API `127.0.0.1:3199`,
Vite `127.0.0.1:5173`, existing origins, and demo credentials. Generic inherited
values **cannot override** them. Retain overrides only through validated
`ECLIPSE_DEMO_*` variables (same allowlist, loopback/port/origin/path/password
validation); reject production or malformed values first. Do not read/rewrite
`.env` or log passwords/database contents.

Startup runs `pnpm migrate`, then directly spawns existing `tsx watch
src/server.ts` and Vite commands in detached POSIX process groups.
It waits for bounded HTTP readiness (`/health` for API and the Vite root), not
merely successful spawn. Spawn errors and early exits are observed from the
first event; either failure cancels readiness, reports its causal command/status,
and cleans up both groups. Readiness timeout is failure. Once ready, HMR,
`/api` proxying, watcher restart, and persistent SQLite behavior remain as-is.

## Ownership and recovery

**Decision:** ownership and recovery are per recorded component, not an
all-or-nothing stack decision. The runner owns only a recorded API process
group or Vite process group that is individually proven by its PID, `/proc`
start identity, process-group identity, expected command fingerprint, and
recorded endpoint matching the current validated environment. PID reuse,
command mismatch, endpoint mismatch, missing/invalid component records, or
any other incomplete proof is never ownership.

Before preflight, the atomically-created per-user runtime ownership record
contains a random token, independently optional API and web records, leader
PIDs, `/proc` start identities, expected command fingerprints, endpoints, and
creation time. Each recorded component is classified independently:

- A proven owned component receives bounded TERM, then KILL escalation; its
  record is cleared only after termination is attempted safely.
- A component with no matching process is stale. It may be cleared only when
  its endpoint is confirmed unoccupied; otherwise recovery fails closed and
  retains the record.
- An occupied endpoint with no matching identity, an identity mismatch, or an
  endpoint mismatch is an unrelated/unproven occupant. It is never killed,
  signalled, adopted, or used for startup. Recovery reports the endpoint and
  refuses startup, even when the other component is proven owned.

Consequently, stale owned API-only, stale owned Vite-only, and partially stale
API/Vite records each recover the individually proven group(s), while an
unproven remaining endpoint remains untouched and blocks the retry. If all
components are absent or safely recovered and both endpoints are clear, the
record is removed only when its token still matches; otherwise the updated
record is retained for safe subsequent inspection/recovery. Cleanup is
idempotent and token-checked, and handles Ctrl-C, SIGTERM, spawn failure,
readiness failure, child exit, and a second signal.

`pnpm demo:reset` remains an explicit guarded destructive operation: production,
occupied ports, non-canonical paths, symlinks, non-files, and sidecars are
refused; only the exact database and `-wal`/`-shm` files are removed; existing
`migrate`, `bootstrap`, and `seed:demo` run sequentially. It has no stale
recovery or implicit invocation.

## Data/API/UI and privacy boundaries

No persistent application data, DTO, route, API contract, UI, auth, projection,
or production configuration changes. New state is local, non-sensitive runtime
ownership metadata outside the database; it contains no credentials or student
data. Diagnostics identify command, endpoint, cause, and remediation without
secrets. Migration/reset/seed guards remain authoritative.

## Ownership by file

| File | Planned change |
|---|---|
| `scripts/demo-workflow.mjs` | Defaults/validated namespace, ownership record, stale recovery, readiness, supervision, cleanup, diagnostics. |
| `scripts/demo-workflow.test.mjs` | RED tests and regression coverage for every contract below. |
| `package.json` | No new command; preserve only `dev:demo`, `demo:reset`, and existing commands. |
| `docs/SDD-WORKFLOW.md` | Document precedence, ownership/recovery, readiness, persistence, and explicit reset. |

## Tests and acceptance

Node tests cover generic-env rejection, valid/invalid overrides,
pre-side-effect production/malformed refusal, atomic ownership and PID-start /
command identity checks, stale owned API-only, Vite-only, and partially stale
recovery, refusal to touch unrelated or identity-mismatched occupants,
readiness success/timeout, immediate spawn error/early exit, causal status,
signal escalation, second-signal cleanup, descendant cleanup, reset
order/exact-path guards, and token-safe ownership cleanup. Runtime/E2E checks
cover API/Vite binds, health and proxy, HMR, watcher restart, persistence
without reseed, clean Ctrl-C, each stale recovery shape, occupied-port safety,
and the unchanged generic workflow. Documentation must match these contracts.

## Professional Engineering Baseline

Applicable obligations are deterministic normal, loading/readiness, failure,
retry/recovery, persistence/reload, and safe diagnostics; tests prove each.
Privacy and data integrity require no secret/student-data logging and no
destruction outside canonical reset. Responsive UI, classroom interaction,
authorization, and production backup are N/A: no product or production surface
changes.

## Threat matrix

| Boundary | Status and contract |
|---|---|
| Process integration | **Applicable:** argument-vector spawning, bounded readiness, identity-checked groups, causal failures, escalation, and RED tests for injection-like values, exits, descendants, and unrelated occupants. |
| Documentation-like paths | **N/A:** documentation is not executable or classified as a command. |
| Git repository selection | **N/A:** no Git/VCS command. |
| Commit state | **N/A:** no commit/index handling. |
| Push state | **N/A:** no push handling. |
| PR commands | **N/A:** no PR automation. |

## Rollout

No migration, backfill, feature flag, or dependency. Land runner, focused tests,
and documentation together; verify fresh startup and recovery. Rollback removes
only these local entry-point changes and leaves the demo database intact.

## Simplicity Check

One Node standard-library runner remains the sole owner. The ownership record,
readiness probes, and validation are the minimum safety needed to distinguish
this workflow from unrelated processes and recover deterministically. No
process-manager package, shell composition, lock service, database state, UI,
generic configuration system, or production coupling is introduced.
