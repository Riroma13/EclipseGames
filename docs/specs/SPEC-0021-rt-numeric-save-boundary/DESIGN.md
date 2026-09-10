# SPEC-0021 — RT Numeric Save Boundary

## Design decision

**Level A — Luna Build → Luna Verify.** Repository evidence confirms a local UI-boundary defect: native `<select>` values are strings, while `RtGrid` casts them to `RtValue`; the shipped private API correctly accepts only runtime `10 | 5 | 0 | "ABSENT"`. This design preserves the contracts shipped by [SPEC-0019](../SPEC-0019-rt-absent-term-average-energy/DESIGN.md) and [SPEC-0020](../SPEC-0020-calendar-rt-usability-maintenance/DESIGN.md). There is no migration, sensitive-boundary change, or cross-domain effect, so Terra review is not justified. Reclassify only if Build discovers one.

## Behaviour

At the `RtGrid` DOM boundary, map only `"10" → 10`, `"5" → 5`, `"0" → 0`, and preserve `"ABSENT" → "ABSENT"`. Do not use a type assertion as runtime conversion. Empty or unexpected select strings must not trigger a save.

Selection continues to autosave one student immediately. A successful save refreshes the term summaries before showing a short, unobtrusive `RT saved.` live status. A failed save keeps the selected value, exposes `RT could not be saved. Retry.` and `Retry RT`, and retries the identical value with the same idempotency key. A success clears that pending retry.

## Scope

**In:** the RT select-to-domain mapping, focused runtime-type tests for all four choices, minimal save success feedback, and stronger active-session Playwright evidence.

**Out:** backend coercion or validation changes; RT domain, average, Energy, streak, entitlement, persistence, roster, and session rules; migrations or backfills; calendar behaviour; M3 gems; XP, behaviour, rubric, export, projection, narrative, history, ranking, visual redesign, and unrelated maintenance. SPEC-0019 and SPEC-0020 remain unchanged.

## Ownership

| Owner | Contract |
|---|---|
| `apps/web/src/workspace/RtGrid.tsx` | Owns explicit conversion from DOM strings to the existing web `RtValue`, autosave state, summary refresh, and save feedback. |
| `apps/web/src/workspace/workspace-api.ts` | Retains the typed `RtValue` request contract and existing idempotency-key forwarding; no API shape change. |
| Fastify RT route/domain/service | Remain authoritative for strict runtime validation, ownership, canonical semantics, persistence, replay, and closed-session rejection. No coercion. |

## Data, API, and UI effects

No schema, stored-data, DTO, endpoint, status-code, or server-validation change occurs. The POST body changes only for the defective numeric UI paths: JSON values are numbers instead of native-select strings. `ABSENT` remains the exact string.

The grid keeps its current controls and summaries. Success feedback uses the existing status region and appears only after both save and summary refresh succeed; failure feedback and row-level retry remain actionable. Read-only ended sessions still emit no POST.

## Privacy and failure boundaries

Cookie authentication, teacher ownership, ownership-as-`404`, private RT DTOs, safe logging, and server-side projection allowlists remain unchanged. No student data enters projection or a new client/server surface. C-01 continues to block real-student production use.

Unknown/empty DOM values fail locally without a request. Server rejection remains authoritative and must not be weakened by `Number(...)`, Zod coercion, or broad parsing. A POST or summary-refresh failure retains the original value and idempotency key for retry; success clears retry state only after the refreshed summary is available.

## Tests and acceptance

- Add a focused Vitest contract test beside `RtGrid` for `"10"`, `"5"`, `"0"`, and `"ABSENT"`; assert exact values and runtime types (`number`, `number`, `number`, `string`). Also prove empty/unrecognized strings do not produce an RT value.
- Preserve existing API/domain tests as evidence that string numerics are rejected and canonical numeric/`ABSENT` values persist; do not change the strict validator to make the UI test pass.
- Extend `apps/web/e2e/calendar-sessions.spec.ts`: during the active session, wait for a numeric RT POST, assert its JSON value is a number (not `"10"`), then read the private RT endpoint and assert that student's persisted entry is numeric. Retain the four-choice workflow, end-session read-only assertions, and privacy assertion.
- Verify retry uses the same idempotency key after failure, successful autosave refreshes the term summary, and `RT saved.` does not replace failure/retry affordances.

Acceptance requires all four mappings to have the stated runtime types; at least one numeric choice to be proven sent and persisted by Playwright; `ABSENT`, autosave, summary refresh, same-key retry, and ended-session read-only behaviour to remain intact; and no backend, persistence, privacy, calendar, M3, or other-domain change.

## Rollout

Ship web code and tests together. No migration, backfill, feature flag, seed, dependency, API coordination, or data repair is required. Rollback restores the prior web bundle; persisted canonical RT rows remain valid.

**Threat matrix:** N/A — no routing, shell, subprocess, VCS, executable-file, or process-integration boundary.

## Simplicity Check

One explicit four-case UI mapping, one focused test file, one existing E2E journey extension, and one status message fix the defect. No generic parser, new dependency, backend coercion, state framework, endpoint, table, setting, or cross-domain abstraction is introduced.
