---
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:ef93503aad2ba5d1e4195c9af287899a88604ddad07dc8c77e292b91ddd43fe2
verdict: pass
blockers: 0
critical_findings: 0
requirements: 12/12 (5 approved B-01 requirements; 7 correction criteria)
scenarios: 32/32 (25 prior documented scenarios; 7 correction runtime scenarios)
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:0891f85810211f86b80527c0bce69645f091ccce918b17168b0d39c03ca3d4ed
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:486cc1efcf229d41fded1afabebad0cf1b1d35ab641d391ed606db3b6fd9ec95
---

# Verify Report — SPEC-DEMO-002 Post-Verify Evidence Rerun

## Verdict: PASS WITH CONDITIONS

Fresh independent Standard Verify of the maintainer-authorized post-Verify evidence correction. This is not a new SDD run. All required commands passed, all affected and preserved criteria have current runtime evidence, and the two prior critical findings are closed. No product code, tests, seed, configuration, local database, Archive, Health, Repository Ready, or VCS state was modified by Verify.

## Scope, completeness, and history

| Scope | Requirements / scenarios | Result |
|---|---:|---|
| Approved B-01 requirements | 5/5 | Compliant |
| Correction criteria | 7/7 | Compliant |
| Prior documented runtime scenarios | 25/25 | Preserved compliant evidence |
| Correction runtime scenarios | 7/7 | Compliant |
| Persisted tasks | 13/13 | Complete |

The prior failed correction Verify is preserved as history: it found (1) no runtime assertion for a genuine non-abort initial coin load failure and (2) trailing whitespace at `docs/HEALTH-REPORT.md:157–160`. This rerun verifies the scoped Playwright regression for (1) and a clean required hygiene command for (2). Prior Archive, Health, and Repository Ready records remain historical and require refresh only after this passing Verify.

## Fresh command evidence

| Command | Exit | Output SHA-256 | Result |
|---|---:|---|---|
| `pnpm test -- apps/api/test/integration/seed-demo.test.ts apps/api/test/integration/coins-lifecycle.test.ts apps/api/test/integration/coins-schema.test.ts apps/api/test/integration/migrations.test.ts apps/api/test/integration/coins-reconciliation.test.ts apps/web/src/workspace/workspace-api.test.ts` | 0 | `sha256:1f75128fd088ca8448242de23685b3c6884a650fcea9b05a89c74be5d201dffa` | 24 files, 90 tests passed; focused seed, API, migration, reconciliation, and workspace coverage |
| `pnpm test` | 0 | `sha256:0891f85810211f86b80527c0bce69645f091ccce918b17168b0d39c03ca3d4ed` | 24 files, 90 tests passed |
| `pnpm typecheck` | 0 | `sha256:2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c3244` | Web and API TypeScript checks passed |
| `pnpm build` | 0 | `sha256:486cc1efcf229d41fded1afabebad0cf1b1d35ab641d391ed606db3b6fd9ec95` | Vite web build and API TypeScript build passed |
| `pnpm exec playwright test` | 0 | `sha256:d20879aad018546ded1e04d0fc45b29a6df72255793d1fa2cdad121092cca3b0` | 26 Chromium tests passed, including seeded, cancellation, and genuine-failure regressions |
| `git diff --check` | 0 | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | Empty output; no whitespace errors |

Strict TDD is disabled; no Strict-TDD module was loaded. Hashes are SHA-256 digests of exact combined command output.

## Compliance matrix

| Criterion | Current source and runtime evidence | Result |
|---|---|---|
| Presentation and internal terminology/privacy | `StudentPanel` labels the teacher panel `ECLIPSE POINTS`, balance, and costs as `points`; it contains no `PRIVATE COINS` or visible coin wording. API/domain/database/DTO/routes/TypeScript remain `coin`; no privacy boundary changed. | COMPLIANT |
| Abort cancellation | `CoinActions` ignores `DOMException AbortError` and clears stale error after success. Full Playwright passes `coin loading treats StrictMode cleanup cancellation as non-error after success`. | COMPLIANT |
| Genuine non-abort failure | Full Playwright passes `coin loading keeps a genuine initial failure visible`: only `GET **/api/v1/coin-rewards` is fulfilled as HTTP 503 with JSON, Camille is selected, the Assessment advantages region retains `Could not load coin advantages.`, and the intercepted route is hit. | COMPLIANT |
| D-06 deterministic data | `seedDemo` uses two fixed IDs and fixed allow-listed sources for two +1 grants, preflights collisions, writes transactionally, and replays idempotently. Focused tests prove 16 students, 23 XP events with bonus, two reward rows, balance 2, replay, and collision failure. | COMPLIANT |
| XP/progression, catalogue, context, affordable advantage, redemption, reversal | The disposable Playwright server runs `pnpm bootstrap`, `pnpm seed:demo`, then the application. The normal seeded journey starts Camille at 2 points, creates/selects an assessment, redeems standard cost 2 to 0, and reverses/refunds to 2 without manual grant. Existing manual-grant/API coverage remains in the passing focused and full tests. | COMPLIANT |
| D-06 scope boundary | Seed calls the existing coin repository grant only. No XP-route reconciliation redesign, migration, wallet, shop, dashboard, history, management surface, or mechanic was added. | COMPLIANT |
| B-01/C-DEMO/privacy/accessibility/C-01 | Focused and full checks preserve group-scoped create/reuse, migration fail-closed and exact-index evidence, private URL/hash/storage and projection boundaries, keyboard/tablet feedback, no public ranking, and C-01 as production-only. | COMPLIANT |

## Local data and usability answers

- **Incomplete disposable DB recovery:** `pnpm migrate` alone cannot restore missing rows when migration 0005 is already recorded. Recreate the disposable database, then run `pnpm migrate`, `pnpm bootstrap`, and `pnpm seed:demo`.
- **C-01:** unchanged and non-blocking for this SPEC; encrypted-restic recovery evidence remains required before real student data or production use.
- **First-time comprehension in about one minute:** Yes. `Eclipse Points`, explicit balance/cost language, and inline `Create/select Assessment` make the reward flow legible without exposing implementation terminology.
- **Core flow without administration complexity:** Yes. The verified journey remains in the workspace; no management, wallet, or shop surface exists.
- **Coherence without material complexity:** Yes. The terminology correction is presentation-only; the cancellation/failure behavior retains clear, truthful feedback.

## Conditions and limitations

**CRITICAL:** None.

**CONDITIONS:** C-01 remains production-only; AC-01–AC-17 remain one bundled browser objective because the approved source does not define separate prose scenarios; Engram Design observation #2146 has stale lifecycle wording only and is not authoritative.

**Execution note:** A supplemental focused Playwright invocation was started concurrently with the required full Playwright suite and exited 1 before tests because both attempted the single configured `webServer`; its output hash was `sha256:52b8c7725f8d32b19137252bf53a9d8683c887b0fb385825fed8c4a51ed14e07`. This is a concrete runner-contention observation, not a product-test failure: the required standalone full suite subsequently passed all 26 tests. No fix was made here.

## Archive eligibility

**Eligible: YES.** All 13 tasks are complete; all 12 requirements/criteria and 32 scenarios are compliant; required test, typecheck, build, Playwright, and hygiene commands are current and exit zero; no blocker or critical finding remains.

**next_recommended:** archive
