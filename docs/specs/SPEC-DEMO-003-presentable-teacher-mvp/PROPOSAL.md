# Proposal: SPEC-DEMO-003 — Presentable Teacher MVP

## Intent

Make the teacher MVP coherent around real data: understand context, find a student, act, see feedback, and continue teaching. Close gaps without inventing metrics, domain behavior, or architecture.

## Scope

### In Scope
- Refine hierarchy, roster scanability, student detail, XP/level/badge, feedback/undo, Eclipse Points, and assessment advantages.
- Add a Projection entry, preserving its route and allowlist.
- Surface real/derived context, summary, activity/history, or setup only where contracts support a small privacy-safe UI.
- Assess a deterministic seed extension only if varied truthful progression is a blocker; preserve fixed IDs, synthetic-only data, preflight, transactions, and idempotent replay.
- Extend journey, accessibility, privacy, and seed proof.

### Out of Scope
- Dashboards/charts, fake metrics/activity, rankings, enterprise navigation, student accounts, or history redesign.
- New domain/schema/BFF concepts, migrations, dependencies, or backend work absent a proven gap.
- Archived SPEC changes, production C-01, privacy boundaries, settled rules, or `coin` terminology.

## Capabilities

### New Capabilities
None; composition of capabilities.

### Modified Capabilities
- `teacher-classroom-workspace`: improve the authenticated journey and expose existing safe actions without changing domain semantics or private DTO boundaries.

## Approach

Reuse the React/Vite workspace, Fastify contracts, roster/XP/coin services, and projection route. Keep `Eclipse Points` teacher-facing and `coin` internal; use derived state and progressive disclosure. No aggregation. Do not imply the existing fixture projection represents the selected group.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/workspace/*`, `main.tsx`, `styles.css` | Modified | Workspace, setup, Projection handoff, responsive/accessibility. |
| `apps/web/e2e/*`, API/privacy tests | Modified | Journey, privacy, accessibility. |
| `apps/api/src/demo/*`, seed tests | Conditional | Only for a proven seed presentation blocker. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Projection or private data leakage | High | Preserve server allowlist; assert forbidden fields and URL/storage privacy. |
| UI implies unsupported selected-group projection | Med | Label the existing safe preview accurately; do not synchronize fixtures. |
| Seed changes corrupt or duplicate data | Low | Fixed-ID preflight, transactionality, synthetic-only data, replay tests, fail closed. |

## Rollback Plan

Revert this change's presentation/tests and any seed extension. Existing APIs, data, archived artifacts, and domain records remain untouched.

## Dependencies

Archived SPEC-0001–0005 and SPEC-DEMO-001/002 contracts; seeded SQLite/Playwright. No new dependency.

## Success Criteria

- [ ] A seeded authenticated teacher completes context → roster → student → XP feedback/undo → assessment advantage/reversal → safe Projection.
- [ ] Real/derived data only; no prohibited projection fields, rankings, fake activity, or private URL/storage state.
- [ ] Setup/history surfaces use existing contracts, preserve ownership/archive rules, and remain useful at classroom scale.
- [ ] Responsive, keyboard/focus, reduced-motion, projector-readability, and seed preflight/replay evidence passes.
