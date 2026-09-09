---
description: Run the canonical EclipseGames Portable SDD lifecycle.
agent: sdd-direct-orchestrator
---

Classification: EXECUTION ADAPTER.

`/sdd-direct <SPEC-directory>` is the canonical lifecycle entry point. The
explicit selector is a directory name below `docs/specs/`; it is validated
without guessing from numeric order. When the argument is blank, run the
read-only resolver:

```text
node scripts/sdd-resume.mjs --resolve-direct
```

Accept only a `READY` result. Zero active SPEC candidates returns `STOP` with
an explicit no-active result. Multiple plausible candidates return `STOP` with
their names. Archived, superseded, historical, and stale artifact trees never
become active through discovery.

The orchestrator is the single runtime persistence owner. It reads the project
profile, bootstraps or reuses `docs/specs/<SPEC>/.sdd-runtime/`, reconciles
runtime state with trace and authoritative lifecycle artifacts, and dispatches
only the next dependency-ready action. It uses the artifact names configured
by `.opencode/sdd-model-map.json` and never creates a second product/spec
tree.

The canonical lifecycle is:

```text
Design
-> Architecture Review
-> Design Refinement (only after a blocked review)
-> Tasks
-> Tasks Review
-> Tasks Refinement (only after a blocked review)
-> Apply
-> Apply Summary
-> Verify
-> Archive
-> Health Report
-> Repository Ready
-> STOP
```

Repository Ready is terminal for SDD. No command or agent may run `git add`,
commit, push, pull request, CI wait, merge, release, or tag. Material design,
security, scope, risk, and Git decisions remain HUMAN-owned.

Every executor returns exactly the outcome contract documented in
`docs/architecture/sdd-direct.md`. This command is only an entry adapter; it
does not itself select a phase, persist an outcome, or perform Git/VCS work.
