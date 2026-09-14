# SPEC-0035 — Demo GEM cursor key

## Contract

The demo workflow supplies a deterministic, parser-compatible `GEM_CURSOR_KEYS`
default only to its child processes. `ECLIPSE_DEMO_GEM_CURSOR_KEYS` is the sole
override. Generic inherited `GEM_CURSOR_KEYS` is ignored. The override is
checked for the server parser's key-id/base64url 32-byte grammar, without
changing the server's own fail-closed startup validation.

## Scope

Change only `scripts/demo-workflow.mjs` and its focused Node test. No product,
database, dependency, or long-running demo changes.
