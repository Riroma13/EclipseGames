# SPEC-0039 — M8 Teacher Workspace, Classroom Mode, and Expiring Show Student

**Phase:** Design (Sol)  
**Level:** C — student privacy boundary and temporary unauthenticated access capability  
**Status:** DESIGN READY  
**Dependencies:** M1–M7 canonical calendar/sessions, RT/Energy, gems, behaviour, rubric/term close, XP, roster, and Avatar Core  
**Rollout conditions:** B-01 and C-01 remain open; see Section 9

## 1. Outcome and repository evidence

M8 completes the existing `/#/workspace` as the teacher's one operational surface, makes `/#/projection?group=<UUID>` the canonical classroom-safe display, and adds a teacher-issued, expiring **Mostrar al alumno** view. It composes existing domain read models; it creates no second workspace, session model, grade rule, behaviour rule, account, or ranking.

Repository evidence determines the approach. `WorkspaceApp.tsx` already owns year/group/student navigation, canonical roster cards, M1–M7 panels, and stale-request isolation. `game/service.ts` already owns the canonical group display composition consumed by `ProjectionApp.tsx`, while `projection/*` is a separate fixture authority that must be retired from runtime. Avatar Core already supplies `RestrictedAvatarDto` and the shared `AvatarPreview`. RT, gems, behaviour, XP, calendar, and roster remain authoritative in their own modules. The current specific-student projection route merely ignores `showStudent=true`; it has no lease, expiry, or safe access lifecycle.

## 2. Scope

### In scope

- Refine the existing workspace hierarchy and cards for approximately 30 students; retain all M1–M7 workflows and their ownership.
- Compose canonical classroom cards in one server read using batch owner ports: restricted avatar, alias/specialty, level/progress/badges, qualitative Energy, and gem balances.
- Keep the existing gameplay display scenes and add a temporary Show Student overlay that automatically returns to the current underlying scene.
- Issue teacher-controlled code, URL, and locally rendered QR access; enforce expiry and revocation on the server.
- Remove fixture projection routes/bootstrap from runtime and prove allowlist parity before doing so.
- Intentional loading, empty, error, retry, expired, revoked, refresh, back-navigation, stale, responsive, and accessible states.

### Non-scope

Student accounts, public/group rankings, real names on classroom surfaces, exact RT, XP totals/evidence, rubric/grades/comments, incidents/proposals/history, behaviour mutation, new academic calculations, session lifecycle changes, uploads, M9 boutique/entitlements, M10 history, M11 narrative rules/content, websockets, service workers, analytics, generic BFF/query engines, persistent access history, and production privacy/backup hardening.

## 3. Twenty required design decisions

| # | Decision | Contract and rationale |
|---|---|---|
| D01 | Canonical surfaces | Extend `WorkspaceApp`; keep `/#/workspace` and `/#/projection?group=<UUID>`. Add `/#/show-student` only for the restricted viewer. No parallel workspace or path-based SPA route is introduced. |
| D02 | Workspace information architecture | Preserve year/group toolbar, roster, calendar/session controls, RT, term close, and selected-student panels. Add one **Modo aula** action for the selected group and one **Mostrar al alumno** action on the selected active student. Historical years/students remain read-only and cannot issue access. |
| D03 | Domain ownership | Roster owns identity/lineage; Avatar Core owns appearance; XP owns annual level/progress/badges; RT owns term Energy; gems owns balances; behaviour owns current-session state; game owns display scene composition; calendar owns active sessions. M8 reads named ports and writes none of those facts. |
| D04 | Composition and performance | A `classroom-projection` composer calls group/batch ports once per owner and joins by canonical student ID in memory. No per-card HTTP calls or per-student SQL loops are permitted. Missing optional Energy/behaviour becomes `null`; failure of required roster/avatar/XP/gems data fails the whole safe payload rather than mixing stale fields. This is adequate for ~30 students without caching infrastructure. |
| D05 | Classroom card DTO | `ClassroomStudentDto` is exactly `{ avatar: RestrictedAvatarDto, energy: EnergyState|null, gems:{EMERALD:number,RUBY:number,DIAMOND:number} }`. `RestrictedAvatarDto` remains the M7 type `{studentId,alias,specialty,specialtyCategory,level,progress,badges,profile}`. No client-side filtering creates this DTO. |
| D06 | Exact Show Student DTO | `ShowStudentDto` is exactly `{kind:'SHOW_STUDENT',expiresAt:string,student:ClassroomStudentDto,behaviour:{state:'NORMAL'|'VIGILANCE'|'ALERT'|'RED_CODE'}|null}`. It contains no group/year/session IDs beyond the opaque `studentId` already approved in `RestrictedAvatarDto`, no access secret, and no narrative placeholder. |
| D07 | Current Alert representation | The only Alert information is `behaviour:{state:'ALERT'}` when an owned active real class session currently derives Alert for that student. UI label is **Alerta**. Lives, restrictions, action IDs, incident/proposal existence, reasons, and disciplinary history are excluded. With no active session, behaviour is `null`; M8 does not infer state from older sessions. |
| D08 | Show Student lease | One process-local server grant may be active per teacher Show Student flow. Default TTL is 120 seconds; startup configuration `SHOW_STUDENT_TTL_SECONDS` may set 30–300 seconds and is validated fail-fast. The URL credential is a server-generated opaque value with at least 128 bits of CSPRNG entropy; it is never derived from student ID, alias, group ID, timestamp, or other predictable data, and contains no teacher-private identifier or data. The registry retains only a verifier/hash, opaque grant ID/version, teacher session/owner binding, selected student and group binding, receipt fingerprint, and expiry; no student data or secret is persisted. The viewer credential is short-lived, and exactly one active grant per teacher is sufficient; issuing a new grant invalidates the previous grant. Restart safely revokes all grants. |
| D09 | Code, URL, and QR | Creation returns the teacher-only secret material once: `{accessCode,accessUrl,expiresAt,showStudent:ShowStudentDto}`. The URL carries the high-entropy opaque credential only inside the HashRouter fragment; QR is generated locally from that URL with no network request. The human-entered Crockford code is only a bootstrap/lookup mechanism for the same short-lived grant, is independently random (at least 64 bits of CSPRNG entropy), is not the long-lived viewer authorization secret, and is invalidated on successful redemption. Secrets are never returned by projection/viewer reads or logged. |
| D10 | Exchange, refresh, back, and timeout | URL/code exchange is one-time and atomically replaces the bootstrap secret with an opaque viewer credential in an `HttpOnly; Secure in production; SameSite=Strict; Path=/api/v1/show-student; Max-Age=grant TTL` cookie. The cookie contains only the opaque credential and resolves server-side to the currently valid grant. The server validates teacher/owner session identity, student ID, group ID, grant ID/version, and expiry on every restricted viewer read; client-supplied student/group IDs cannot expand the grant. The browser removes the secret from history immediately. Refresh re-reads with that cookie but never extends `expiresAt`; Back leaves the view but does not extend it. The grant and cookie are revoked when the teacher exits, timeout expires, another student or group is selected, relevant class/session context invalidates the view, the teacher logs out or session expires, a replacement grant is issued, or the student leaves the valid context. Revocation is server-authoritative: the viewer returns the existing safe unauthorized/expired response, never returns prior DTO data, and stale cookies cannot reactivate it. Expiry, teacher revoke, replacement, group/year change, archive, or server restart returns an expired/revoked screen and the classroom projection resumes its latest underlying scene. **Mostrar de nuevo** creates a new grant and revokes the prior one. |
| D11 | State ownership | URL stores only workspace `year/group/student` UUIDs or projection `group`; no Show Student secret remains after exchange. React owns search, dialogs, countdown display, loading/errors, and request generations. The server lease owns target, expiry, redemption, viewer session, and revocation. Domain facts remain server authoritative. No local/session storage is used. |
| D12 | Authorization and privacy | Teacher control and classroom display routes require the existing cookie session and owner-as-`404`. The viewer route accepts only a valid server-resolved viewer credential after exchange. Responses use explicit server mappers, `Cache-Control: no-store`, and payload-free logs. Unknown, expired, revoked, cross-owner, archived, or changed-lineage targets fail closed without distinguishing student existence. Invalid/expired credential failures are generic and throttleable at the HTTP boundary; normal API rate limiting applies to opaque credentials. |
| D13 | API shape | Add `GET /api/v1/teacher/groups/:groupId/classroom-cards?academicYearId=`, `POST /api/v1/teacher/groups/:groupId/show-student`, `DELETE /api/v1/teacher/groups/:groupId/show-student`, `POST /api/v1/show-student/exchange`, and `GET /api/v1/show-student`. Existing `GET .../projection/groups/:groupId/display` gains scene `SHOW_STUDENT` and `showStudent:ShowStudentDto|null`; teacher display control mirrors it. The obsolete fixture student routes and `showStudent=true` query are removed, not aliased. |
| D14 | Mutation safety and concurrency | Create/revoke require UUID-v4 `Idempotency-Key`. Exact create replay deterministically returns the same still-valid lease material; key reuse with another target is `409`. A later distinct creation atomically revokes the prior grant. Revoke is idempotent. Exchange is single-winner and atomically invalidates the bootstrap code. Human-entered code failures are limited to 5 per client/session in any rolling 10-minute window and 20 per teacher/grant in that window; after either threshold further attempts return `429` until that window expires. Successful redemption invalidates the code. Opaque credential failures remain generic and subject to normal HTTP-boundary throttling; M8 adds no CAPTCHA or generalized anti-abuse platform. No access operation mutates academic, XP, gem, behaviour, rubric, or avatar state. |
| D15 | Loading, errors, stale work | Existing generation/context guards extend to classroom-card and lease requests; all are abortable. Context change immediately clears card overlays, generated secrets, dialogs, and countdowns and server-revokes the active grant when the context change invalidates it. Stale completion cannot open/revoke another student's lease or replace current cards. Required composition failure shows a retryable unavailable state, never previous-group data. `401` clears private teacher memory; `404/409/429/5xx` have safe, actionable messages. Projection polling retains its last safe payload on transient failure with a visible disconnected state, but discards Show Student immediately once its known expiry passes. Client timeout/navigation cleanup is UX only; it never substitutes for server revocation. Returning to Teacher Workspace restores only still-valid teacher-side local selection/context and never reuses or reactivates the viewer credential; teacher-private DTOs remain separate from `ShowStudentDto`. |
| D16 | Workspace cards and reuse | `StudentCard` remains teacher-private and may show real name and exact teacher XP already in scope. It reuses the composed `RestrictedAvatarDto`/`AvatarPreview` for current profile and removes the client legacy-token fallback once canonical data loads. Classroom and Show Student components reuse `AvatarPreview`; they never reuse the private card DOM and hide fields with CSS. |
| D17 | Accessibility and responsive UI | Controls have visible labels, 44px targets, keyboard operation, disabled explanations, and polite pending/countdown announcements (not every second). Dialog focus is trapped/restored; generated code has copy feedback and a text alternative to QR. Projection uses high-contrast large type and reduced motion. Expiry/revocation receives focus as a status heading. Laptop, tablet, and projector widths are verified. |
| D18 | Projection consolidation | `game/service.ts` remains the sole runtime display owner and delegates student construction to the new composer. Stop registering `projection/routes.ts`, stop fixture bootstrap, and stop reading `projection_students`. Keep migration `0002` and the dormant table for upgrade compatibility; no destructive migration or dual-write is allowed. Tests, not runtime fallback, preserve privacy parity. |
| D19 | Migration and rollout | No schema/data migration and no feature flag. Deploy API composition/lease support before web assets; smoke canonical cards, projection, create/exchange/refresh/expiry/revoke, and fallback scene. Rollback restores prior app code; leases disappear safely on restart and the historical fixture table remains intact. Do not re-enable fixture routes as fallback. |
| D20 | M9/M11 compatibility | M9 may expand Avatar Core catalogue/availability and the shared renderer; M8 continues consuming `RestrictedAvatarDto` and never reads entitlements. M11 may version the classroom DTO to add a server-allowlisted collective narrative field/scene; M8 does not emit `narrativeProgress:0`, create narrative state, or couple individual Show Student access to narrative progress. |

## 4. Data and interaction flows

```text
WorkspaceApp -> roster/private owners (existing teacher flows)
             -> classroom-cards route -> classroom-projection composer
                                         -> roster + avatar + XP batch ports
                                         -> RT + gems + behaviour batch ports

Teacher creates lease -> in-memory lease registry -> projection SHOW_STUDENT overlay
                      -> one-time code/URL/QR -> exchange -> viewer cookie
Projection poll/viewer GET -> server allowlist mapper -> shared AvatarPreview
Lease expires/revokes -----> latest event/challenge/minigame/idle scene resumes
```

The overlay never snapshots or clears the underlying gameplay scene. If that scene changes while Show Student is active, expiry reveals the latest authoritative scene. Projection polling remains every two seconds; `expiresAt` permits immediate client removal between polls, but only the server may authorize renewed content.

## 5. API and UI behaviour

`POST .../show-student` body is exactly `{studentId}`; TTL is server configuration, not teacher-selected business data. Success is `201`, replay `200`. `DELETE` returns `204`. Exchange accepts exactly one of `{token}` or `{code}`; malformed input is `422`, throttling `429`, and invalid/expired/redeemed input is generic `404`. Viewer `GET` returns `200 ShowStudentDto` or generic `404`; it never redirects to teacher sign-in.

Teacher copy may use **Modo aula**, **Mostrar al alumno**, **Copiar enlace**, **Copiar código**, **Finalizar acceso**, **Mostrar de nuevo**, **Acceso disponible durante 2 minutos**, and **El acceso ha finalizado**. The projection header clearly labels **MODO AULA**; the viewer labels **VISTA TEMPORAL DEL ALUMNO** and shows alias, avatar, specialty, level/progress, badges, Energy, gems, and the optional current behaviour state. It never shows real name or a ranking.

Empty group shows no cards and disables classroom/Show Student actions with a reason. No RT evidence means Energy `null` and UI **Energía aún no disponible**. Zero gem balances are valid, not empty. No badges renders a neutral empty badge area. Viewer network failure offers retry until known expiry; after expiry it cannot render cached student data.

## 6. Privacy and failure boundaries

- Private exclusions are exhaustive: real name; exact RT/average/streak/entries; annual or event XP amounts/category/base/bonus; rubric levels/grade/comments/snapshots; assessment context; behaviour lives/restrictions/actions/incidents/proposals/history; teacher/session/group/year administration; avatar revision/history/teacher IDs; gem ledger/sources/redemptions; narrative private drafts; detailed history.
- Access secrets, cookies, DTO bodies, aliases, and representative private values are absent from request/audit/application logs. Referrer policy is `no-referrer`; responses and viewer shell are `no-store`. Viewer cookies are opaque, contain no private data, use `HttpOnly`, `Secure` in production, `SameSite=Strict`, a restricted Show Student path, and a `Max-Age` aligned to the grant TTL.
- Process-local throttling is bounded and clears on restart; restart also revokes access, which is the safe failure. Horizontal multi-instance access is unsupported until a later production design supplies a shared lease store.
- The viewer cannot mutate, navigate to teacher routes through UI, enumerate groups/students, select fields by query, or prolong access. Browser filtering is never a privacy control.
- Behaviour never reduces grades, XP evidence, or RT. M8 only reads its qualitative current state for the restricted view.

### Threat matrix

| Boundary | Applicability | Required RED evidence |
|---|---|---|
| Client/API routing | Applicable | Hash secrets are not sent on document request or retained after exchange; arbitrary route/query fields cannot widen DTOs; revoked/expired access fails closed. |
| Access-token process integration | Applicable | Crafted/guessed/replayed code/token, cross-lease cookie, concurrent exchange, restart, and clock-boundary cases do not disclose data or extend TTL. |
| Shell/subprocess/executables | N/A — none introduced | None. |
| VCS/PR automation | N/A — none introduced | None. |

## 7. Test contract

| Layer | Required evidence |
|---|---|
| Unit/domain | DTO key allowlists; batch join ordering/missing-data policy; Alert-to-state-only mapping; lease clock boundaries, replacement, revoke, one-time exchange, receipt replay/fingerprint, token hashing, code throttling; projection scene precedence/fallback; shared avatar rendering and no legacy fallback after canonical load. |
| API/SQLite integration | Owned active/historical lineage; 401/404/409/422/429; one batch call per domain port; exact classroom and Show Student DTOs; refresh without extension; concurrent create/exchange; restart revocation; no domain writes; dormant fixture table unread; fixture routes/query removed; payload-free logs and `no-store` headers. |
| Web component/integration | Workspace integration without M1–M7 regressions; pending/disabled/cancel/retry; context and selected-student race isolation; URL stripping; copy/code/QR alternatives; expiry/revoke/failure states; projection return to latest scene; keyboard/focus/live-region/reduced-motion/responsive behaviour. |
| Focused built-artifact Playwright before Ship | Teacher selects canonical group/student, opens Classroom Mode, creates access, opens URL/QR-equivalent viewer, refreshes without extending, sees exact safe fields and Alert-only state, replaces/revokes/expires access, returns to the latest classroom scene, and proves representative private values never appear in DOM, network payloads, URL, storage, or logs. Every Classroom interaction is covered. |

## 8. Acceptance criteria

- [ ] **AC-01:** `/#/workspace` remains the only teacher workspace and all M1–M7 journeys retain their existing domain/session ownership.
- [ ] **AC-02:** Canonical classroom cards are composed server-side from roster, Avatar Core, XP, current-term RT Energy, gems, and current-session behaviour through batch ports with no N+1 requests/queries.
- [ ] **AC-03:** Classroom Mode renders only D05 fields plus existing safe gameplay scenes; no private exclusion in Section 6 appears by key or representative value.
- [ ] **AC-04:** Show Student returns exactly D06; current Alert is represented only as `{state:'ALERT'}` and no lives, restriction, incident, proposal, or history leaks.
- [ ] **AC-05:** Teacher-issued code, URL, and local QR resolve the same one-time lease; secrets are hashed server-side, stripped from history after exchange, never logged, and never stored in local/session storage.
- [ ] **AC-06:** The server enforces the configured 30–300 second TTL; refresh/back/polling cannot extend it, replacement and revoke invalidate it, and restart fails closed.
- [ ] **AC-07:** Expiry/revoke/invalid lineage removes Show Student content and automatically resumes the latest underlying safe scene without mutating that scene.
- [ ] **AC-08:** Cross-owner, archived, guessed, replayed, malformed, throttled, stale, and concurrent cases fail as specified without existence disclosure or partial state.
- [ ] **AC-09:** Workspace and projection transitions abort/suppress stale requests; old group/student/avatar/lease data never publishes into current context.
- [ ] **AC-10:** Loading, empty, null Energy, zero gems, no badge, retry, disconnected, disabled, expired, revoked, and sign-in states are intentional and actionable.
- [ ] **AC-11:** Keyboard, focus restoration, live announcements, QR text alternative, target size, contrast, reduced motion, tablet/laptop/projector layouts, persistence reload, and correction/retry are verified.
- [ ] **AC-12:** Fixture bootstrap/routes and `showStudent=true` are absent from runtime; `game/service.ts` plus the composer are the sole projection authority and no fallback/dual-write exists.
- [ ] **AC-13:** No schema migration, new domain rule, student account, ranking, persistent access history, websocket, generic engine, M9 entitlement, or M11 narrative placeholder is introduced.
- [ ] **AC-14:** Behaviour cannot alter academic grades, XP evidence, or RT; projection remains an allowlist, never a filtered teacher DTO.
- [ ] **AC-15:** B-01 and C-01 remain explicit rollout conditions.

## 9. Rollout, conditions, and rollback

Rollout is API-first, then web, with focused privacy and built-artifact browser evidence before exposure. Existing fixture data is neither migrated nor deleted. A process restart is a supported emergency revocation mechanism. Rollback removes the new web/API registrations and restores the prior app version; it does not down-migrate, revive fixture routes as compatibility APIs, or preserve active leases.

**B-01 remains open:** active legacy XP without trustworthy term identity remains annual-only and is never timestamp-inferred. M8 consumes annual XP and current authoritative term/session IDs only.  
**C-01 remains open:** real student data and production use remain blocked until retention/deletion including backup expiry and executed encrypted-restic restore verification are complete. Process-local leases are therefore an MVP boundary, not approval for multi-instance production.

## 10. Expected implementation boundary

Expected modifications are bounded to `apps/api/src/{server.ts,game/*,projection/*}`; narrow batch read ports in roster/avatar-core/XP/RT/gems/behaviour; shared contracts; `apps/web/src/{workspace/*,projection/*,game/game-api.ts,main.tsx,styles.css}`; and focused existing test areas including `apps/api/test/privacy/projection.test.ts` and `apps/web/e2e/teacher-workspace.spec.ts`. A small local QR renderer dependency is permitted only if it performs no network access; package/lock changes belong to Build. No migration file is expected.

## 11. Risks, review, and Simplicity Check

| Risk | Control |
|---|---|
| Private DTO leakage | Separate exact mappers, negative key/value tests, no browser filtering, no-store/log redaction. |
| N+1/waterfall latency | One composer and owner-provided batch ports; one cards request and one display poll. |
| Stale profile/context | Canonical RestrictedAvatar DTO, AbortControllers, request generations, context comparisons. |
| Lease leakage or extension | Hashed one-time secret, viewer cookie, short server clock TTL, replacement/revoke, throttling, restart fail-closed. |
| Two projection authorities | Remove fixture runtime registration; retain table only as inert migration history. |

**Level C review:** Terra review is justified before Build because M8 replaces a projection privacy authority and introduces an unauthenticated, time-bounded student-data capability. This Sol task does not invoke Terra; separate targeted review is the next required gate.

**Simplicity Check:** the design reuses one workspace, one game display composer, owner batch ports, one restricted DTO family, one renderer, and one process-local lease registry. It adds no schema, account system, scheduler, websocket, cache, event bus, generic projection engine, or future-domain placeholder. Server restart revocation and a fixed configurable TTL are deliberately simpler and safer for the single-service MVP than durable access records. M9 and M11 extend their owners later. No material design decision remains unresolved; B-01 and C-01 remain rollout conditions.

**DESIGN READY — stop after Sol Design; do not enter review, Build, Verify, Ship, or Git/VCS in this task.**
