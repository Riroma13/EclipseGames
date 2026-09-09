---
name: sdd-apply
description: "Retired compatibility shim. Never invoke as an independent lifecycle."
disable-model-invocation: true
user-invocable: false
license: MIT
metadata:
  delegate_only: true
---

# Retired Apply compatibility skill

STOP. This skill is retained only so stale references fail closed. It is not a
second executor policy and must never select a SPEC, execute Apply, update
runtime state, progress a lifecycle, delegate work, or perform Git/VCS handoff.
Use the canonical Portable Direct lifecycle through `/sdd-direct`.
