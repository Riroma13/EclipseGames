# SPEC-DEMO-001 Tasks — Client Preview MVP

Preserve simplicity, the `Find the student → perform the classroom action → continue teaching` north star, C-01, B-01, and exclusions.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,300 authored |
| 400-line budget risk | High |
| Chained PRs recommended | No — approved exception |
| Suggested split | Four work units on branch |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception/current-branch-only |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Internal Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Safe deterministic seed | None | `pnpm exec vitest run apps/api/test/integration/seed-demo.test.ts` | `pnpm seed:demo` twice + production guard | Seed script/service, roster seam, root script |
| 2 | Workspace actions/presentation | None | `pnpm exec vitest run apps/web/src/workspace` | Authenticated workspace flow | Workspace TSX/CSS files |
| 3 | Browser journey/accessibility | None | `pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts apps/web/e2e/spec-0004-xp.spec.ts` | 3–5 minute demo | E2E/presentation changes |
| 4 | Integrated proof | None | `pnpm test && pnpm typecheck && pnpm build` | Seeded local teacher session | Whole SPEC working set |

## Phase 1: Seed Foundation (RED → GREEN)

- [x] 1.1 RED `seed-demo.test.ts`: production exits before `openDatabase`/mutation and development failures close safely; GREEN `scripts/seed-demo.ts`/`package.json` add explicit `pnpm seed:demo`, bootstrap reuse, no route/auth bypass.
- [x] 1.2 RED fixed-ID preflight tests for foreign/colliding owner, parent, shape, and partial recovery; GREEN `roster/service.ts` adds only `ensureOwnedDemoRoster`, validating all IDs before create and preserving unrelated rows.
- [x] 1.3 RED repeat/no-shortcut tests for deterministic 2026–2027 year/group, 16 fictional students, all specialties, and fixed UUID-v4 keys; GREEN `demo/seed-service.ts` uses roster ownership and `xp.create` only. Preserve the exact seed order: guard → bootstrap → roster → XP.
- [x] 1.4 RED authority assertions for `xp.getSummary`, event-time bonus, thresholds, badges, ownership lock, and replay counts; GREEN orchestration propagates errors without changing XP service/repository.

## Phase 2: Workspace Presentation (RED → GREEN)

- [x] 2.1 RED `demo-presentation.test.ts` for cards, progress/badge, archived/read-only, no-year/group/empty/no-match/loading/error/401/historical states; GREEN workspace TSX/helpers implement restrained navy/amber/green polish with existing CSS/Inter.
- [x] 2.2 RED tests for panel order, authoritative pending/success/failure XP, bonus, 10-second Undo, retry/repeat guard; GREEN wire existing `FastActionShell` through `WorkspaceApp.tsx`, `StudentPanel.tsx`, `workspace-api.ts`, and state without modifying files outside the approved Working Set.
- [x] 2.3 RED keyboard/focus/Escape, dialog name/trap/restore, status, 44px target, and reduced-motion assertions; GREEN refine roster/card/shell, `main.tsx`, and `styles.css` for laptop/tablet/no hidden action.

## Phase 3: Browser Journey and Boundaries (RED → GREEN)

- [x] 3.1 RED Playwright role/outcome tests for the AC-03 authenticated 30-student scan (use an approved 30-record fixture; do not enlarge the fixed 16-student seed), search/select, group switch, archive/no-match, tablet drawer, and no-scroll; GREEN update existing E2E specs/config only.
- [x] 3.2 RED canonical 3–5 minute sign-in → context → specialty match → XP → bonus/level/badge → Undo plus auth-expiry/privacy negatives; GREEN retain private auth/no rankings/future controls and document local bootstrap credentials.

## Phase 4: Final Validation

- [x] 4.1 Map AC-01–AC-15 to named tests/outcomes and run full validation; ask: “Can a client explain the product and next action within one minute?” and “Can a teacher use it while actively teaching without losing context?” Confirm C-01 remains production-only and exclusions remain absent.

## Phase Result

```yaml
status: success
executive_summary: Tasks Review approved the corrected four internal work units, B-01/C-01, Product Simplicity Principle, exclusions, and exception-ok current-branch-only forecast.
artifacts:
  repository: docs/specs/SPEC-DEMO-001-client-preview-mvp/TASKS.md
  engram_topic_key: sdd/spec-demo-001-client-preview-mvp/tasks
  lifecycle:
    current: Tasks Review approved with conditions
    next: Apply
next_recommended: Apply
risks:
  - 900–1,300 authored changed lines; high review risk, retained as approved size-exception/current-branch-only.
  - AC-03 requires an approved 30-record fixture while B-01 seed remains fixed at 16 students; do not silently change either scope.
  - C-01 remains production-blocking for real data and recoverability.
skill_resolution: paths-injected
```
