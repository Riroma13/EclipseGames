# SPEC-0038 M7 Avatar Core — Terra Verification

**Contract:** `SDD_CONTRACT:VERIFY_TERRA_EXPLICIT_GATE`, `VERIFY_BOUNDED_READ_ORDER`, `VERIFY_SCOPE_EXPANSION_GATED`  
**Gate:** Critical Terra Verification Gate: REQUIRED  
**Date:** 2026-09-15  
**Verdict:** **PASS WITH WARNINGS**

## Scope and bounded evidence read

Terra verification is required by `TASKS.md`. The bounded order was followed: DESIGN scope/contracts/privacy/rollout/acceptance; database migration and roster/XP/auth evidence; contracts and route registration; Avatar web workflow and its focused tests; then Projection routes and mapper solely to verify the unchanged privacy boundary.

The expected change surface is present: migration and registration; Avatar Core domain/repository/service/mapper/routes/tests; contracts; roster integration; shared renderer and workspace workflow/tests; focused M7 Playwright. Projection was inspected as a read-only boundary. `TASKS.md` has no checkboxes, so all six slices are assessed from current implementation and passed runtime evidence. No production code, Projection source, agent route, runtime tracking, or VCS state was modified.

## Commands and results

| Command | Exit | Result |
|---|---:|---|
| `pnpm exec vitest run apps/api/src/db/migrate.test.ts apps/api/src/avatar-core/domain.test.ts apps/api/src/avatar-core/service.test.ts apps/api/src/avatar-core/routes.integration.test.ts apps/web/src/workspace/AvatarPreview.test.tsx apps/web/src/workspace/AvatarWorkflow.test.tsx apps/web/src/workspace/StudentCard.test.tsx` | 0 | 7 files, 29 tests passed. `StudentCard` emitted two existing React `act(...)` environment warnings. |
| `pnpm test` | 0 | 79 files, 331 tests passed. Existing React `act(...)` warnings were emitted in several web suites; no test failed. |
| `pnpm typecheck` | 0 | API and web TypeScript checks passed. |
| `pnpm build` | 0 | Vite production build and API TypeScript build passed. |
| `pnpm exec playwright test apps/web/e2e/spec-0038-avatar-core.spec.ts --project=chromium` | 0 | 1 built-artifact Chromium journey passed: teacher edit/save/reload/revert/stale recovery and Classroom privacy. Bootstrap and demo seed completed before the test started. |

Playwright was run once because TASKS slice 6 and DESIGN require focused built-artifact evidence. The previous bootstrap, locator, authentication, restore, alert, and idle-heading corrections are now exercised by the passing journey; no repeated strategy was used.

## Task-slice completion

| Slice | Runtime and implementation evidence | Status |
|---|---|---|
| 1. Catalogue/domain contracts | Exact catalogue, mappings, specialty/XP rules, DTO allowlists, availability seam, and renderer fallback: domain/preview tests passed. | PASS |
| 2. Migration/backfill | `0017` preflight/postflight, FK/CHECK/index shape, fresh/populated migration, invalid-token rollback, repeat startup, and transactional creation: migration tests passed. | PASS |
| 3. Persistence/service | Immutable revisions, revert reason, UUID-v4 receipts, exact/conflicting replay, async availability, and two-connection stale race: service tests passed. | PASS |
| 4. HTTP/privacy | Authenticated routes, server-derived XP, owner/year 404/422 boundary, roster-token freeze, and Projection invariance: route integration passed. | PASS |
| 5. Shared web workflow | Shared semantic renderer, Spanish labels, edit/cancel/retry/stale/archive/invariant/race states, and card authority: focused components passed. | PASS |
| 6. Focused end-to-end | Built artifact edit/save/reload/revert/stale/Classroom privacy journey: Chromium passed. | PASS |

## Design coherence matrix

| Decisions | Evidence | Status |
|---|---|---|
| D01–D03 ownership and authoritative state | Avatar tables key to `students.id`; Avatar service reads XP and does not write academic/behaviour state; aliases/specialties remain roster-owned. | PASS |
| D04–D05 derived XP, L8, specialty category | Existing domain thresholds remain L1–L8; teacher DTO derives values server-side; UI displays non-editable specialty category. | PASS |
| D06–D08 catalogue, legacy compatibility, availability | Strict contract validation and SQLite checks enforce eight fields; `0017` backfills all five legacy tokens; roster writes `default`; async availability is awaited. | PASS |
| D09–D10 immutable history and group correction | Revert appends a reasoned snapshot; archive blocks writes; same-year group-correction integration proves profile/revision remain readable. | PASS |
| D11–D14 DTO, renderer, privacy, Projection | Server teacher/restricted allowlists are narrow; `AvatarPreview` is a shared local DOM/CSS renderer with fallback; routes require session and owner-as-404; Projection mapper/routes remain fixture-backed and the integration test proves unchanged output after mutation. | PASS |
| D15 concurrency and retry | Immediate transaction appends version, conditionally advances head, and writes receipt atomically; stale/lost race is 409; exact replay returns prior result and conflicting reuse is 409. UI retries the same key for an ambiguous save. | PASS |
| D16 forward migration and consumer boundary | `0017` is registered, additive, preflights legacy/lineage data, backfills exactly one profile/version, and rolls back on bad legacy data. No M8/M9 access or entitlement persistence was introduced. | PASS |

## Acceptance compliance matrix

| Acceptance criterion | Evidence | Status |
|---|---|---|
| One valid profile and immutable revision for existing/new students | Migration and transactional creation tests. | PASS |
| Five deterministic legacy mappings; bad legacy data blocks atomically | Exact mapping and rollback tests. | PASS |
| Teacher edit/save/cancel/retry/reload/history/revert with concurrency/idempotency | Focused unit/integration tests plus passing Chromium journey. | PASS |
| Roster/XP ownership remains separate; no academic/behaviour mutation | Source boundary inspection and route/service tests. | PASS |
| L8 maximum/excess XP; restricted DTO omits exact XP | Domain and DTO tests; server allowlists. | PASS |
| Cross-owner/archive/invalid-catalogue/stale paths fail closed | Service and HTTP integration tests. | PASS |
| Restricted DTO and Projection exclude listed private fields | Allowlist tests, Projection invariance integration, and Classroom browser assertion. | PASS |
| No account/code/URL/QR/secret/expiry/upload/boutique/ledger/public endpoint/ranking | Bounded source inspection and authenticated-only route registration. | PASS |
| Persistence, responsive editor, labels/focus, disabled/error explanations | Workflow tests and Chromium journey cover persistence, states, labels, and recovery. | PASS |
| B-01 and C-01 remain open | Retained explicitly in DESIGN rollout/acceptance sections. | PASS |

## Privacy, migration, and integrity findings

- Student identity remains canonical in `students`; Avatar Profile history stores only profile/revision metadata and actor ownership.
- Migration runs in one transaction, preflights legacy token and owner lineage, and postflights exact profile/version counts and head integrity.
- Avatar writes use an immediate SQLite transaction. A two-connection test proves one winner, a typed stale conflict, and no partial version or receipt.
- Teacher avatar responses omit real name. Restricted DTO excludes exact XP, revision/history, teacher IDs, administration, academic, RT, rubric, grade, and behaviour data.
- Projection stays fixture-backed and Avatar Core does not query or populate it. The focused browser journey confirms the Classroom does not expose the created student's real name, avatar history, or exact XP.

## Findings

### CRITICAL

None.

### WARNING

1. Passing web tests still emit React `act(...)` warnings, including `StudentCard` in the focused suite and unrelated existing workspace suites. They do not indicate an M7 functional failure, but test-environment hygiene should be corrected in a separate bounded maintenance task.
2. B-01 (annual-only legacy XP without trustworthy term identity) and C-01 (retention/deletion, backup expiry, and encrypted-restic restore evidence before real student data/production) intentionally remain open rollout constraints. They are not M7 implementation blockers.

### SUGGESTION

None.

## Residual risk and final verdict

The required migration, privacy, retry/concurrency, teacher workflow, and built-artifact Classroom privacy evidence all pass. Residual risk is limited to existing React test warning hygiene and the explicitly retained production-readiness constraints B-01/C-01.

**Final verdict: PASS WITH WARNINGS.** No Luna correction is required for SPEC-0038 verification.
