# SPEC-0001 — Platform foundation and architecture
## Design
**Status:** Archived | **Owner:** Maintainer | **Date:** 2026-08-21 | **Depends on:** None

> This phase creates only this Design and the required session note; no application code, package files, tests, Tasks, or OpenSpec artifacts.

## 1. Context, goals, and non-goals
The repository is greenfield. Establish a small, teacher-operated web platform that is fast for groups of about 30, keeps educational data private, and gives downstream SPECs stable boundaries.

**Goals:** one deployable web/API/database unit; server-enforced private and classroom-safe contracts; testable pure rules.  
**Non-goals:** student accounts, tenancy, public rankings, mobile-native apps, media storage, exports, product-domain implementation, or legal-policy implementation.

## 2. Technical approach
A pnpm workspace contains a React/Vite SPA and Fastify REST API. Fastify hosts the built SPA in production; application services coordinate pure TypeScript domain modules and Drizzle-managed SQLite. The API maps authoritative records to separate teacher and projection DTOs—never filtering a teacher DTO in the browser.

### Architecture decisions
| Area | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Frontend | React + Vite + Router SPA | Next.js; server-rendered pages | Fast tablet/laptop interaction without SSR or platform coupling. |
| Backend | Fastify REST, service layer, pure domain | full-stack framework; microservices | One process is operationally small; REST is inspectable and keeps UI/data concerns separate. |
| Persistence | SQLite private volume + Drizzle, forward SQL migrations | Postgres; browser storage | Appropriate single-teacher scale, transactional, backupable; browser storage weakens privacy/recovery. |
| Authentication | Bootstrap one teacher, Argon2id hash, opaque revocable secure-cookie sessions | JWT/localStorage; student accounts | Server revocation and no browser credential token fit the MVP. |
| Repository | pnpm `apps/web`, `apps/api`, `packages/domain`, `packages/contracts` | single mixed source tree; monorepo services | Makes ownership explicit without deployment distribution. |
| Module boundaries | Domain has no I/O; API owns authorization/persistence; web owns presentation | shared catch-all module; UI rules | Prevents dependency reversal and accidental rule duplication. |
| Data/API access | `/api/v1` resource REST with Zod validation and DTO mappers | GraphQL; direct DB/browser access | Small stable contract, validation at entry, and one privacy authority. |
| Testing | Vitest unit/integration; Playwright critical E2E | manual testing only; snapshot-only | TDD protects calculations and integration/E2E prove auth and projection boundaries. |
| Migrations | reviewed, ordered, forward-only Drizzle SQL; migrate before start | runtime schema mutation; manual DB edits | Repeatable deployments and auditable recovery. |
| Local workflow | pnpm, `.env.example`, local SQLite, migrate/bootstrap/dev commands | cloud-required development | Fast, offline-capable setup with no shared student data. |
| Deployment/topology | Docker image on EU VPS, TLS reverse proxy, one private persistent volume | serverless; managed multi-service cloud | Lowest operational surface while retaining data-location control. |
| Backup/restore | encrypted restic daily-30/monthly-12; quarterly restore drill | unverified volume snapshots; no backup | Recovery is only credible when restores are verified. |
| Privacy boundary | server allowlist projection DTO; teacher DTO separate | client-side hiding; generic serializer | Prevents private fields reaching projector clients. |
| Errors/observability | typed `{code,message,requestId}`, safe structured logs, payload-free audit | raw errors; full request logging | Actionable diagnostics without educational-data leakage. |
| Dependency policy | minimal, pinned direct dependencies; justify each; no UI kit/bus/cloud SDK/generator initially | convenience libraries by default | Limits supply-chain and maintenance cost. |
| Security model | TLS, secure/httpOnly/sameSite cookies, origin checks, login rate limit, least-privilege volume, encrypted backups | public API; localStorage tokens | Matches one authenticated teacher and private minor data. |

## 3. Components, ownership, and data flow
`web → /api/v1 → application service → domain → repository → SQLite`; response mappers emit `TeacherStudentDto` or `ProjectionStudentDto`.

| Domain | Owns | May depend on | Must not depend on / affect |
|---|---|---|---|
| Academic observation | XP evidence, rubric, closed snapshots | shared identity read contract | behaviour, coins, narrative; behaviour never changes grades/XP evidence/RT |
| Task tracking | RT, Energy, streak inputs | identity; gamification command contract | academic grades/rubric; behaviour semantics |
| Gamification | levels, badges, coins, rewards | identity; explicit task/behaviour eligibility facts | official grades/RT |
| Behaviour | state, incidents, game-restriction facts | identity/session | academic or task records; it may restrict game mechanics only |
| Narrative | collective event state | classroom-safe projection contract | grades, XP, RT, behaviour mutation |

Dependencies point inward only: web → API/contracts → services → domain; repositories implement ports outward. Cross-domain changes use named service commands/facts, never table access. Projection is allowlist-only: `avatar`, `alias`, `specialty`, `unlockedBadge`, `xpLevel`, `progressToNextLevel`, `energyVisualState`, `coinBalance`, `narrativeProgress`; temporary Show Student additionally permits `behaviourState`. It excludes real name, exact RT, rubric, grades, XP breakdown, comments, incidents, Red Codes, disciplinary history, and detailed history.

## 4. Representative contracts and failure behavior
| Operation | Authorization / output | Validation and errors |
|---|---|---|
| `POST /api/v1/auth/session` | anonymous; establishes teacher session | invalid credentials `401 AUTH_INVALID`; rate limit `429`; never reveal account existence |
| `DELETE /api/v1/auth/session` | current teacher; revokes session | revoked/expired session `401 AUTH_REQUIRED` |
| `GET /api/v1/teacher/groups/:groupId/students` | teacher; private DTO | UUID/ownership validation `400/403`; absent `404` |
| `GET /api/v1/projection/groups/:groupId/students` | teacher session; allowlist DTO only | invalid group `400`; no private fallback or query-selectable fields |
| `POST /api/v1/academic/xp-events` | teacher; teacher DTO | Zod input and domain invariant failures `422 VALIDATION_FAILED` |

**Projection authorization invariant:** “classroom-safe” is a data-exposure classification, not a weaker authorization tier. Projection and Show Student endpoints remain teacher-authenticated unless a future approved Design explicitly changes that decision. Classroom-safe data must not be interpreted as publicly accessible.

All responses use `{ code, message, requestId }`; unexpected failures are logged once with requestId and return `500 INTERNAL_ERROR`. Transactions roll back failed writes. Migrations fail closed: the app does not start; restore the verified backup when rollback is unsafe.

## 5. Expected initial repository tree
The following is an implementation target, **not files created by this phase**:
```text
apps/api/src/http/  apps/api/src/services/  apps/api/src/repositories/
apps/api/src/auth/  apps/api/src/projection/  apps/api/drizzle/
apps/api/test/integration/  apps/api/test/privacy/
apps/web/src/app/  apps/web/src/features/  apps/web/src/projection/  apps/web/e2e/
packages/domain/src/academic/  packages/domain/src/task-tracking/
packages/domain/src/gamification/  packages/domain/src/behaviour/  packages/domain/src/narrative/
packages/domain/test/  packages/contracts/src/
package.json  pnpm-workspace.yaml  Dockerfile  compose.yaml  .env.example
```

## 6. Testing, rollout, and rollback
Unit RED tests cover domain purity, academic calculations, RT exclusion, and behaviour non-interference. SQLite integration tests cover migrations, authorization, revocation, validation, rollback, and DTO mapping. Required negative privacy tests assert projection and Show Student responses omit every private exclusion; anonymous/revoked callers cannot read either route; request logs/audit payloads omit student data. Playwright covers sign-in and projected group rendering without private fields.

Local rollout: install → configure → migrate → bootstrap → dev. Production: build image, migrate before application start, use TLS/private volume, then smoke-test auth and projection. Revert code only when schema-compatible; otherwise restore encrypted backup. **Production conditions:** define retention/deletion policy and owner, implement deletion handling including backup expiry, and pass a documented quarterly restore verification before real student data or production use.

## 7. Working Set, read order, and constraints
**This correction changes:** `docs/specs/SPEC-0001-platform-foundation/DESIGN.md` and `.ai/context/SESSION.md` only. Future implementation creates the tree above; it must not modify stable context, OpenSpec, or product rules without a SPEC.

**Read order:** 1. this Design; 2. `AGENTS.md`; 3. `docs/SDD-WORKFLOW.md`; 4. `.ai/context/PROJECT.md`; 5. `.ai/context/DECISIONS.md`; 6. relevant domain and contract files.  
**Constraints:** preserve domain direction, server-only privacy filtering, no public ranking, no student accounts, and reviewed migration before startup. Implementation is sliced by coherent dependency and independently verifiable acceptance criteria; large changes are split only when doing so reduces implementation or review risk.

## 8. Acceptance criteria and findings
- [ ] Workspace follows the stated paths and builds as one service without external product services.
- [ ] Auth, migration, typed errors, and safe diagnostics meet the stated contracts.
- [ ] Projection/Show Student APIs expose only their explicit allowlists; all listed exclusions have negative tests.
- [ ] Domain tests prove behaviour cannot change academic grade, XP evidence, or RT semantics.
- [ ] Production use is blocked until retention/deletion and documented restore verification conditions pass.

**Open findings:** No BLOCKER. **CONDITION:** retention/deletion implementation and verified restore drill are required before production (SPEC-0014/0016). **NON-BLOCKING:** avatar strategy, Energy thresholds, rollover, assessment context, and narrative media remain in their roadmap SPECs.

## 9. Settled decisions and handoff
Downstream phases must not reconsider the selected stack, single-service topology, cookie sessions, SQLite/Drizzle, module direction, server allowlist DTOs, or test layers without concrete contradictory evidence; report a Design BLOCKER instead. Before production, carry CONDITION C-01 into the applicable hardening/production Tasks and acceptance criteria. Deferred product rules stay deferred.

# Architecture Review result
**Result:** APPROVED WITH CONDITIONS

### BLOCKER
None.

### CONDITION
- **C-01 — Production privacy and recoverability gate.** Before real student data or production use, SPEC-0014/0016 Tasks must define the retention/deletion owner and process, implement deletion handling including backup expiry, and record a successful quarterly restore verification. This is already an objective production acceptance criterion in Sections 6 and 8; it is not a prerequisite for foundation implementation.

### NON-BLOCKING
- Deferred avatar strategy, Energy visual thresholds, school-year rollover, assessment context, and narrative media remain correctly assigned to their roadmap SPECs.

### Review handoff
The Design is executable and Tasks can be derived without redesign. Preserve C-01 as a production gate; do not start Tasks until the maintainer approves this Design.
