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
unrelated work, and stop on ambiguity, failed checks, unresolved real blockers,
or unsafe repository state. Explicit `/sdd-ship` invocation is sufficient
maintainer authorization. GitHub issues may be linked when they exist, but are
optional and never a shipping gate. Only this command may perform Git/VCS actions.
It may correct an unsuitable current branch by creating or switching
to a sensible candidate branch, then stage only the selected change and its
genuinely related fixes, create a conventional commit, push to origin, create
the PR, wait for required CI, and merge only when green. Never force, reset,
rewrite history, tag, release, deploy, or include unrelated work.

Ship is read-only with respect to work content: it must not edit DESIGN.md,
TASKS.md, VERIFY.md, implementation, tests, configuration, or candidate
documentation. Stale, contradictory, incomplete, or failing evidence requires
a bounded correction-required report and a stop; never silently fix it.
SDD_CONTRACT:SHIP_VERIFY_FRESHNESS_CANDIDATE_SCOPED

For non-trivial PR Markdown, create a literal-safe temporary body file under
`/tmp` using a literal-safe method such as a quoted heredoc, use `gh pr create
... --body-file <file>` or `gh pr edit ... --body-file <file>`, then clean up
the temporary file. Never stage temporary files and never
interpolate non-trivial Markdown through `--body`; preserve literal Markdown
metacharacters.
