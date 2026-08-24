```yaml
schema: gentle-ai.verify-result/v1
verdict: PASS WITH WARNINGS
mode: standard-verify
authority: "Approved DESIGN.md and Architecture Review observation #2099"
requirements: "No separate proposal or delta-spec exists; verification uses the three approved Design acceptance-evidence rows and completed Tasks."
scenarios: "3/3 Design acceptance-evidence rows compliant"
tasks_total: 17
tasks_complete: 17
tasks_incomplete: 0
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:038a1be32b1501edbbc186133b447ec160da385f94ef89ad81942d2d748fcbc2
typecheck_command: pnpm typecheck
typecheck_exit_code: 0
typecheck_output_hash: sha256:2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c3244
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:8adbe9b69f970b3bdb7d5ce06171d380a3969240657c54166359b1878dc807ba
playwright_command: pnpm exec playwright test
playwright_exit_code: 0
playwright_output_hash: sha256:fce3cae7c50c55e89e6b7434e0471789349f323516d09050c40ebf75b4935df9
focused_api_command: pnpm exec vitest run apps/api/test/integration/coins-schema.test.ts apps/api/test/integration/coins-lifecycle.test.ts apps/api/test/integration/coins-reconciliation.test.ts apps/api/test/integration/migrations.test.ts
focused_api_exit_code: 0
focused_api_output_hash: sha256:daaa1a0b7ad507be13575288a974962989308cac7697cf846bae743622f3e1f8
focused_web_command: pnpm exec vitest run apps/web/src/workspace/workspace-api.test.ts apps/web/src/workspace/workspace-state.test.ts
focused_web_exit_code: 0
focused_web_output_hash: sha256:fea5d86b2148ebebc619abbfb1f4988f969818da96c9bfcc4447b401b54e5c08
focused_playwright_command: pnpm exec playwright test apps/web/e2e/teacher-workspace.spec.ts -g "SPEC-0005"
focused_playwright_exit_code: 0
focused_playwright_output_hash: sha256:e8d42990c5482cd416769224d3dbb96a03ed2e4f312619d3c9b1d53edf1e40b5
diff_check_command: git diff --check
diff_check_exit_code: 0
diff_check_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change:** SPEC-0005 — Coins and Assessment Advantages  
**Mode:** Standard Verify (`strict_tdd` inactive).  
**Authority:** Approved Design, Architecture Review observation #2099, 17/17 canonical Tasks, merged Apply artifacts, and current runtime/source evidence. C-01 remains production-only.

### Completeness

| Metric | Result |
|---|---:|
| Approved tasks | 17 |
| Complete tasks | 17 |
| Incomplete tasks | 0 |
| Design acceptance-evidence rows | 3 |
| Runtime-compliant rows | 3 |

### Execution evidence

| Command | Exit | Exact concise result | SHA-256 of captured command output |
|---|---:|---|---|
| `pnpm test` | 0 | 24 files, 83 tests passed | `sha256:038a1be32b1501edbbc186133b447ec160da385f94ef89ad81942d2d748fcbc2` |
| `pnpm typecheck` | 0 | Recursive API and web checks passed | `sha256:2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c3244` |
| `pnpm build` | 0 | Vite web build and API TypeScript build passed | `sha256:8adbe9b69f970b3bdb7d5ce06171d380a3969240657c54166359b1878dc807ba` |
| `pnpm exec playwright test` | 0 | 20 Chromium tests passed | `sha256:fce3cae7c50c55e89e6b7434e0471789349f323516d09050c40ebf75b4935df9` |
| Focused schema/lifecycle/reconciliation/migrations | 0 | 4 files, 13 tests passed | `sha256:daaa1a0b7ad507be13575288a974962989308cac7697cf846bae743622f3e1f8` |
| Focused workspace API/state | 0 | 2 files, 11 tests passed | `sha256:fea5d86b2148ebebc619abbfb1f4988f969818da96c9bfcc4447b401b54e5c08` |
| Focused SPEC-0005 Playwright | 0 | 2 Chromium tests passed | `sha256:e8d42990c5482cd416769224d3dbb96a03ed2e4f312619d3c9b1d53edf1e40b5` |
| `git diff --check` | 0 | Empty output | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The full canonical verification-evidence content is this report, including the command names, exit codes, results, hashes, compliance matrix, and verdict; it is persisted verbatim in both OpenSpec and Engram.

### Acceptance and task assessment

| Approved criterion / tasks | Result | Independent source and runtime evidence |
|---|---|---|
| AC-06; Tasks 1.1, 4.1, 5.1 | COMPLIANT | Focused reconciliation/lifecycle tests passed. Cost-2 creates exactly two distinct active grants and cost-3 exactly three; normal reversal releases allocations, permits released-grant reuse, and refund rows are ineligible. |
| AC-11 / C-02; Tasks 3.1, 3.2, 4.2 | COMPLIANT | The same allocation-triggering `REVOKE` is reconciled twice. Complete snapshots compare ledger rows/counts, refunds, compensations, redemption reversal state, all allocation release state, eligibility, and balance. Runtime assertions prove one refund, one compensation, zero active allocations, no resurrection/reuse, stable eligibility, and balance `1`. |
| AC-13 / C-03 / C-04; Tasks 2.1, 2.2, 4.1, 8.1 | COMPLIANT | Schema runtime explicitly runs `PRAGMA foreign_keys=ON`, rejects invalid FKs and duplicate active allocation, permits released reuse, enforces one active student/context advantage, and proves transaction rollback. Migration suite passed. |
| API zero-mutation; Tasks 5.1, 6.1, 6.2, 8.1 | COMPLIANT | The file-backed SQLite `authoritativeSnapshot` captures ordered ledger, redemptions, allocations including release state, contexts, entitlement transitions, counts, and balance before/after each failed request. Passing coverage includes ownership mismatch `404`, invalid body `422`, insufficient funds `409`, mismatched context `404`, duplicate advantage `409`, changed-body idempotency `409`, archived student `422`, archived year `422`, and archived context `422`. Equality is asserted after every case. |
| Workspace and privacy; Tasks 7.1, 7.2, 8.2 | COMPLIANT | Focused Playwright passed pending disable, failure, retry, unchanged balance after failure, retained student/group/context, opaque URL boundary, and no `XP`, `RT`, rubric, or grade text in the coin action region. Full Playwright privacy/projection suite also passed. |
| Contracts, ownership, archive, and domain boundary; Tasks 1.2, 5.2, 6.2, 9.1 | COMPLIANT | Source inspection confirms fixed 2/3 rewards, ownership-as-404, archive write guards, append-only/reversal flow, private DTO mapping without allocations, and no generic negative/correction route. Coin mapper and workspace coin types expose no grade, XP, RT, rubric, or projection data. |

### Design coherence and boundaries

- The implementation preserves the Design's fixed rewards, append-only ledger, full replay, whole-redemption reversal, released-allocation evidence, and finite correction predicates.
- All Architecture Review conditions #2099 (C-02, C-03, C-04) have current passing runtime evidence.
- No grade, XP, RT, rubric, or classroom-projection leakage was observed in the approved working set or workspace evidence.
- C-01 (encrypted restic/retention proof) is unchanged, production-only, and not a SPEC-0005 implementation blocker.

### Issues

**CRITICAL:** None.  
**WARNING:** C-01 remains an external production-only recoverability condition.  
**SUGGESTION:** None.

### Verdict

**PASS WITH WARNINGS.** All required SPEC-0005 criteria have passing current runtime evidence. The only warning is the preserved, out-of-scope production condition C-01.

**next_recommended:** archive
