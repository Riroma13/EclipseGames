# SPEC-0002 Verification Report

## Final verdict: PASS WITH CONDITIONS

The fresh independent Verify confirms that the avatar remediation is correct. The server catalog, route validation, SQLite `CHECK`, and authenticated runtime persistence test now agree on `default`, `fox`, `owl`, `cat`, and `wolf`. All required build, typecheck, full, focused, migration, API, privacy, and runtime-harness checks pass. No new normal defect was found. C-01 remains the sole production-only condition.

## Completeness

| Item | Result | Evidence |
|---|---|---|
| Approved Design | PASS | `DESIGN.md` is approved and defines AC-01 through AC-08. |
| Tasks and Apply | PASS | All tasks 1.1–4.3 are checked; `APPLY-SUMMARY.md` records the cumulative Working Set and focused remediation. |
| Cumulative apply-progress | PASS | Engram records the completed Apply units, avatar remediation, and passed remediation gate. |
| Scope and later-SPEC drift | PASS | Inspection found the bounded roster implementation only; no UI/workspace, later-domain behavior, dependency, or non-goal endpoint/schema was added. |
| Conditional Playwright | N/A by approved Design | No minimal teacher roster screen exists. API integration is the approved workflow proof; unrelated E2E was not run. |

## Command evidence

| Command | Result | Exit | Counts / evidence | Output SHA-256 |
|---|---|---:|---|---|
| `pnpm build` | PASS | 0 | Web Vite build and API TypeScript build completed. | `sha256:e442792b97a1aab9af11247b5ca8f449a227d441e686f72663b8e9a4a7604b17` |
| `pnpm typecheck` | PASS | 0 | Web and API TypeScript checks completed. | `sha256:2a4cd59fcbfb0ee2607d161aac1d9132fd78062e5364f1d57157a9df3f4c3244` |
| `pnpm exec vitest run` | PASS | 0 | 11 files, 38 tests passed. | `sha256:23637ab31b0b37b364e13ac06f79d496ba4ca2e6cb1288155f92be196c5dc348` |
| `pnpm exec vitest run apps/api/test/privacy/roster-dto.test.ts apps/api/test/privacy/projection.test.ts apps/api/test/integration/migrations.test.ts apps/api/test/integration/roster.test.ts apps/api/test/integration/roster-core.test.ts` | PASS | 0 | 5 files, 26 tests passed; focused migration, API, privacy, integration, and avatar coverage. | `sha256:eb03faaf96713a54a80125eea2c6877f582b35e9d959f20065c2890b325a81ff` |
| `pnpm exec vitest run apps/api/test/integration/roster-core.test.ts -t "persists every permitted avatar"` | PASS | 0 | 1 test passed; 6 excluded by selector. Authenticated Fastify flow persists every approved avatar. | `sha256:7a941ee2f2d8f31313943613c622dc4e7dfda54b4831e8651b162a58ab8f070f` |
| `pnpm exec vitest run apps/api/test/integration/roster-core.test.ts -t "runs the authenticated year, group, and batch workflow through Fastify"` | PASS | 0 | 1 test passed; 6 excluded by selector. Existing migration/runtime harness remains green. | `sha256:6e4060dc453a855404ea869cf6bfc02ad7cad95edc600aa1cc36ad5d44d59209` |

### Strict runtime envelope

```yaml
test_command: pnpm exec vitest run
test_exit_code: 0
test_output_hash: sha256:23637ab31b0b37b364e13ac06f79d496ba4ca2e6cb1288155f92be196c5dc348
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:e442792b97a1aab9af11247b5ca8f449a227d441e686f72663b8e9a4a7604b17
```

## Acceptance-criteria compliance matrix

| Criterion | Result | Runtime and implementation evidence |
|---|---|---|
| AC-01 | PASS | Authenticated year/group/student creation, private reads, archive, ownership-as-`404`, typed failures, atomic creation, and correction pass. The authenticated avatar regression persists every approved token. |
| AC-02 | PASS | Ordered and repeatable migrations, SQLite date/FK/`RESTRICT`/`NOCASE`/partial-alias constraints, transactional batch rollback, fixture preservation, and fail-closed migration tests pass. |
| AC-03 | PASS | Separate server-side teacher and classroom-safe allowlists exclude real name, administration, lifecycle, and correction-lock fields. Projection remains authenticated and negative tests reject `fields` filtering/private fallback and payload-bearing audit data. |
| AC-04 | PASS | Roster repository/service use `academic_years`, `groups`, and `students`; `projection_students` remains the isolated SPEC-0001 fixture. Migration and privacy tests preserve that isolation. |
| AC-05 | PASS WITH CONDITION | No stated non-goal or later-SPEC drift was found. C-01 is preserved unchanged as a production-only condition. |
| AC-06 | PASS | API integration proves owner-only one-time year archive, repeat rejection, blocked group/student writes, and authorized historical reads. |
| AC-07 | PASS | Route validation and service trim inputs; SQLite enforces `NOCASE` and active-alias constraints; archived aliases can be reused. The migration `CHECK`, server catalog, Zod enum, and authenticated persistence evidence now agree on all five permitted avatar tokens. |
| AC-08 | PASS | Transactional correction changes only `group_id` for a different same-owner, same-unarchived-year, unlocked target, retaining the stable ID with no history. Tests cover `401`, ownership/absence `404`, `422`, `409`, and idempotent locking. |

## Avatar-remediation evidence

- `apps/api/src/roster/service.ts` declares the five-token catalog.
- `apps/api/src/roster/routes.ts` validates `avatar` with that catalog.
- `apps/api/drizzle/0003_academic_roster.sql` enforces the same five tokens through the `students.avatar` `CHECK`.
- The focused authenticated Fastify regression creates one student for every token and receives `200`; the returned avatars equal the server catalog in order.

## Correctness, design, and privacy findings

| Area | Result | Evidence |
|---|---|---|
| Migration and constraints | PASS | Registered order is `0001_foundation → 0002_auth_projection → 0003_academic_roster`; tests prove repeatability, rollback, and fail-closed behavior. |
| Ownership, auth, and errors | PASS | Every roster route uses `requireSession`; ownership/absence is `404`; expected validation/conflict failures use typed responses; unexpected failures are payload-free `500 INTERNAL_ERROR`. |
| Archive and correction | PASS | Service transactions preserve terminal archive semantics, same-year/same-owner correction boundaries, stable IDs, no history, and correction locking. |
| DTO privacy and fixture isolation | PASS | Mappers are server allowlists; no client filtering is relied upon; `projection_students` is not a roster data source. |
| C-01 | CONDITION | Before real student data or production use, SPEC-0014/0016 must implement retention/deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification. |

## Known issues

- C-01 remains open and production-blocking only.
- Roster UI is intentionally absent and remains SPEC-0003 scope.
- Avatar presentation/catalog UX, year rollover/copy-forward, and transfer/history remain deferred to their approved future Designs.

## Exact next SDD step

`Archive for SPEC-0002`
