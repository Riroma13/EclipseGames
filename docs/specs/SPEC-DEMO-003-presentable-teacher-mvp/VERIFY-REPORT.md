# Verify Report: SPEC-DEMO-003 — Presentable Teacher MVP

## Verdict: PASS WITH WARNINGS

Fresh Standard Verify after the permitted narrow post-401 Apply correction. `strict_tdd` is inactive. Repository and Engram artifact mirrors were read; all 13 tasks are checked. No application, test, seed, configuration, or VCS file was changed by Verify.

## Completeness and prior-failure history

| Item | Actual count | Current result |
|---|---:|---|
| SPEC requirements | 8 | 8 pass |
| SPEC scenarios | 9 | 9 pass with executed test evidence |
| TASKS.md implementation tasks | 13 | 13/13 checked |
| Default full Playwright suite | 30 | 30 passed |

| Prior CRITICAL | Fresh current evidence | Result |
|---|---|---|
| Summary-load failure fabricated zero | `classSummaryState` preserves genuine zero separately and failed group summaries render unavailable/retry while roster data remains. Focused Vitest passed. | PASS |
| AC-06 strict locator duplicate | The semantic action alert is the sole failure message. Focused and default Playwright pass pending → genuine failure → retry → authoritative success, with duplicate locking and undo semantics preserved. | PASS |
| Setup lacked runtime proof | Focused and default Playwright pass visible rejected request followed by valid owned group/student creation and refresh; roster integration/core tests pass ownership, archive, alias, batch atomicity, and correction locks. | PASS |
| Post-401 context selected an unrelated class | Focused and default Playwright pass stale private-state clearing, sign-in display, preserved opaque year/group hash, re-authentication, and original Ada roster restoration. | PASS |

## Command evidence

Hashes are SHA-256 values of the fresh combined stdout/stderr streams.

| Command | Exit | Result | Output hash |
|---|---:|---|---|
| `pnpm test` | 0 | 24 files / 97 tests passed | `sha256:51d1825248ee7caee2327bfe1fe0d266e6ab244b8b3fde6e69fede3d87c30f4b` |
| `pnpm typecheck` | 0 | Web and API typechecks passed | `sha256:2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c3244` |
| `pnpm build` | 0 | Web and API builds passed | `sha256:e2f328d3a4910ebb13aa2a8541fb3efffcd4648e15b80654320aea453d0e0a1f` |
| `pnpm exec playwright test` | 0 | 30 passed with the default two-worker configuration | `sha256:a71b19519449f4e87a1d35cf808c9ef14d32ba4e67ae6a17d1228656db6159bd` |
| Focused post-401, AC-06, setup, and Projection Playwright | 0 | 5 passed | `sha256:963abd2fddc46eceb7e42782b1e18886f95e5af90bb40d126afc16e43ca08676` |
| Focused summary/activity, roster, seed, and Projection Vitest | 0 | 6 files / 37 tests passed | `sha256:fbb83b5d1b941db284ed672e8e3273500d06055c0556efd48e0bfe82429b6208` |

```yaml
strict_result_envelope:
  test_command: pnpm test
  test_exit_code: 0
  test_output_hash: sha256:51d1825248ee7caee2327bfe1fe0d266e6ab244b8b3fde6e69fede3d87c30f4b
  build_command: pnpm build
  build_exit_code: 0
  build_output_hash: sha256:e2f328d3a4910ebb13aa2a8541fb3efffcd4648e15b80654320aea453d0e0a1f
  typecheck_command: pnpm typecheck
  typecheck_exit_code: 0
  playwright_command: pnpm exec playwright test
  playwright_exit_code: 0
  playwright_output_hash: sha256:a71b19519449f4e87a1d35cf808c9ef14d32ba4e67ae6a17d1228656db6159bd
```

## Requirement and scenario matrix

| Requirement | Scenario(s) | Result | Executed evidence |
|---|---|---|---|
| Private context | Load private context | PASS | Default Playwright covers authenticated context, opaque URL/storage, and post-401 recovery; focused summary-state Vitest proves unavailable/retry is not zero. |
| Roster and identity | Find a student | PASS | Default Playwright covers search/select, private identity/detail, ordered 30-record scan, and no ranking. |
| XP action and recovery | Award and undo | PASS | Focused/default AC-06 proves pending/failure/retry/authoritative success; default journey proves reversal/undo. |
| Eclipse Points | Redeem and reverse; Genuine failure | PASS | Default runtime covers context, costs, balance, one-per-assessment rejection, failure/retry, redemption, and reversal; UI says Eclipse Points while API remains `coin`. |
| Factual activity | Distinguish activity states | PASS | Focused Vitest executes the typed `academicYearId`/`limit=3` wrapper and zero versus unavailable/retry mapping; source inspection confirms only factual fields render. |
| Safe Projection handoff | Open the Projection | PASS | Focused/default Playwright proves labelled plain `/`, no query/hash/storage payload, fixture separation, and 503 safe error without teacher fallback; privacy tests pass. |
| Minimal setup | Create permitted roster data | PASS | Focused/default Playwright proves rejection/refresh; focused roster tests execute ownership, archive/read-only, alias, 1–30 atomic batch, and correction-lock guards. |
| Synthetic demo seed | Replay or collision | PASS | Focused/full seed tests execute 16 fictional students, L1/L2/L3, multiple badges, 0/1/2/3 balances, Camille grants, preflight, transaction rollback, replay, collision, and production refusal. |
| Accessible privacy | Navigate accessibly | PASS | Default Playwright executes 800px focus trap/focus restoration, 30-record no-overflow, private URL/storage, authenticated Projection, and post-401 recovery; responsive/reduced-motion selectors remain covered by the suite. |

## Design coherence and scope

| Approved decision | Result | Evidence |
|---|---|---|
| Client composition; failure is never zero | PASS | Explicit summary availability state and focused state tests preserve genuine zero versus unavailable/retry. |
| Existing XP/coin contracts; idempotency and undo | PASS | Executed AC-06 and redemption/reversal journeys preserve authoritative write behavior; no grade inference. |
| Separate fixture Projection and server allowlist | PASS | Plain `/` handoff, safe 503 state, and five projection privacy tests pass; no mapper/allowlist drift was found. |
| Create-only setup via roster contracts | PASS | Runtime setup evidence and existing server contract tests pass; no infrastructure was introduced. |
| Deterministic development-only seed | PASS | Fixed-plan seed integration tests pass exact states and all safety/replay conditions. |
| No prohibited drift | PASS | Changed-file inspection and `git diff --check` found no dashboard, fake activity, ranking, API/schema/dependency, grade-inference, or Projection-allowlist change. |

## Findings

### CRITICAL

None.

### WARNING

1. `DESIGN.md` remains marked `Status: Draft`; Archive should perform the lifecycle update only after accepting this successful Verify.
2. Hybrid Apply provenance is synchronized in substance but not byte-identical: the repository’s detailed Apply Progress/Summary addenda are richer than concise Engram mirrors, and Units 1–2 rollback boundaries remain aggregated. This does not contradict task completion, correction scope, or runtime evidence.

### SUGGESTION

None.

## Apply provenance and next route

The fresh default two-worker Playwright run is green; no serial contention diagnostic was needed and no worker setting was changed. The post-401 correction is confined to preserving opaque year/group recovery context while clearing all private arrays, detail, activity, action state, and authentication before sign-in. It adds no browser storage, endpoint, schema, seed, Projection payload, or private field.

Successful Verify routes to Archive. Preserve C-01 as production-only and carry the two warnings as lifecycle/provenance caveats; do not route to another Apply correction.

## Verification evidence

This complete file is the canonical verification-evidence preimage. Its Engram mirror is `sdd/spec-demo-003-presentable-teacher-mvp/verify-report`.
