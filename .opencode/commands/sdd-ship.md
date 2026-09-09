---
description: Explicitly ship a verified SDD Lite change.
agent: sdd-lite-ship
---

This execution was entered through `/sdd-ship`. Ship authorization is granted
by this command entry point; do not require the delegated user message to repeat
the command.
Ship the optional SPEC/change argument `$ARGUMENTS`; when it is empty, infer the
candidate from repository evidence rather than asking the maintainer to repeat
the command or name.

Re-run verification, confirm the intended diff and current branch, preserve
unrelated work, and stop on ambiguity, failed checks, missing approval, or
unsafe repository state. Only this command may perform Git/VCS actions. It may
stage the intended diff, create a conventional commit, push the current branch
to origin, create the PR, wait for required CI, and merge only when green.
Never force, reset, rewrite history, switch branches, tag, release, deploy, or
include unrelated work.
