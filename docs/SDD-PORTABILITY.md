# SDD Portable v1 Boundary

EclipseGames adopts the generic Portable runtime through one project profile,
not through a product-specific runtime fork.

## Project Adapter

`.opencode/sdd-model-map.json` is the single profile and routing source. It
declares:

- project identity and Engram memory key;
- `docs/specs/` as the active change root;
- `.sdd-runtime/` state, trace, recovery, lock, and checkpoint layout;
- lifecycle artifact names and in-place archive behavior;
- context and invariant sources;
- semantic Design topics, aliases, and review meanings;
- SOL/HIGH/MID/LOW/HUMAN routing and the terminal Git boundary.

The profile does not copy product requirements, historical SPEC content,
secrets, application files, or a second `openspec/specs/` tree.

## Runtime Contract

The same runtime supports the generic Portable default (`openspec/changes/`
with its default lifecycle) and the EclipseGames profile (`docs/specs/` with
repository-native uppercase artifact names). Path containment, identity
validation, SHA-256 fingerprints, exclusive locks, atomic JSON writes,
append-only trace events, and fail-closed transitions are shared behavior.

Resume reads the selected runtime state, reconciles event-first interruption
with authoritative artifacts, and returns the next dependency-ready phase. It
never selects a SPEC by number and never advances beyond Repository Ready.

## Commands

```text
/sdd-direct <SPEC-directory>
/sdd-resume
```

`/sdd-apply` is retained only as a STOP-only compatibility shim. It cannot
select work, execute Apply, progress state, delegate, or perform VCS handoff.

## Verification

```text
pnpm sdd:validate
pnpm sdd:validate:design -- --active-only docs/specs/<SPEC-DIRECTORY>/DESIGN.md
pnpm sdd:validate:design -- --historical-diagnostic docs/specs/<HISTORICAL-SPEC>/DESIGN.md
pnpm test:sdd-runtime
```

Lifecycle validation is active-only. Historical diagnostics are explicit and
never reactivate or create a SPEC.

Repository Ready is the terminal SDD boundary. HUMAN maintains Git add/commit,
push, pull requests, CI wait, merge, release, tag, branch, and history actions.
