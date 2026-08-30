# SPEC-DEMO-003 — Presentable Teacher MVP
## Design

**Status:** Archived / verified after `PASS WITH WARNINGS`  
**Depends on:** Archived SPEC-0001–0005 and SPEC-DEMO-001/002  
**Delivery:** Chained; keep each review slice within the 400-line budget.

## Technical Approach

Refine authenticated `/#/workspace`, not the domain. `WorkspaceApp` owns opaque context and loaded roster/XP summaries; its header states the selected year/group and derived compact facts. `StudentRoster`/`StudentCard` remain the scan surface and `StudentPanel` the private detail/action surface. Reuse existing contracts; add no BFF, schema, dependency, chart, ranking, or grade inference.

## Architecture Decisions

| Decision | Alternatives / trade-off | Rationale |
|---|---|---|
| Client composition | BFF/dashboard | Derive compact summary from `students`/`summaries`; summary failure is unavailable, never zero. |
| Bounded private XP activity | Fake feed; history redesign | Existing owned/paginated endpoint supplies latest three factual events (category, base/bonus/effective, reversal/time), omitting comments and grades. |
| Labelled fixture projection | Sync selected group; pass state | Link to `/` has no payload and explicitly is not the selected group; it retains its server allowlist. |
| Create-only setup disclosure | Full management/new API | Create year when absent, group for writable year, and one 1–30-student batch; refresh canonical data. No edit/archive/move, so server ownership/archive/atomicity/alias/correction-lock rules stand. |
| Deterministic seed extension | Uniform/fabricated state | Seed evidence lacks L2+, multiple badges, and balances beyond 2/0. Add fixed synthetic plan entries for L1/L2/L3, multiple badges, and 0/1/2/3 points while preserving guards/replay. |

## Data Flow and Contracts

```
years/groups/students + group XP summaries -> WorkspaceApp -> header/roster -> StudentPanel
StudentPanel -> existing XP/coin/assessment writes -> authoritative summary/balance + feedback/undo
StudentPanel -> XP evidence(limit=3) -> private factual recent activity
workspace link (/) -> projection route -> server allowlist -> fixture preview
```

Extend `workspace-api.ts` only with typed wrappers for existing endpoints: XP evidence with `{ academicYearId, limit: 3 }`, year/group/student creation. Keep `coin` in TypeScript/API names and **Eclipse Points** in UI. Hash state remains only UUID `year`, `group`, and `student`; never put names, notes, XP, balances, assessment data, or projection identifiers in URL or browser storage.

## Failure and Privacy Boundaries

Keep the roster visible on summary/activity failure with inline recovery text. Disable duplicate submits; retain idempotency/reversal. On 401 clear private state. Projection stays authenticated/server-authoritative: never render/request teacher fields (name, RT, rubric/grade, XP breakdown/comments, incidents, disciplinary/history), or widen `projection/mapper.ts`. C-01 remains production-only. XP is evidence, not a grade; points, behaviour, and narrative rules do not change.

## Working Set and Read Order

| File | Action | Purpose |
|---|---|---|
| `apps/web/src/workspace/WorkspaceApp.tsx`, `StudentRoster.tsx`, `StudentCard.tsx`, `StudentPanel.tsx`, `workspace-api.ts`, `styles.css` | Modify | Hierarchy, summary/activity/setup, responsive/a11y. |
| `apps/web/src/workspace/ClassroomSetup.tsx` | Create | Minimal create-only year/group/batch setup. |
| `apps/web/src/main.tsx` | Modify | Labelled no-payload fixture-preview entry and projection presentation only. |
| `apps/api/src/demo/seed-service.ts`, `apps/api/test/integration/seed-demo.test.ts` | Modify | Conditional but required seed variety plan and replay/collision assertions. |
| Existing workspace/API/Playwright tests | Modify | Contract, privacy, setup, and journey evidence. |

Read: this Design; workspace app/API/state; panel-roster-card/styles; main/projection routes/tests; roster routes/service/tests; XP routes/mapper; seed service/tests; Playwright selectors. Do not modify archived SPEC artifacts, schema, migrations, packages, or projection allowlist.

## Testing Strategy

| Layer | Evidence |
|---|---|
| Unit | Derived summary/activity formatting and API wrappers; unavailable is distinct from zero. |
| Integration | Existing roster validation/ownership/archive/batch atomicity/correction lock; seed fixed-plan preflight, production refusal, transaction/replay, exact varied level/badge/point results. |
| Playwright | Seeded context → scan/search → private detail → XP feedback/undo → advantage/reversal → labelled projection; keyboard/focus, reduced motion, 320px/800px/projector, no overflow. Assert allowlist-only output and private URL/storage exclusion. |

## Threat Matrix

The route/link boundary is applicable: safe link is `/` with no propagated state; a missing/failed projection remains a safe error, never a private fallback.

| Boundary | Applicability | Design response / RED test |
|---|---|---|
| Projection route/link | Applicable | Link carries no query/hash/private state and is fixture-labelled; Playwright asserts URL/storage and projection body exclusion. |
| Documentation-like paths; Git selection; commit; push; PR commands | N/A | No executable classification, shell/process, or VCS/PR automation is added. |

## Migration / Rollout

No schema migration or feature flag. Deploy presentation with the existing seeded test bootstrap; rollback is a revert of this SPEC's UI/tests and seed plan. Seed remains development-only and synthetic.

## Simplicity Check

1. New surfaces serve context → student → action → continue; no dashboard/navigation expansion.
2. Existing APIs/state perform all work; no BFF/domain/schema concept.
3. After selection, XP and advantage actions remain direct with visible undo.
4. No academic, gamification, behaviour, narrative, or privacy rule changes.
5. Remove decorative metrics, rankings, fake activity, and unsupported management; retain only truthful context, recovery, setup, and safe projection.

## Open Questions

None.
