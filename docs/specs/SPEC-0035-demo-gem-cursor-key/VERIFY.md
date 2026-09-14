# SPEC-0035 Verification

## Verdict

**PASS WITH WARNINGS** — all bounded SPEC-0035 tasks and focused acceptance
checks pass. No critical findings. The warning is limited to the intentionally
omitted long-running demo smoke and the historical canonical-database migration
failure recorded below.

## Commands and results

| Command | Exit | Result |
|---|---:|---|
| `pnpm test:demo-workflow` | 0 | PASS; 12/12 Node tests passed, 0 failed/skipped. |
| `node --check scripts/demo-workflow.mjs && node --check scripts/demo-workflow.test.mjs` | 0 | PASS; both focused files parsed successfully. |
| `pnpm typecheck` | 0 | PASS; web and API TypeScript checks completed successfully. |
| `pnpm --filter @eclipse/api exec tsx --eval "delete process.env.GEM_CURSOR_KEYS; const { createServer } = await import('./src/server.ts'); try { createServer(':memory:', { logger: false }); process.exit(1); } catch (error) { if (!(error instanceof Error) || !error.message.includes('GEM_CURSOR_KEYS invalid or missing')) process.exit(2); }"` | 1 | The check harness failed because `tsx --eval` uses CommonJS and rejected top-level `await`; this was a command-form issue, not an application failure. |
| `pnpm --filter @eclipse/api exec tsx --eval "(async () => { delete process.env.GEM_CURSOR_KEYS; const { createServer } = await import('./src/server.ts'); try { createServer(':memory:', { logger: false }); process.exit(1); } catch (error) { if (!(error instanceof Error) || !error.message.includes('GEM_CURSOR_KEYS invalid or missing')) process.exit(2); } })();"` | 0 | PASS; API startup remains fail-closed when `GEM_CURSOR_KEYS` is missing. |

## Compliance findings

| Area | Evidence | Status |
|---|---|---|
| Deterministic default | `DEFAULTS.GEM_CURSOR_KEYS` is a fixed 32-byte base64url secret with `active` key id. | PASS |
| Namespaced override | Only `ECLIPSE_DEMO_GEM_CURSOR_KEYS` is read into the demo environment; generic inherited `GEM_CURSOR_KEYS` is ignored. | PASS |
| Parser-compatible validation | Override validation enforces key-id grammar, canonical base64url decoding to exactly 32 bytes, unique key ids, unique secrets, and rejects malformed/newline/duplicate input. | PASS |
| Server boundary | `server.ts` still parses `process.env.GEM_CURSOR_KEYS` and aborts startup on missing/invalid configuration; focused runtime check passed. | PASS |
| Privacy/safety | Demo remains development-only, loopback-only, local SQLite-only, and its ownership/reset safety tests pass. No student or cursor data is exposed by the workflow changes. | PASS |
| Scope | Code/test changes inspected only on the named surface; no product, database, dependency, or long-running demo behavior is required by DESIGN. | PASS |
| Configuration placeholder | `.env.example` retains `GEM_CURSOR_KEYS=`; no generic configuration was repurposed. | PASS |

## Task and acceptance matrix

- [x] Deterministic demo-only cursor-key default and `ECLIPSE_DEMO_*` override —
  implemented and covered by focused tests.
- [x] Minimal override grammar validation while retaining server fail-closed
  behavior — implemented and covered by focused tests plus the runtime startup
  check.
- [x] Focused precedence and safety-boundary tests — 12/12 passed, including
  generic isolation, malformed/newline/duplicate rejection, production refusal,
  reset-path protection, and ownership recovery safety.

## Residual risk and omitted checks

- `pnpm dev:demo` was not run in this verification, as TASKS explicitly excludes
  long-running demo smoke and Terra; Playwright and Terra were not invoked.
- Prior repository evidence reports that a readiness smoke reached the existing
  canonical database migration and failed at `0014_behaviour_lives` with
  `no such column: movement_id`, before either service started. That integration
  issue is outside DESIGN scope and was not modified here.
- No coverage command applies to this focused Node workflow test; runtime
  behavior is directly exercised by the 12 passing tests and the fail-closed
  startup probe.

## Governance

No Git/VCS, Ship, Terra, Playwright, or long-running demo command was executed.
