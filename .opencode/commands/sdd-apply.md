---
description: Retired Apply compatibility boundary; use Portable Direct.
agent: sdd-apply
---

Classification: COMPATIBILITY SHIM.

STOP. `/sdd-apply` is retired and cannot select work, dispatch Apply, write
runtime state, progress a lifecycle, or perform any Git/VCS handoff.

Use the canonical Portable Direct entry point instead:

`/sdd-direct <SPEC-directory>`

The supported recovery entry point is `/sdd-resume`; it never advances beyond
Repository Ready. Read `docs/SDD-WORKFLOW.md` for the only lifecycle authority.
