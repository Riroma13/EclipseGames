# SPEC-DEMO-001 — Archive Report

**Change:** `spec-demo-001-client-preview-mvp`  
**Branch:** `spec/demo-001-client-preview-mvp`  
**Archive date:** 2026-08-23  
**Artifact store:** hybrid (repository-native artifacts plus Engram)  
**Outcome:** **PASS WITH WARNINGS** — archived successfully

## Executive summary

SPEC-DEMO-001 Client Preview MVP completed the repository-native SDD lifecycle through Verify and is now archived. The corrected Verify rerun passed all 15 acceptance criteria, confirmed all ten persisted implementation tasks are checked, and found no CRITICAL issue. The only remaining warning is C-01: real student data and production use remain blocked until the approved privacy, retention/deletion, backup-expiry, and encrypted-restic restore work is complete.

No product code, tests, Design, Tasks, dependencies, OpenSpec directories, or VCS state were changed by Archive. No delta-spec merge or folder move was performed because EclipseGames uses `docs/specs/SPEC-XXXX/` as its repository-native artifact lifecycle.

## Archive gates

| Gate | Result | Evidence |
|---|---|---|
| Persisted Tasks | PASS | All ten implementation entries in `TASKS.md` are `- [x]`; no stale unchecked task remains. |
| Verify status | PASS WITH WARNINGS | `VERIFY-REPORT.md`: `status: success`, `verdict: PASS WITH WARNINGS`, 15/15 passed, 0 failed. |
| CRITICAL findings | PASS | No CRITICAL Verify finding exists. C-01 is explicitly documented as non-blocking for this fictional preview and production-only. |
| Apply handoff | PASS | Apply progress and summary record the original work and authorized AC-06/AC-11/AC-14 continuation as complete. |
| Scope and exclusions | PASS | No route, auth/session bypass, direct seed-table shortcut, projection expansion, schema/migration, dependency, or future-domain change. |

## Acceptance and implementation audit

- **AC-01–02:** explicit `pnpm seed:demo`; production guard runs before database open/mutation; deterministic 16-student fictional roster, 23 XP requests, fixed IDs/request keys, replay and partial/collision safety.
- **AC-03–05:** separate approved 30-record scan fixture; accessible search/selection; identity, specialty, annual XP/level/progress/badge, and dominant Register XP action.
- **AC-06–08:** real Register XP pending/failure/retry/success path; authoritative specialty bonus and level/badge evidence; real ten-second Undo/reversal retaining context.
- **AC-09–11:** actionable empty/loading/error/401/historical states; responsive no-scroll flow; tablet Tab/Shift+Tab focus containment, Escape, restoration, dialog naming, and reduced-motion behavior.
- **AC-12–13:** service-owned roster preflight and real `xp.create`; authenticated private workspace; no ownership/auth bypass, ranking, direct-table seed shortcut, or private-data leakage.
- **AC-14:** one contiguous real browser journey from sign-in through context, search/select, four XP registrations, bonus/level/badge, Undo, and group switch.
- **AC-15:** simplicity check satisfied through one existing workspace, one opt-in seed command, one narrow roster seam, and no new dependency or future-domain architecture.

## Verification evidence

The current Verify report records these passing results and SHA-256 output identities:

| Evidence | Result |
|---|---|
| `pnpm exec vitest run` | 20 files / 68 tests passed; exit 0; `sha256:f5fbc8facc1336b5bda349277f4e2b39f1069ff42f95975e9686565ccda9a38e` |
| `pnpm test` | 20 files / 68 tests passed; exit 0; `sha256:d2371b4d4d8404d913dbf7297622f16dc3b2c8afe6db3e0f1977f97e6eabb31f` |
| `pnpm typecheck` | API and web checks passed; exit 0; `sha256:2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c3244` |
| `pnpm build` | Vite production build/API compilation passed; exit 0; `sha256:eca627ebdbf93f1d7e147243f343bd7f175daac8e1583cfff0b6e73829b37a89` |
| `CI=1 pnpm exec playwright test` | 18 Chromium tests passed; exit 0; `sha256:cbbe03bfa36f710fe6bb09a7a06cc5a64f988d190b92ea1777f708467b29da2b` |
| Focused workspace/SPEC-0004 Playwright | 17 Chromium tests passed; exit 0; `sha256:da28570995b9f456af02593fe1b4e74e39800c9e058a303bc71ac0f81182fa57` |
| Isolated seed runs | Both passed with 16 students/23 XP requests; hashes recorded in Verify report. |
| Production seed guard | Expected exit 1 with `Demo seed refused in production.`; fresh database path absent; hash recorded in Verify report. |

## Safety, privacy, and client evidence

- **B-01 seed safety:** execution order is production guard → bootstrap teacher → `ensureOwnedDemoRoster` → service-owned `xp.create`; fixed-ID owner/parent/canonical-field/archive mismatches fail closed before writes.
- **Privacy/security:** projection DTO, roster DTO, auth, and XP route contracts passed; `401` clears private workspace state; opaque URL context contains no private values; no public ranking was introduced.
- **Client evaluation:** a first-time client can understand the teacher workflow in approximately one minute; a teacher can use the flow while actively teaching without losing context, within MVP scope.
- **C-01 remaining condition:** encrypted restic execution/restore proof and related retention/deletion and backup-expiry controls remain outstanding. This is a production-only condition, not an archive blocker for fictional preview evidence.

## Historical evidence preservation

The prior failed Verify is historical only and remains preserved in the Verify report. The authorized continuation corrected the missing real AC-06 failure/retry evidence, AC-11 tablet focus trapping, and AC-14 contiguous journey evidence. Archive does not alter that historical record.

## Artifact traceability

### Repository-native paths

- `docs/specs/SPEC-DEMO-001-client-preview-mvp/DESIGN.md`
- `docs/specs/SPEC-DEMO-001-client-preview-mvp/TASKS.md`
- `docs/specs/SPEC-DEMO-001-client-preview-mvp/APPLY-PROGRESS.md`
- `docs/specs/SPEC-DEMO-001-client-preview-mvp/APPLY-SUMMARY.md`
- `docs/specs/SPEC-DEMO-001-client-preview-mvp/VERIFY-REPORT.md`
- `docs/specs/SPEC-DEMO-001-client-preview-mvp/ARCHIVE-REPORT.md`

The repository-native workflow does not use separate proposal/spec files for this SPEC; no such paths were created or moved.

### Engram observations

| Artifact | Observation ID | Topic |
|---|---:|---|
| Design | `2054` | `sdd/spec-demo-001-client-preview-mvp/design` |
| Tasks | `2069` | `sdd/spec-demo-001-client-preview-mvp/tasks` |
| Apply progress | `2073` | `sdd/spec-demo-001-client-preview-mvp/apply-progress` |
| Verify report | `2078` | `sdd/spec-demo-001-client-preview-mvp/verify-report` |
| Archive report | `2083` | `sdd/spec-demo-001-client-preview-mvp/archive-report` |
| Apply summary | repository-native only | `APPLY-SUMMARY.md` |
| Proposal/spec | not present in repository-native or Engram artifacts | repository-native lifecycle does not require them |

## Lifecycle result

```yaml
status: success
change: spec-demo-001-client-preview-mvp
verdict: PASS WITH WARNINGS
requirements_assessed: 15
requirements_passed: 15
requirements_failed: 0
tasks_checked: 10/10
critical_findings: 0
warning: C-01 production-only privacy/recoverability condition preserved
next_recommended: Health Report
vcs_actions: none
openspec_actions: none
skill_resolution: paths-injected
```
