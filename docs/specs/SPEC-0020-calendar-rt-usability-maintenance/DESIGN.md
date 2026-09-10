# SPEC-0020 — Calendar and RT Usability Maintenance

## Design

**Level B — Sol Design → Luna Build → Luna Verify.** This bounded UI/private-DTO maintenance builds on shipped [SPEC-0018](../SPEC-0018-academic-calendar-weekly-timetable-real-class-sessions/DESIGN.md) and [SPEC-0019](../SPEC-0019-rt-absent-term-average-energy/DESIGN.md). It adds no persistence, migration, privacy boundary, or cross-domain write. Terra review is not justified unless Build discovers one; then Build must stop and reclassify Level C.

## Behaviour and scope

The calendar remains a group-scoped weekly timetable of ISO weekdays and local `[start,end)` times. Persist `1=Monday` through `7=Sunday`; display full Monday–Sunday labels. Each selected-group row has weekday, start, end, and Remove; Add period creates a row. Zero or more periods are allowed; same-weekday overlap and overnight periods remain invalid.

**In:** hydrate timezone, three terms, and selected-group slots; weekday and multi-period editing; pre-session edit/save/cancel; actionable eligibility; immediate post-end RT read-only presentation; focused tests.

**Out:** holiday editing, term-model changes, persistence/migrations, session-history browsing, post-close RT correction, projection, M3 gems, Events, Challenges, Minigames, and broad visual redesign.

Holidays remain out of scope: every replacement preserves the loaded holidays unchanged. Other-group slots are also preserved. Before any real session, **Edit calendar** opens the hydrated draft; **Cancel** restores the server value; **Save** atomically replaces the calendar and exits edit mode. An unconfigured editable calendar opens setup directly. After any session history, or when archived, configuration is read-only with no mutation controls. Server rejection remains authoritative for races.

## Ownership and contracts

| Owner | Decision |
|---|---|
| `calendar` service | Retains validation, immutability, eligibility, and ownership. It derives `canReplace`; React does not infer authority. |
| Calendar DTO | Add `canReplace:boolean` to configured and unconfigured responses. Add status `reason` below; retain `configured`, `eligible`, and `active`. No student fields. |
| Workspace UI | Maps reason codes to copy, edits only the selected group's slots while preserving the rest, and owns the currently displayed active/just-ended session. |
| `rt` | SPEC-0019 remains authoritative. `RtGrid` reads an ended session through existing private GET, disables value/retry controls, labels **Read-only — class ended**, and performs no POST. It remains after End until group/year change or reload; durable history remains M10 scope. |

Status reason precedence is `ACTIVE_SESSION`, `UNCONFIGURED`, `OUTSIDE_TERM`, `HOLIDAY`, `OUTSIDE_TIMETABLE`, `USED_SLOT_DATE`, then `ELIGIBLE`; `eligible` is true only for `ELIGIBLE`.

| Reason | Teacher-facing message |
|---|---|
| `ACTIVE_SESSION` | A class session is already active. |
| `UNCONFIGURED` | Configure the calendar before starting class. |
| `OUTSIDE_TERM` | Today is outside the configured terms. |
| `HOLIDAY` | No class today: this date is a configured holiday. |
| `OUTSIDE_TIMETABLE` | The current time is outside this group's timetable. |
| `USED_SLOT_DATE` | This period has already been used today. |
| `ELIGIBLE` | Class can start now. |

## Privacy and failure boundaries

Calendar, session, and RT remain cookie-authenticated and teacher-private. Ownership-as-`404`, `401`, `422`, `409`, safe logging, and projection allowlists remain unchanged. UI state never authorizes writes. Failed load disables stale actions and offers retry; failed save preserves the draft; failed start/end/RT preserves its idempotency key. Replacement is atomic and never rewrites session history. C-01 continues to block real-data production.

## Tests and acceptance

- TDD calendar status tests cover every reason and precedence, including active session and used slot/date; API tests cover stable DTO codes, `canReplace`, ownership, and no student fields.
- Component tests cover ISO labels/values, multi-slot add/remove, complete hydration, cancel restoration, preservation of holidays/other-group slots, immutable read-only state, and load/save failures.
- RT tests prove ended grids load through GET, disable values/retries, show all saved values, and issue no closed-session write; server closed writes remain `409`.
- A dedicated Playwright journey creates a roster fixture, then uses the UI—not direct calendar PUT—to select today's weekday and encompassing local time, save, start, record `10`, `5`, `0`, and `Ausente`, end, and see the same grid read-only without editable controls. It also proves no private data reaches projection.
- Acceptance requires multiple non-overlapping periods to round-trip, exact status copy for all reasons, pre-session Edit/Cancel/Save and post-history lock, unchanged holiday/other-group data, preserved SPEC-0018 session rules, and preserved SPEC-0019 `10|5|0|ABSENT`, privacy, closed-write rejection, and zero M3 gem work.

## Rollout and working set

No migration, backfill, flag, seed, or dependency. Deploy and roll back API contract/UI together. Modify calendar service/mapper/routes/tests, contracts, workspace calendar/session/RT components/API/styles/tests, and `apps/web/e2e/calendar-sessions.spec.ts`.

**Threat matrix:** N/A — no routing, shell, subprocess, VCS, executable, or process-integration boundary.

**Simplicity Check:** two derived DTO fields, one explicit slot-list editor, existing replacement/read routes, and one end-state handoff solve the workflow. No table, history API, scheduler, generic form engine, holiday editor, projection change, or speculative domain abstraction is added.
