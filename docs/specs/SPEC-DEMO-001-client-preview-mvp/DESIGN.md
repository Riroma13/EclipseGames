# SPEC-DEMO-001 — Client Preview MVP
## Design

**Status:** Architecture Review approved with conditions (B-01 scope) / pending maintainer approval | **Owner:** Maintainer | **Date:** 2026-08-23  
**Depends on:** archived SPEC-0002/0003/0004 | **Related:** DEC-012

> Demonstrate the existing classroom workflow: **find student → award XP → continue teaching**.

## 1. Approach, direction, and IA

Polish—not replace—the existing `/#/workspace` and real roster/XP contracts. The restrained **academy signal desk** uses navy surfaces, muted labels, amber selection, green success, and compact progress—never a dashboard, ranking, gradient, or casino mechanic. Retain the system/Inter stack, 1100px shell, and CSS variables; refine only workspace spacing, hierarchy, borders, avatars, status, and progress.

```
Identity / year / group / search
            ↓
Roster grid (15–25 demo students) → selected panel
                                  identity → specialty → annual XP/level
                                  → badge → Register XP → feedback/Undo
```

Header makes year/group unmistakable; search is adjacent. Dense full-button cards show avatar, real name, alias, specialty, optional level/progress/badge; rail marks selection/focus/touch, archived is read-only. The existing panel order is fixed; desktop rail/tablet dialog, never a page. XP is dominant: category then +1/+2/+3, explicit flat `+1`, pending/success/failure, existing 10-second undo, retry, and repeat guard. Progress is individual, never comparative.

| Decision | Choice / rationale |
|---|---|
| Data and mutations | Reuse authenticated roster, XP summaries, create and reversal APIs; authoritative response updates UI. No fake state, API redesign, or optimistic totals. |
| Demo seed | One explicit `pnpm seed:demo` development command. A narrow service-owned orchestration composes roster and XP services, uses fixed internal IDs/request keys, and refuses `NODE_ENV=production` before opening/mutating the database. No HTTP route, schema flag, or direct script SQL. |
| Entry | Normal teacher login only. Document the existing development bootstrap credentials/seed command for local demo; do not add a public route, bypass, shipped production secret, or session change. |
| Responsiveness | Wide: 3-card grid + rail; tablet: 2-card grid + modal drawer; narrow: one column. Context wraps, search remains usable, and no normal horizontal scrolling or hidden XP action. |

## 2. States, accessibility, and demo

No-year/no-group/empty/no-match/loading states explain the next action. API failure retains context with Retry; `401` clears private memory; archived records are labelled/action-free. Preserve semantic controls, labels, focus, practical 44px targets, reduced motion, polite status, Escape, roster keyboard selection, focus trap/restore, and dialog name; no WCAG claim.

**Demo:** sign in; identify year/group; search/select specialty student; award matching XP; show bonus, level/badge, Undo; switch group; show no-match and archived. Fictional/private data only.

**Exclusions:** coins/shop, RT/Energy, streaks, behaviour, assessment, advantages, narrative, projection, exports, history, real data, production demo subsystem, dependencies, and domain redesign. Backend impact is seed-only; a missing frontend contract is a blocker. Dependencies: none.

## 3. Working Set and contracts

| Action | Exact files |
|---|---|
| Create | `apps/api/scripts/seed-demo.ts`; `apps/api/src/demo/seed-service.ts`; `apps/api/test/integration/seed-demo.test.ts`; `apps/web/src/workspace/demo-presentation.test.ts`; this `DESIGN.md` |
| Modify | `package.json`; `apps/api/src/roster/service.ts`; `apps/web/src/{main.tsx,styles.css}`; `apps/web/src/workspace/{WorkspaceApp,WorkspaceShell,StudentRoster,StudentCard,StudentPanel,workspace-api}.ts(x)`; `apps/web/e2e/{teacher-workspace,spec-0004-xp}.spec.ts`; `playwright.config.ts` |
| Do not modify | API routes, XP service/repository, schema/migrations/contracts, auth/session implementation, projection, domain packages, manifests/lockfile except root script, or stable context except `SESSION.md` lifecycle. |

Read order for Tasks/Apply: this Design; `AGENTS.md`; workflow; SPEC-0002/3/4 Designs plus Verify/Archive/Health evidence; `package.json`, `apps/api/scripts/bootstrap.ts`, `db/{client,path,migrate}.ts`, roster service/repository, XP service/repository, and focused integration tests; then listed workspace files/config/E2E. Non-working-set: future domains, projection, deployment/backup, and OpenSpec areas.

## 4. Tests and acceptance

| Layer | Coverage |
|---|---|
| Vitest | Presentation helpers, card variants, progress/badge, and RED-first service-owned seed process/integration tests. |
| API | Existing SPEC-0002/0004 privacy/auth/XP contracts remain evidence; no new behavior. |
| Playwright | Seeded login/context, search/select, XP states/bonus/undo, level/badge, group/no-match/archive, tablet, keyboard/focus/Escape; assert roles/outcomes. |

- [ ] **AC-01–02:** `pnpm seed:demo` is explicit, synthetic-only, deterministic/idempotent, refuses production before mutation, and supplies authenticated year/group/student context immediately.
- [ ] **AC-03–05:** 30-student scan, accessible search/selection, and panel identity/specialty/XP/action priority work.
- [ ] **AC-06–08:** real SPEC-0004 pending/success/failure XP, understandable bonus/annual level/badge, and undo work.
- [ ] **AC-09–11:** actionable empty/loading/error/auth-expiry/historical states; laptop/tablet no-scroll critical flow; keyboard/focus/Escape contracts work.
- [ ] **AC-12–13:** no fake behavior, ownership/auth bypass, real data, backdoor, direct-table seed shortcut, or future logic; private data/auth remain intact.
- [ ] **AC-14:** deterministic 3–5-minute flow has practical automated evidence.
- [ ] **AC-15:** every addition passes the Simplicity Check below.

## 5. Simplicity Check, risks, and handoff

| Addition | Check |
|---|---|
| Workspace polish | Reuses one existing screen and contracts; improves the repeated teaching path. |
| Demo seed | One opt-in command and one concrete orchestration module; fixed IDs are an ownership marker, not a persisted flag. It reuses real services and adds no runtime path. |
| Responsive/accessibility states | Required for reliable normal use; no framework/library. |

**Threat matrix:** See B-01 refinement; the command/environment boundary is applicable.

**Conditions/risks:** C-01 remains production-blocking for real data. CSS-only responsiveness can need visual Playwright tuning; non-blocking. No migration or rollout is required; rollback removes web polish and seed command, never XP evidence.

Downstream phases must not replace the workspace, alter XP semantics, add dependencies, expose private data, or broaden scope. **Next exact SDD step: maintainer approval, then Tasks (sdd-tasks).**

## 6. B-01 refinement — service-owned demo seed

### Selected architecture and flow

`pnpm seed:demo` invokes `apps/api/scripts/seed-demo.ts`. It first rejects `NODE_ENV=production` **before** database creation/opening or any mutation, then reuses `databasePathFromEnv`, `openDatabase`, and the existing bootstrap teacher mechanism. `src/demo/seed-service.ts` is development tooling only: it requests a roster-owned `ensureOwnedDemoRoster` seam, then calls `xp.create` for deterministic evidence with fixed UUID-v4 request keys. It creates one fixed 2026–2027 demo year, one primary group, and 16 fictional students with varied aliases/avatars and all eight specialties. Legitimate XP calls yield varied totals/thresholds, some badges and non-badges, and one matching-specialty +1 example.

```
seed:demo → production guard → bootstrap teacher → ensure roster → xp.create keys
                                           └── fixed IDs validate ownership/shape
```

`ensureOwnedDemoRoster` is the only new reusable seam, in `roster/service.ts`. For each fixed year/group/student UUID, it reads through the roster repository under the bootstrap teacher. A missing ID is created with the canonical synthetic values; an existing ID must have the same owner, parent ID, and canonical fields or the command fails closed before creating missing records. The fixed IDs are the ownership marker: they are not database flags or HTTP input; any improbable identity collision is treated as unsafe, never adopted. It never finds by labels, deletes, archives, or overwrites teacher records. A partially completed prior run therefore validates known rows, creates only missing canonical rows, and XP replays existing request keys without duplicate evidence, badges, levels, locks, or transitions.

### Simplicity Check

| Option | Trade-off | Decision |
|---|---|---|
| A. Raw/direct SQLite fixtures | Small script, but bypasses ownership, roster validation, XP snapshots/derivations, and correction lock | Reject |
| B. HTTP self-calls | Exercises routes but adds sessions, ports, and failure surface to local tooling | Reject |
| C. Generic fixture/seeding framework | Reusable-looking but adds abstractions with one use | Reject |
| D. Service-owned orchestration | One narrow roster seam plus real XP calls; preserves invariants and recovery | **Choose** |

D is the smallest safe path. The prior backend Working Set exclusion is relaxed only for `roster/service.ts`; repository, XP service/repository, routes, schema, migrations, contracts, and auth remain excluded.

### Boundaries, failures, and RED tests

The command has no public HTTP endpoint and changes neither auth/session ownership semantics nor XP/specialty/level/badge rules. `xp.create` retains its ownership-as-404, archive checks, event-time specialty snapshot, flat bonus, idempotency fingerprint, roster lock, active-event derivation, badge and transition behavior. Errors propagate with context; unexpected failures close the database and return non-zero, without cleanup that could touch unrelated data.

| RED-first integration test | Required proof |
|---|---|
| Production guard | `NODE_ENV=production` exits before database open/mutation. |
| Repeat/recovery | Two runs and a deliberately partial canonical roster yield one canonical roster and stable XP/event/badge/level counts. |
| Foreign/unrelated data | Arbitrary teacher year/group/student remains byte-for-byte unchanged; mismatched fixed-ID ownership/shape aborts before new writes. |
| Domain authority | Seeded events prove owned context/lock, fixed-key replay, event-time bonus, thresholds, and three-event badge rules. |
| No shortcut divergence | Seeded summaries equal `xp.getSummary`; evidence snapshots/derived rows prove service calls, not direct event/table fixture writes. |

### Process threat matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED test |
|---|---|---|---|
| Documentation-like paths | N/A — no file classification/execution | None | None |
| Git repository selection | N/A — no Git process | None | None |
| Commit state | N/A — no commit operation | None | None |
| Push state | N/A — no push operation | None | None |
| PR commands | N/A — no PR operation | None | None |
| Seed command environment/process | Applicable — pnpm/Node command and environment guard | Production fails before DB access; development opens only validated local SQLite path and propagates failure without unrelated mutation | Spawn/invoke production guard and development failure tests |

**Preserved exclusions:** no generic fixture framework/engine/event bus/dependency; demo flags/state in production tables; plaintext production credentials; HTTP endpoint; auth/session change; ownership bypass; direct script table writes; schema/migration/contract change; projection; or production demo subsystem. No migration required.

## Architecture Review

> **Historical record preserved:** the following BLOCKED review established B-01. Section 6 refines that finding; it is not an approval. Exactly one scoped Architecture Review remains required for B-01 and the affected Working Set, AC-01/12/15, Simplicity Check, and threat matrix.

**Result:** **BLOCKED**  
**Review date:** 2026-08-23 | **Skill resolution:** `paths-injected`

### Evidence reviewed

`AGENTS.md`; `docs/SDD-WORKFLOW.md`; active context; archived SPEC-0002/0003/0004 Designs plus Verify, Archive, and Health evidence; the actual workspace, XP, CSS, E2E/unit configuration, bootstrap/auth, roster, and XP service/repository paths named in this Design.

### BLOCKER

- **B-01 — The proposed demo seed is not executable within the approved safe boundary.** `apps/api/scripts/bootstrap.ts` only bootstraps a teacher and projection fixture. Existing roster services generate IDs and expose create/list operations but no idempotent named demo-fixture seam; `xp/service.ts#create` generates event IDs/timestamps and requires unique request keys. The Working Set simultaneously prohibits modifying API services/repositories/contracts. Therefore a new `seed-demo.ts` cannot demonstrably create repeatable roster/XP/badge states through services without either direct table writes/reads or an unapproved service change. Its production refusal is also unspecified: the repository has no established deployment/environment guard beyond `DATABASE_URL`. This makes AC-01, AC-12, and the seed safety claim unverifiable. The seed command is a process boundary, so the Design's blanket threat-matrix N/A statement is also incorrect.

**Required Design Refinement:** Define one narrow service-owned, idempotent synthetic-demo seed seam (or explicitly adjust the Working Set for the smallest required service changes), a mandatory opt-in invocation and production-refusal rule, and tests proving no real-data/direct-table-write path, repeatability, and refusal. Add the applicable process/shell threat entry with safe and failure behavior plus its RED tests. Preserve normal authentication, real XP mutation contracts, fictional data only, and all exclusions.

### CONDITION

- **C-01 — production privacy and recoverability gate:** unchanged. Real student data and production use remain blocked until SPEC-0014/0016 retention/deletion, backup-expiry, and encrypted-restic restore conditions are complete.

### NON-BLOCKING

- The proposed workspace polish is coherent with the existing private `/#/workspace` hash route, canonical roster/XP summaries, explicit XP provider, ten-second presentation undo, responsive rail/dialog pattern, focus behavior, and restrained navy/amber/green visual system. It adds no future-domain behavior or dependency.
- The grouped AC/test plan is suitably outcome-oriented for the scripted demo; during the B-01 refinement, retain role/outcome assertions rather than timing- or selector-brittle evidence.

### Review conclusion and next step

The Design correctly polishes the existing teacher workspace and SPEC-0004 contracts, preserves privacy/auth/projection exclusions, applies the Product Simplicity Principle, and keeps its frontend Working Set narrow. However, the development-only seed is an essential demo dependency and its current service-path, idempotence, production-safety, and process-boundary claims conflict with current code and the prohibited API Working Set. **Do not enter Tasks. Next exact SDD step: Design Refinement for B-01 only, followed by the workflow-required scoped review.**

### Scoped follow-up review — B-01 only

**Result:** **APPROVED WITH CONDITIONS**  
**Review date:** 2026-08-23 | **Skill resolution:** `paths-injected`

**Evidence:** `package.json` establishes the root command pattern; `bootstrap.ts` uses the same database-path/open/teacher bootstrap sequence; `db/client.ts` opens and migrates only after its caller invokes it; `roster/service.ts` owns validation, ownership, archive and correction-lock rules while `roster/repository.ts` exposes the fixed-ID reads/inserts needed by the proposed narrow internal seam; `xp/service.ts#create` validates UUID-v4 keys, checks replay before mutation, then performs owned-context/lock/snapshot/derivation work atomically. `xp-routes.test.ts`, `roster-core.test.ts`, and database-path tests establish the focused Vitest conventions and current invariants.

### CONDITION

- **C-01 — production privacy and recoverability:** unchanged. Real student data and production use remain blocked until the SPEC-0014/0016 retention/deletion, backup-expiry, and encrypted-restic restore conditions are complete.

### NON-BLOCKING

- **B-01 is executable as designed.** The roster seam may use repository operations internally only to preflight all fixed IDs (including unowned collisions), validate the canonical owner/parent/field shape before any create, and create only missing canonical rows. It must not be exposed through routes or accept external IDs. This is compatible with existing roster ownership and the Working Set's explicit `roster/service.ts` exception.
- Fixed UUID-v4 XP request keys genuinely provide repeat safety because existing `xp.create` returns a same-fingerprint replay before mutation; its transaction preserves specialty snapshot, bonus, lock, derived level/badge, and transition invariants. The specified RED tests cover production refusal before `openDatabase`, repeat/partial recovery, unrelated data, ownership, XP invariants, and no direct-table divergence.
- The process matrix is applicable and complete for this Node command: its five required non-process rows are explicit N/A, and the command/environment row defines safe failure and RED coverage. No routing, VCS, PR, or executable-file classification boundary is introduced.

**Review conclusion:** No B-01 blocker remains. The explicit opt-in command, production guard before database access, roster-owned fixed-ID preflight, and existing idempotent XP calls satisfy AC-01 and AC-12 without altering public contracts; the one-module/one-command approach satisfies AC-15. **Next exact SDD step: maintainer approval, then Tasks (sdd-tasks).**

## Phase Result

```yaml
status: success
executive_summary: Scoped Architecture Review approved B-01 with the existing C-01 production condition; the service-owned deterministic demo seed is executable within the stated Working Set.
artifacts:
  repository: docs/specs/SPEC-DEMO-001-client-preview-mvp/DESIGN.md
  engram_topic_key: sdd/spec-demo-001-client-preview-mvp/design
  lifecycle:
    current: Architecture Review APPROVED WITH CONDITIONS (B-01); historical BLOCKED record preserved
    next: Maintainer approval, then Tasks (sdd-tasks)
next_recommended: Maintainer approval, then Tasks (sdd-tasks)
risks:
  - C-01 remains production-blocking for real data.
  - CSS-only responsiveness may need visual Playwright tuning; non-blocking.
skill_resolution: paths-injected
```
