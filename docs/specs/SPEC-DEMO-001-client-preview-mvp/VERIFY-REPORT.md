# SPEC-DEMO-001 — Client Preview MVP
## Verify Report

**Mode:** Standard Verify (no `strict_tdd: true` capability)  
**Artifact store:** hybrid  
**Verdict:** **PASS WITH WARNINGS**  
**Rerun:** after the authorized Apply continuation for AC-06, AC-11, and AC-14.

## Executive summary

All 10 approved tasks are checked, repository and Engram Apply evidence agree that the authorized continuation is complete, and all 15 acceptance criteria have current passing runtime evidence. The full Vitest suite, package test command, type-check, production build, full Chromium suite, focused seed/roster/XP/presentation tests, focused workspace/SPEC-0004 browser tests, and isolated seed safety commands passed.

The prior Verify failure is historical only: current real-browser scenarios now prove Register XP pending/failure/retry/success (AC-06), tablet Tab/Shift+Tab containment (AC-11), and one contiguous real client journey (AC-14). C-01 remains an external production-only privacy/recoverability condition; it does not block this fictional preview verification.

## Completeness, design coherence, and scope

| Check | Result | Evidence |
|---|---|---|
| Approved tasks | PASS | All 10 task entries in `TASKS.md` are checked. |
| Apply handoff | PASS | `APPLY-PROGRESS.md` and Engram `sdd/spec-demo-001-client-preview-mvp/apply-progress` both record the complete authorized continuation. |
| B-01 seed safety/order | PASS | `seed-demo.ts` guards production before database path/open, then bootstraps, uses `ensureOwnedDemoRoster`, then service-owned `xp.create`. |
| Fixed seed versus scan fixture | PASS | Two isolated seed runs each reported 16 students/23 XP requests; AC-03 uses a separate runtime 30-record fixture. |
| Design coherence | PASS | The inspected working set preserves the private workspace, real XP/reversal API, fixed seed seam, responsive rail/dialog, and stated exclusions. |
| Exclusions/privacy/auth | PASS | Bounded changed-file inspection found no demo route, auth bypass, direct seed SQL shortcut, projection expansion, future-domain UI, schema/migration, or dependency change. |
| C-01 | WARNING / preserved | Real data and production use remain blocked pending SPEC-0014/0016 retention, backup-expiry, and encrypted-restic restore proof. |

## Automated runtime evidence

| Command | Exit | Result | Output SHA-256 |
|---|---:|---|---|
| `pnpm exec vitest run` | 0 | 20 files, 68 tests passed | `sha256:f5fbc8facc1336b5bda349277f4e2b39f1069ff42f95975e9686565ccda9a38e` |
| `pnpm test` | 0 | 20 files, 68 tests passed | `sha256:d2371b4d4d8404d913dbf7297622f16dc3b2c8afe6db3e0f1977f97e6eabb31f` |
| `pnpm typecheck` | 0 | API and web TypeScript checks passed | `sha256:2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c3244` |
| `pnpm build` | 0 | Vite production build and API compilation passed | `sha256:eca627ebdbf93f1d7e147243f343bd7f175daac8e1583cfff0b6e73829b37a89` |
| `CI=1 pnpm exec playwright test` | 0 | 18 Chromium tests passed | `sha256:cbbe03bfa36f710fe6bb09a7a06cc5a64f988d190b92ea1777f708467b29da2b` |
| Focused seed/roster/XP/presentation Vitest | 0 | 4 files, 14 tests passed | `sha256:a2afd398cfa3f2e4c736b2e5280c07593eac0bd9638d5110908a06bb66abb64e` |
| Focused workspace + SPEC-0004 Playwright, including AC-06/11/14 | 0 | 17 Chromium tests passed | `sha256:da28570995b9f456af02593fe1b4e74e39800c9e058a303bc71ac0f81182fa57` |
| Isolated `pnpm seed:demo` first run | 0 | 16 students and 23 XP requests checked | `sha256:d3b6fe2fdcf2b21bf380264be33aa1e62519fafb9aa930499ddaeb900793646a` |
| Isolated `pnpm seed:demo` second run | 0 | Same 16 students and 23 XP requests checked | `sha256:9191a89d5ca1e6716b6e2d78b4149f2e23048765ae52d9d1628f1260b0f1c80d` |
| `NODE_ENV=production pnpm seed:demo` against fresh isolated path | 1 (expected refusal) | `Demo seed refused in production.`; the configured database path was absent afterwards | `sha256:b09e13e1cff0ba83b17d5454a916f3eb59dc9637a29e5726b247b56908d3d8bc` |

Strict evidence fields:

```yaml
test_command: pnpm exec vitest run
test_exit_code: 0
test_output_hash: sha256:f5fbc8facc1336b5bda349277f4e2b39f1069ff42f95975e9686565ccda9a38e
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:eca627ebdbf93f1d7e147243f343bd7f175daac8e1583cfff0b6e73829b37a89
```

## Acceptance-criteria matrix (15 assessed, 15 passed)

| AC | Status | Current runtime evidence |
|---|---|---|
| AC-01 | PASS | Integration production guard and fresh-path production command both refuse before database creation/mutation. |
| AC-02 | PASS | Isolated repeated command output remains 16 fictional students/23 requests; seed integration test proves replay stability, fixed IDs, collision failure, and partial-recovery-safe preflight. |
| AC-03 | PASS | Focused Playwright AC-03 test renders, searches, and selects the separate approved 30-record fixture with no horizontal overflow; seed remains 16. |
| AC-04 | PASS | Browser tests prove accessible search, no-match, clear, selection, keyboard panel entry, context switch, and retained context. |
| AC-05 | PASS | Presentation and browser tests prove card identity/specialty/scan metadata and selected panel identity, specialty, annual XP, level/progress, badge, and dominant action. |
| AC-06 | PASS | Real `Register XP` browser path disables pending `+3`, receives a deterministic first 503, retries against the real API, and displays authoritative success/annual total. |
| AC-07 | PASS | Contiguous real journey proves base +3, matching-specialty flat +1, effective +4, annual XP, Level 2, and `Ojo clínico` badge. |
| AC-08 | PASS | Real journey clicks Undo, receives the real reversal outcome, retains selected teaching context, and updates annual XP from 16 to 12. |
| AC-09 | PASS | Browser coverage proves no-year, no-group, empty, no-match, historical/read-only, API recovery, 401 state clearing, and post-sign-in recovery. |
| AC-10 | PASS | The 30-record browser scenario proves no horizontal overflow; CSS implements wide 3-card, tablet 2-card/dialog, and narrow 1-card layouts with usable controls. |
| AC-11 | PASS | Tablet browser test proves initial focus plus Tab and Shift+Tab containment; source retains named modal dialog, Escape close, focus restoration, and reduced-motion CSS. |
| AC-12 | PASS | Seed source uses the roster-owned preflight seam plus `xp.create`; focused tests and current production refusal preserve ownership, collision safety, and no direct-table shortcut. |
| AC-13 | PASS | Full suite includes projection DTO and auth contracts; browser 401 recovery clears private cards, opaque URL contexts contain no private values, and inspected UI has no ranking/excluded controls. |
| AC-14 | PASS | One real browser scenario executes sign-in → visible year/group → search/select → identity/specialty → four real XP registrations/bonus → level/badge → real Undo → retained selected student → group switch/continue-teaching state. |
| AC-15 | PASS | One existing workspace, one opt-in development command, and one narrow roster seam satisfy the approved Simplicity Check without new dependencies or future-domain architecture. |

## Privacy and security evidence

- `projection.test.ts` (5), `roster-dto.test.ts` (4), `auth.test.ts` (5), and XP route contracts passed in the full current suite.
- The production seed command refused before `openDatabase`; its fresh configured SQLite path was not created. Development verification used an isolated temporary database.
- The seed preflights every fixed year/group/student ID before creation and treats ownership, parent, canonical-field, or archive mismatch as a fail-closed collision.
- The workspace remains authenticated, clears private state on `401`, and its opaque URL context assertions exclude private values. No public ranking was introduced.

## Client evaluations

1. **Would a first-time client understand EclipseGames within approximately one minute? — YES.** Runtime evidence shows a clear teacher sign-in, visible year/group context, searchable roster, selected identity/specialty, and one dominant Register XP action with immediate feedback.
2. **Could a teacher realistically use this interface while actively teaching? — YES, within MVP scope.** The contiguous real journey, 30-record scan, tablet focus containment/Escape restoration, no-scroll assertion, retry feedback, authoritative update, Undo, and context switch demonstrate the stated teaching loop without losing context.

## Risks

- **WARNING:** C-01 still blocks real student data and production use; it is outside this fictional-demo change.
- **Non-blocking:** CSS responsiveness is covered by Chromium behavior rather than visual-regression snapshots.

## Historical context

The preceding Verify report failed AC-06, AC-11, and AC-14 because real Register XP failure/retry evidence, tablet Tab trapping, and a contiguous real XP/reversal journey were respectively absent. The authorized Apply continuation added only the focused panel behavior and deterministic browser coverage; this rerun supersedes that failure with current passing evidence.

## Final result

```yaml
status: success
verdict: PASS WITH WARNINGS
requirement_count: 15
requirements_passed: 15
requirements_failed: 0
test_exit_code: 0
build_exit_code: 0
test_output_hash: sha256:f5fbc8facc1336b5bda349277f4e2b39f1069ff42f95975e9686565ccda9a38e
build_output_hash: sha256:eca627ebdbf93f1d7e147243f343bd7f175daac8e1583cfff0b6e73829b37a89
next_recommended: Archive
skill_resolution: paths-injected
```
