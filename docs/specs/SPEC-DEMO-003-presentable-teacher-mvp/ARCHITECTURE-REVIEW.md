# Architecture Review: SPEC-DEMO-003 — Presentable Teacher MVP

**Outcome:** **APPROVED WITH CONDITIONS**  
**Scope:** One read-only review of `DESIGN.md` against the proposal, exploration, stable decisions, workflow, current code, contracts, tests, and seed. No implementation or redesign is authorized by this review.

## Executive Summary

The design is executable and preserves the intended teacher journey: authenticated context, roster scan, private student detail, real XP feedback/undo, Eclipse Points assessment advantage/reversal, then a deliberately separate classroom-safe projection. It correctly reuses the React/Fastify/SQLite boundaries and introduces no BFF, domain, schema, dashboard, ranking, or enterprise navigation concept.

The result carries two implementation conditions. They resolve a scope gate around richer deterministic demo data and make the bounded test surface objective; neither is a safety or architecture blocker.

## Evidence Reviewed

| Area | Result |
|---|---|
| Teacher workspace | `WorkspaceApp`, roster/card/panel, hash-state and API client support opaque UUID context, private detail, XP, points, undo, and 401 clearing. |
| Existing API ownership | Roster creation, XP evidence pagination, and coin/assessment actions already have authenticated service ownership and validation; no backend concept is needed. |
| Projection/privacy | `/` loads the fixed legacy `projection_students` fixture. The projection mapper is a server allowlist; the workspace must not pass state or imply selected-group equivalence. |
| Seed | The current fixed seed is synthetic and replayable, with fixed roster/event/grant identities and production refusal. It supports the canonical Camille points journey, but not varied levels/badges/balances. |
| Rules | XP remains evidence rather than a grade; internal `coin` names remain intact and UI uses Eclipse Points; behaviour and narrative are untouched. |
| Test capability | Vitest integration/privacy tests and Playwright already cover ownership, batch atomicity, projection exclusion, private URL/storage, workspace recovery, XP, points, focus, and 30-student scanning. |

## Architecture Validation

| Review question | Finding |
|---|---|
| Complete journey and MVP scope | Pass. The design keeps roster-first interaction and progressive disclosure; bounded recent XP evidence is factual rather than a fabricated feed. |
| Module/data ownership | Pass. `WorkspaceApp` owns composed workspace state; `StudentPanel` owns selected-student actions; roster, XP, coins, projection, and seed remain service-owned. |
| Privacy and fixture mismatch | Pass. The no-payload `/` handoff, fixture label, server allowlist, and URL/storage exclusions preserve DEC-005. No projection mapper widening is proposed. |
| Setup/history semantics | Pass with conditions. Existing roster APIs enforce owner, archive, batch-size, alias, atomicity, and correction-lock rules. Activity is bounded to the owned XP endpoint and must not render comments. |
| Failure/rollback | Pass. Summary/activity are unavailable rather than zero on failure; action writes preserve idempotency/reversal; 401 clears private state. Seed remains development-only, synthetic, and production-refusing. |
| Working Set/Read Order | Pass with condition. All named production paths resolve. The generic “existing tests” entry needs an exact bounded list in Tasks. |
| Acceptance/testing | Pass with condition. The required assertions are objective once the seed gate and named test mapping below are carried forward. |

## Required Conditions for Tasks

1. **Seed scope gate — maintainer approval required.** Before planning any seed-file change, record whether varied L1/L2/L3, badge, and 0/1/2/3-point presentation data is a demonstrated demo requirement. If not approved, omit the seed extension and use the current truthful seed plus controlled test fixtures. If approved, preserve DEC-014's canonical fixed-ID/fixed-source two-point Camille grants and add an explicit fixed plan for every new XP request and coin grant identity/source/student. Preflight all fixed identities before writes; preserve production refusal, synthetic-only data, transaction/fail-closed behavior, idempotent replay, and a development-data rollback statement. Integration tests must prove exact results, replay, collision failure with no partial additions, and canonical Camille journey compatibility.
2. **Bounded evidence map.** Tasks must name the exact tests to change rather than use a generic test bucket: at minimum `apps/web/src/workspace/workspace-api.test.ts`, `apps/web/src/workspace/demo-presentation.test.ts`, `apps/web/e2e/teacher-workspace.spec.ts`, `apps/web/e2e/auth-projection.spec.ts`, `apps/api/test/privacy/projection.test.ts`, and `apps/api/test/integration/seed-demo.test.ts` only when Condition 1 is approved. Add the XP-evidence wrapper contract for `GET /api/v1/students/:studentId/xp-evidence?academicYearId=...&limit=3`; render only category/base/bonus/effective/reversal/time, never comments or grades, and test unavailable/retry separately from zero activity.

## Threat Matrix

| Boundary | Status | Required safe behavior and RED evidence |
|---|---|---|
| Projection route/link | Applicable | The `/` link has no query/hash/private payload and is explicitly fixture-labelled. A failed projection is an error, never a teacher-data fallback. Playwright asserts URL/storage and rendered projection exclude private fields. |
| Shell, subprocess, VCS/PR automation, executable classification | N/A | No such integration is introduced. |

## Open Questions for Maintainer Approval

- Is a varied deterministic demo progression genuinely required for this client presentation, or is the current truthful Camille smoke journey sufficient? This determines whether the conditional seed slice proceeds.
- Confirm that linking the legacy fixture-backed `/` route as a clearly labelled classroom preview is acceptable. It must remain separate from, and must not be synchronized with, the selected workspace group.

## Risks

- The fixed projection fixture is not the teacher roster. Mislabeling or state propagation would create a privacy/product-contract failure.
- A seed expansion without complete fixed-plan preflight could leave development data partially extended; Condition 1 prevents that.
- C-01 encrypted-restic/recoverability remains production-only and outside this SPEC.

## Next Recommended

Maintainer approval of the two open questions, then `sdd-tasks` with both conditions copied unchanged. Delivery remains chained and each review slice must stay within the 400-line budget.
