# SPEC-0003 — Teacher Classroom Workspace
## Design

**Status:** Archived | **Architecture Review:** APPROVED WITH CONDITIONS (C-01, C-02 only) | **Owner:** Maintainer | **Date:** 2026-08-22  
**Depends on:** SPEC-0001 and SPEC-0002 (archived) | **Related decisions:** DEC-004, DEC-005, DEC-009, DEC-011

> **Think hard once, then execute.** This is the private, class-sized operational surface for: **Find student → register action → continue teaching.** It is not a projection screen and it implements no domain mutation.

---

# 1. Context, exact scope, and compatibility

## 1.1 Current state

The web app is one React/Vite entry (`apps/web/src/main.tsx`) with inline fetch/state and one stylesheet. `/` is the authenticated SPEC-0001 projection/demo, backed only by the isolated `projection_students` fixture. SPEC-0002 provides authenticated canonical roster reads: academic years, their groups, and `TeacherStudentDto` lists ordered by `alias COLLATE NOCASE, id`. There is no current-year flag, workspace composition endpoint, router use, web unit-test harness, client data library, or browser persistence.

## 1.2 Scope

Create the smallest teacher-private workspace: group selection, canonical student cards, instantaneous search, selected-student side panel, a typed fast-action presentation shell, and a transient undo foundation. It serves one teacher and approximately 30 students on laptop/tablet.

**Compatibility:** `/` remains the projection/demo route and retains its fixture/API ownership. The canonical teacher workspace is the **`/#/workspace` hash route**: Fastify always serves `/`, then React Router selects `workspace` from the fragment. It never reads `projection_students`, `/api/v1/projection/*`, or legacy `/api/v1/teacher/*` fixture routes. SPEC-0009 alone owns replacing/expanding projection.

## 1.3 Non-goals

No XP, levels, badges, coins/rewards, RT, Energy, task entry, behaviour/Red Code, grades/rubrics, narrative, exports, student accounts, projection mode, rankings, transfer history, rollover/copy-forward, retention/deletion hardening, deployment, generic audit/history (SPEC-0010), event sourcing, command/event bus, plugins, websockets/realtime, enterprise state management, UI kit, new dependencies, API composition route, or persistence/migration change. **C-01 is unchanged:** real student data/production use remain blocked until SPEC-0014/0016 implement retention/deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification.

---

# 2. Settled architecture decisions

| Decision | Choice | Alternatives rejected | Rationale | Observable consequences |
|---|---|---|---|---|
| Workspace IA | React Router `HashRouter` route `workspace`, canonical URL `/#/workspace`; preserve `/` projection | BrowserRouter `/workspace` plus Fastify SPA fallback; replace `/`; separate app | The existing production server serves `index.html` only for `/`; fragment navigation always requests `/` and needs no server route fallback | Reload/copy/paste of `/#/workspace` loads `/`, then the client router renders the private workspace; workspace has no projection DTOs |
| Shell composition | Small explicit React components in `apps/web/src/workspace/`; native fetch, `useReducer`/`useState`, CSS | One growing `main.tsx`; Redux/Zustand/React Query; UI kit | This is the first bounded screen and has class-sized data; explicit ownership is more testable than framework infrastructure | No new package; components have named props and pure helpers are unit-testable |
| Year context | Infrequent compact year control in header; `/#/workspace?year=<UUID>&group=<UUID>&student=<UUID>` is addressable context, not data storage | Hidden “current” year; local-only selection; storage | No current flag exists; the hash URL enables reload/deep link while exposing only opaque IDs | Default/reconciliation rules below; no local/session storage |
| Default selection | First unarchived year returned by server order; its first group returned by server order; if no unarchived year, first archived year from `includeArchived=true` | Guess calendar year; manufacture rollover | Reuses authoritative deterministic order without product inference | A historic-only workspace opens visibly read-only |
| Cards | Button cards open the panel; teacher-private identity is `realName` primary, `alias` secondary, avatar token glyph, specialty only when non-null | Per-card domain buttons; projection card | Fast selection and one action area prevent duplicated future rules | No XP/level/coins/Energy/RT/behaviour/grade/badge/incident fields or ranking |
| Search | Client-side normalized token-substring match over real name and alias for active loaded roster | Server/full-text/fuzzy search; dependency | At most 30 records are already required for cards; local filtering is immediate and avoids a new private endpoint | Deterministic, diacritic-insensitive search; no network per keystroke |
| Panel | Desktop persistent right rail; tablet modal drawer with dialog semantics; selected student reflected in URL | Separate detail page; generic plugin panel | Keeps roster visible and selection switchable during teaching | Escape/close restores originating card focus; future content has named slots only |
| Actions/undo | Presentation and typed contracts only; no mutation button/domain fake. The workspace default undo window is 10 seconds; a future approved domain action may supply a positive finite override or declare itself non-undoable | Generic engine/command bus; fake XP write; immutable global window | SPEC-0003 supplies a consistent transient shell without deciding whether a domain mutation remains valid or how it reverses | State transitions, default/override/non-undoable behavior, and domain-owned outcomes are testable without server mutation |
| Data/API | Reuse three SPEC-0002 GET routes; no new API | `/workspace` composition endpoint; GraphQL/realtime/cache library | Three small authenticated reads are sufficient; no measured latency issue | Fetch year → group list → roster, abort stale work, map existing typed errors |
| Privacy | Teacher workspace consumes only canonical `TeacherStudentDto` from authenticated roster endpoints | Client projection filtering; projector toggle; public endpoint | Private identity must never be made safe by rendering choice | No private data in browser storage, logs, diagnostics, or projection routes |
| Visual language | Extend existing dark navy/radial Éclipse CSS with compact CSS custom properties and one “signal rail” accent marking selected context | Dashboard/template system; UI kit | Preserves proven focus/reduced-motion foundations while making classroom state legible | Dense but readable cards; rail is the one signature, not decorative dashboard chrome |

## 2.1 Workspace information architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ ÉCLIPSE / Teacher workspace     [Year: 2026–2027 ▾] [Historical]     │
│ Groups: [Group A] [Group B]              [Search name or alias   ×]  │
├───────────────────────────────────────┬──────────────────────────────┤
│ Roster — 24 students                  │ Student panel                │
│ [avatar] Real name                    │ avatar  Real name            │
│          Alias · Specialty             │ Alias · Specialty             │
│ [selected card has signal rail]        │ [FastActionShell]             │
│ …                                     │ feedback / UndoBanner         │
└───────────────────────────────────────┴──────────────────────────────┘
```

The shell header owns route navigation/context controls. The roster is a responsive grid (three columns at wide laptop, two at tablet, one only below the tablet breakpoint). Cards remain a single full-size button with visible selected state. The panel is empty until selection, then stays open while another card is selected. On desktop it is a labelled `aside`; on tablet it is an accessible modal drawer (`role="dialog"`, `aria-modal="true"`, labelled title). No mobile-specific workflow is optimized here, but it remains operable.

**Context rules:** query IDs are validated as UUIDs before use. On entry, the `workspace` hash route loads unarchived years. If none, request `?includeArchived=true`; choose its first result and label the shell **Historical — read-only**. A valid hash-query year wins over default; an unavailable/invalid year is replaced with the default via hash-route replacement. Load that year’s groups. A hash-query group wins only if it belongs to the loaded year; otherwise choose the first group or remove `group`/`student`. A hash-query student wins only if it is returned by the current roster; otherwise remove `student` and close the panel. One group is selected automatically; zero groups shows “No groups in this year” and no roster request; many use the visible selector. Empty groups show “No students in this group.” There is no browser storage and no rollover inference.

Active years load only active students (the API default). Historical years request `includeArchived=true` to show the authorized historical roster, with archived students marked “Archived”; all cards/panel are read-only. A selected active student removed by a refresh is closed with a concise status. Group/year changes immediately clear search, selection, feedback, undo, and pending action; close the panel; abort outstanding roster work.

---

# 3. Contracts, state, and data flow

## 3.1 Existing API contracts reused unchanged

| Request | Success / workspace use | Expected failure handling |
|---|---|---|
| `GET /api/v1/academic-years` then fallback `?includeArchived=true` | `AcademicYearDto[]`: `id,label,startsOn,endsOn,archivedAt` | `401` enters sign-in state; `500` shows retryable year-load error |
| `GET /api/v1/academic-years/:yearId/groups` | ordered `GroupDto[]`: `id,academicYearId,name` | `404` reconciles URL/default; other recoverable failure offers retry |
| `GET /api/v1/groups/:groupId/students[?includeArchived=true]` | ordered `TeacherStudentDto[]`: `id,groupId,realName,alias,avatar,specialty,archivedAt` | `404` reconciles invalid context then reloads; `401` enters sign-in; `500` retains context and exposes retry |

All fetches use same-origin cookies and `AbortController`. Each context load owns a monotonically increasing request generation; only the latest non-aborted generation may commit state. An aborted/stale response causes no error or feedback. The client parses known `{code,message,requestId}` errors; it shows the user-safe message only, never logs DTOs or request bodies. `401 AUTH_REQUIRED` clears private in-memory state and renders the existing sign-in form; after success, restart selection from the URL/default (not from stored roster data). `404` is reconciliation, not proof that a private record exists.

```
URL/context → years GET → groups GET → roster GET → Workspace reducer
                                           │                ├─ filter(query)
teacher cookie ────────────────────────────┘                └─ cards → panel → shell
```

## 3.2 Client state ownership

| State | Owner / persistence | Rule |
|---|---|---|
| Active year, group, selected student ID | `/#/workspace` hash query + workspace reducer | Opaque UUIDs only; validate and reconcile against current server lists |
| Year/group/student records | Server response + in-memory reducer | Never localStorage/sessionStorage/URL payload |
| Search query | Local reducer only | Clears on group/year change, refresh/navigation |
| Panel open | Derived from valid selected student ID + local close intent | Hash query has selection, not `open`; invalid selection closes |
| Request generations/controllers | Local refs | Abort and suppress stale completion |
| Pending action, feedback, undo opportunity | Local reducer only | Clears on context change, refresh, navigation, selection change, or expiry |
| Domain action data/history | Nowhere in SPEC-0003 | Future domain/server owns it |

## 3.3 Search and card contracts

`normalizeSearch(value)` trims, lowercases with locale-independent Unicode case mapping, canonical-decomposes (`NFD`), strips combining marks, then collapses internal whitespace. A normalized non-empty query splits on spaces. A student matches only when **every token** is a substring of the normalized real name **or** alias (tokens may match across the two fields); empty query shows the server order. Search applies to the loaded historical roster too, including archived students. “No matching students” retains the query, offers a clear button, and does not close an already selected still-valid student. Escape clears a non-empty search first; otherwise follows panel close. `/` focuses search unless focus is already in an editable control or an open dialog. The clear control restores search focus.

Avatar is rendered from its existing opaque built-in token, never an upload URL. Each card displays real name, alias, avatar, and nullable specialty; real name is the visual/name-accessible hierarchy. The list preserves API order, not filtered sort order. Cards are `button`s with at least 44×44 CSS px targets; Enter/Space opens/selects. Archived cards are visibly marked and cannot offer actions.

## 3.4 Fast-action and undo foundation

The panel creates no domain buttons today. It renders `FastActionShell` in one of: `empty` (“Actions will appear here when a classroom tool is available”), `pending`, `success`, or `failure`; in the current scope it remains `empty`. A future domain supplies a small named action descriptor and callback—no registry, dynamic schema, bus, or cross-domain tables:

```ts
export type WorkspaceStudentContext = Readonly<{
  academicYearId: string; groupId: string; studentId: string;
  realName: string; alias: string; readOnly: boolean;
}>;
export type WorkspaceUndoableAction = Readonly<{
  id: string; label: string;
  undoPolicy?: Exclude<WorkspaceUndoPolicy, Readonly<{ kind: 'none' }>>;
  perform: (context: WorkspaceStudentContext) => Promise<WorkspaceActionResult>;
}>;
export type WorkspaceUndoPolicy =
  | 'default'
  | Readonly<{ kind: 'window'; durationMs: number }>
  | Readonly<{ kind: 'none' }>;
export type WorkspaceNonUndoableAction = Readonly<{
  id: string; label: string; undoPolicy: Readonly<{ kind: 'none' }>;
  perform: (context: WorkspaceStudentContext) => Promise<WorkspaceNonUndoableActionResult>;
}>;
export type WorkspaceAction = WorkspaceUndoableAction | WorkspaceNonUndoableAction;
export type WorkspaceActionResult = Readonly<{
  message: string; undo?: WorkspaceUndoCapability;
}>;
export type WorkspaceNonUndoableActionResult = Readonly<{
  message: string; undo?: never;
}>;
export type WorkspaceUndoCapability = Readonly<{
  label: string;
  undo: () => Promise<WorkspaceUndoResult>;
}>;
export type WorkspaceUndoResult =
  | Readonly<{ kind: 'undone'; message: string }>
  | Readonly<{ kind: 'invalid'; message: string }>;
export type UndoOpportunity = Readonly<{
  actionId: string; studentId: string; groupId: string; expiresAt: number;
  label: string; undo: WorkspaceUndoCapability['undo'];
}>;
```

`FastActionShell` receives `{ context, action?: WorkspaceAction, state, onResult }`; it disables its one control before `perform`, exposes immediate `aria-live="polite"` pending text, and ignores repeat activation while pending. Success/failure feedback uses the action’s stable label; failure keeps the panel/context stable and permits retry only after completion. A future caller must cancel/ignore completion if its captured year/group/student no longer equals current context. Touch/keyboard activate the same control; no shortcuts are reserved now.

Undo is a local `UndoBanner` reducer contract only: at most **one** opportunity. `undoPolicy` omitted or `'default'` applies a 10-second workspace window only when `perform` returns an `undo` capability. `{ kind: 'window', durationMs }` applies that exact duration only when it is finite and greater than zero; zero, negative, `NaN`, and infinite values are invalid action descriptors and must not produce an opportunity. `{ kind: 'none' }` declares the action non-undoable and its type cannot return a capability. A result with no capability likewise produces success feedback only; the workspace does not infer a domain rule.

The workspace owns banner presentation, transient timing, expiry feedback, replacement, and invalidation on refresh, navigation, year/group/student/context change, panel close, or another action. It contains no action payload beyond opaque action/student/group IDs, label, expiry, and the domain callback; it is not persisted, refreshed, replayed, audited, or a universal history. The banner is visible only while its student/group match current context. Expiry removes it without calling the domain and announces “Undo period ended.” Undo disables itself while pending. The creating domain owns whether undo is still valid and the reversal operation: the shell invokes its callback and renders `undone` or `invalid` results without deciding mutation validity. An `invalid` result removes the opportunity and announces its user-safe message; a rejected/failed callback removes it and reports “Could not undo [label].” A later action invalidates any prior opportunity before it may optionally replace it. Future domains define their own server-side compensating endpoint, authorization, validation, idempotency, and audit semantics. SPEC-0010 remains the owner of history/audit.

---

# 4. Privacy, failure, accessibility, and visual baseline

## 4.1 Privacy and security

The workspace is teacher-private and must call only authenticated canonical roster endpoints. `TeacherStudentDto` reaches only the authenticated teacher browser; it is never transformed client-side into projection data. A CSS “projector” mode, React hide/show toggle, public endpoint, query-selectable fields, private fallback, and browser storage are prohibited. Do not place real names/aliases in console logs, analytics, error telemetry, URLs beyond opaque IDs, diagnostics, test traces beyond controlled fixtures, or CSS/test IDs. Projection remains server-allowlisted and SPEC-0009-owned. On session expiry, discard in-memory private data before presenting sign-in; do not display stale cards behind it.

## 4.2 Failure and edge-case matrix

| Situation | Required behavior |
|---|---|
| No years | “No academic years available”; no group/roster fetch, no actions |
| No active years, archived history exists | Load first archived returned year; conspicuous read-only banner |
| Zero / one / many groups | Empty state / auto-select only group / select first and show group control |
| Empty group | Empty roster state; search disabled until cards exist |
| Invalid/stale URL year/group/student | Validate/reconcile via `replaceState`; never fetch arbitrary student detail |
| Archived year or student | Historical badge; cards remain inspectable but panel/action shell is read-only/empty |
| Selected student archived/removed on refresh | Keep if returned historical; otherwise close panel, remove `student`, announce change |
| Auth expiry | Abort/clear private state, show sign-in, reload after successful sign-in |
| Roster request fails | Keep controls/context, show message and explicit Retry; no stale-data claim after a failed initial load |
| Group switch in flight / rapid selection | Abort old request; generation gate; only current roster/selection commits |
| No search match | No-results state and clear/focus behavior; no sort mutation |
| Repeated future action | Disable while pending; ignore duplicate activation |
| Success interrupted by navigation/context change | Ignore stale completion; no feedback/undo leaks into new context |
| Future undo is expired | Remove the banner, announce expiry, and do not invoke the domain callback |
| Future undo is domain-invalid | Invoke the callback; remove the banner and render its user-safe `invalid` result without workspace business validation |
| Future undo callback fails | Remove the banner and report “Could not undo [label]”; do not retry automatically |
| Future undo is pending/replaced | Disable repeat undo while pending; a later action invalidates the prior opportunity and replaces it only when its policy and capability create one |

## 4.3 Accessibility and visual decisions

Keyboard order is header context controls → search → roster cards in server order → panel controls. Visible focus uses the existing high-contrast outline; no focus is lost during filtered rerender. Opening a tablet drawer moves focus to its heading/close button; Escape/close restores the originating card where present, otherwise search. Loading and recoverable errors use `role="status"`/polite live announcements; authentication failures use an alert. Existing `prefers-reduced-motion` remains mandatory. Do not promise a network SLO: local filtering must update in the same input event/render cycle; action activation must immediately visibly enter pending state.

Extend the existing navy (`#101820`), deep panel, amber (`#f3b562`), green, and error palette with explicit CSS variables. Use a restrained utility/system font stack already in the app. The signature is a narrow amber-to-green **signal rail** on the selected card/panel edge—an orientation cue for live teaching, not a ranking or metric. Maintain the 1100px container; use a 68/32 desktop grid, collapsing the rail to the drawer at tablet width. No tokens beyond this screen vocabulary and no generic design system.

---

# 5. Future seams, persistence, and implementation boundary

| Future SPEC | May provide | Workspace must provide / must not provide |
|---|---|---|
| SPEC-0004 XP/specialty/level/badges | Named action(s), action-owned undo policy/capability, validity/reversal semantics, bounded summary slot | Context, one action control, timing/presentation/feedback; no XP calculation/display table or undo-validity decision |
| SPEC-0005 coins/rewards | Named reward action with action-owned undo policy/capability and validation/reversal | Context, transient timing, and feedback only; no balance/ledger or undo-validity ownership |
| SPEC-0006 RT/Energy/tasks | Task action(s), including future bulk flow outside this panel | Student context; no RT/Energy values or task rules |
| SPEC-0007 behaviour/incidents | Behaviour action and read contract | Context and feedback; no behaviour state/disciplinary data now |
| SPEC-0009 projection | Separate classroom-safe route/API/composition | Nothing private is reused or filtered for projection |

There are **no migrations, tables, columns, server mutations, static-server changes, or storage changes**. Hash-query IDs are navigation context only; all workspace timing and undo state are transient. A future action must use a domain-owned compensating API; this foundation introduces no global undo stack, history/audit system, event sourcing, generic reversal engine, or persistence for UI preference/undo.

## 5.1 Predicted Working Set

| Action | Files |
|---|---|
| Create | `apps/web/src/workspace/{WorkspaceApp,workspace-state,workspace-api,search,WorkspaceShell,YearContextControl,GroupSelector,StudentRoster,StudentCard,StudentPanel,FastActionShell,UndoBanner}.tsx` (or `.ts` for pure helpers); `apps/web/src/workspace/*.test.ts`; `apps/web/e2e/teacher-workspace.spec.ts` |
| Modify | `apps/web/src/main.tsx`; `apps/web/src/styles.css`; `vitest.config.ts`; `apps/web/e2e/auth-projection.spec.ts` only if route fixture separation needs preservation; `playwright.config.ts` only for canonical roster fixture bootstrapping |
| Must not touch | `apps/api/src/**` (including `server.ts`); `packages/{contracts,domain}/**`; migrations; package manifests/lockfile; deployment; stable context except phase-required session updates |

The exact file split may be reduced only when it retains the named boundaries; expanding beyond this Working Set requires evidence and a recorded reason.

## 5.2 Read Order for Tasks and Apply

1. This Design; 2. `AGENTS.md`; 3. `docs/SDD-WORKFLOW.md`; 4. SPEC-0001 and SPEC-0002 Designs plus SPEC-0002 Verify/Archive reports; 5. `apps/web/src/{main.tsx,styles.css}` and `apps/web/{vite.config.ts,index.html}`; 6. `apps/api/src/roster/{routes,service,repository,mapper}.ts`; 7. `apps/api/src/{auth/routes.ts,http/errors.ts}` and `packages/contracts/src/index.ts`; 8. `vitest.config.ts`, `playwright.config.ts`, focused roster/privacy tests, and existing projection E2E.

## 5.3 Implementation constraints

- Use the already installed React Router `HashRouter`; do not add dependencies. Keep `/` as projection/demo and `/#/workspace` as the teacher-private workspace hash route; do not add a Fastify SPA fallback.
- Reuse exact canonical routes/DTOs; no API, schema, or projection changes without a Design BLOCKER.
- Keep browser state transient, abort stale fetches, and never log/store private roster data; do not persist undo or add a global undo/history/reversal mechanism.
- Do not introduce domain mutation, generic action infrastructure, or false action feedback in this SPEC.
- Preserve API response ordering; use accessible selectors and canonical roster fixtures in E2E, never the projection fixture.

---

# 6. Testing strategy and objective acceptance criteria

| Layer | Coverage | Approach |
|---|---|---|
| Vitest web unit | `normalizeSearch` trim/case/diacritic/token-substring behavior; filter preserves API order; reducer reconciliation, request generation, selection/context invalidation; undo default 10-second window, positive finite override, non-undoable/no-capability, domain-invalid, expiry, pending, replacement, and callback-failure transitions | Add web test include and focused pure `.test.ts`; use fake time for windows; no DOM implementation-detail snapshots |
| API integration/privacy | None new unless Apply changes server contracts (not planned) | Existing SPEC-0002 auth/DTO privacy tests remain the authoritative server evidence; any server change is a Design BLOCKER |
| Playwright | authenticated `/#/workspace` load and reload/copy-paste behavior; default/hash-query year-group selection; roster rendering; search; panel open/switch/close/focus; historical read-only; auth expiry/recovery; loading/error retry; fast-action empty/pending/success/failure controlled fixtures; undo default/override/non-undoable visibility, expiry, pending, replacement, and context invalidation where the shell harness makes them testable | Seed a canonical year/group/students through authenticated roster APIs in Playwright setup; do not use `projection_students` or assert implementation internals |

- [ ] **AC-01:** `/#/workspace` is the canonical teacher workspace route. Direct reload/copy-paste requests the `/` document, then the client hash router renders the workspace; `/` without a hash still renders the fixture-backed classroom projection. The workspace never calls a projection endpoint/table.
- [ ] **AC-02:** An authenticated teacher loads canonical years, groups, and ordered `TeacherStudentDto` cards through the three specified routes; no workspace composition API or dependency is added.
- [ ] **AC-03:** Default, valid deep-link, invalid/stale URL, no-year, historic-only, zero/one/many group, and empty-group states follow Section 2.1 exactly.
- [ ] **AC-04:** Active context excludes archived students by default; archived historical context requests and visibly labels read-only records and exposes no action affordance.
- [ ] **AC-05:** Cards expose only real name, alias, avatar token, and nullable specialty in teacher-private workspace order; they expose none of XP, level, coins, Energy, RT, behaviour, grades, badges, incidents, or rankings.
- [ ] **AC-06:** Search implements the stated trim/case/diacritic/all-token substring semantics locally, clears/focuses correctly, preserves server order, and has tested no-match behavior.
- [ ] **AC-07:** Card keyboard/touch activation opens/switches the panel; desktop/tablet panel semantics, Escape, focus restoration, stale selection, and read-only behavior meet Section 2.1.
- [ ] **AC-08:** `FastActionShell` is presentation/contract-only in SPEC-0003, gives immediate pending/feedback semantics for controlled test actions, and prevents double submit/stale completion without creating a domain mutation. A future action may omit `undoPolicy`/use `'default'`, provide only a positive finite `{ kind: 'window', durationMs }` override, or declare `{ kind: 'none'`; the shell does not decide domain undo validity or reversal.
- [ ] **AC-09:** Undo permits one transient, context-bound opportunity only. An action returning a capability with omitted/`'default'` policy gets a 10-second workspace window; a positive finite override gets its exact window; `none` or no capability produces no opportunity. It is never persisted/history, and domain-invalid, expiry, pending, replacement, context invalidation, and callback-failure transitions are tested.
- [ ] **AC-10:** `401` clears private in-memory state and offers sign-in/recovery; `404` reconciles context; recoverable roster failures announce a retry without leaking DTO/error diagnostics.
- [ ] **AC-11:** No private roster data is written to browser storage, URL payloads, logs, diagnostics, projection UI/API, or a client-side “safe” filter; focused privacy regression evidence remains green.
- [ ] **AC-12:** Keyboard order, visible focus, drawer/dialog focus handling, 44px targets, polite loading/error/action announcements, and reduced-motion behavior are covered by implementation and critical E2E assertions.
- [ ] **AC-13:** Vitest is extended minimally for web pure-state tests and Playwright is seeded with canonical roster data; no API test is added absent a server contract change.
- [ ] **AC-14:** C-01 is retained unchanged in downstream Tasks/Apply/Verify as a production-only condition.

## 6.1 Rollout and rollback

Local rollout is a web-only build after canonical roster API fixtures are available. There is no feature flag, migration, data conversion, or server route change. Rollback reverts the workspace hash route/components/styles/tests; roster data, Fastify static serving, and `/` projection remain untouched. Remove `/#/workspace` client navigation if rollback is needed; do not add a path-based server fallback. C-01 still governs production use.

## 6.2 Threat matrix

| Boundary | Applicability | Design response / RED tests |
|---|---|---|
| Routing | Applicable — client hash navigation changes route ownership; no server/process boundary | HashRouter owns `workspace`; direct reload/copy/paste of `/#/workspace` must request `/` and render workspace after client boot; RED Playwright test covers initial navigation, reload, and copied hash URL, while `/` remains the fixture-backed projection/demo route |
| Shell commands | N/A — none | None |
| Subprocesses | N/A — none | None |
| VCS/PR automation | N/A — none | None |
| Executable-file classification | N/A — none | None |
| Process integration | N/A — none | None |

---

# 7. Findings, self-check, and review handoff

## 7.1 Open findings

### BLOCKER
None. Existing canonical roster APIs provide the necessary teacher-private context; no contradiction was found.

### CONDITION
- **C-01 — production privacy and recoverability gate (unchanged):** before real student data or production use, SPEC-0014/0016 must define/implement retention and deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification.
- **C-02 — production-topology route proof:** Tasks must retain hash-route Playwright coverage and add a focused proof against Fastify serving a built web artifact (not only Vite): `/#/workspace` initial navigation/reload/copy-paste requests `/` and boots the workspace, while `/` remains the projection/demo route. This requires neither a Fastify fallback nor an API/dependency change.

### NON-BLOCKING
- Full accessibility/performance hardening remains SPEC-0015; this Design supplies the baseline needed for safe classroom interaction.
- Avatar artwork/catalog presentation remains a later content/UI concern; this workspace renders only existing opaque tokens.

## 7.2 Design self-check conclusion

Self-check completed against current React/Vite entry, stylesheet, Playwright/Vitest configuration, authenticated roster/auth/error contracts, DTO mappers, and focused roster/privacy tests. The design preserves DEC-005’s server privacy boundary, SPEC-0002’s deterministic canonical roster and terminal archive semantics, fixture isolation, C-01, and the approved stack. Every in-scope behavior, failure state, ownership boundary, test layer, Working Set, and downstream read order is settled; no material decision is deferred.

# Architecture Review result

**Historical state:** PENDING — recorded before the original Architecture Review below.

### Required review focus
- Verify HashRouter integration preserves `/` projection fixture ownership and keeps `/#/workspace` private/canonical without a server fallback.
- Verify URL reconciliation, transient state, and action/undo seams do not introduce private-data persistence or future-domain rules.
- Verify canonical roster fixture strategy can exercise the specified E2E cases without API changes.

## Architecture Review

**Result:** BLOCKED

**Evidence reviewed:** `AGENTS.md`; `docs/SDD-WORKFLOW.md`; active context; archived SPEC-0001 and SPEC-0002 Design, Verify, and Archive evidence; this candidate; the web entry/style/test configuration; and current Fastify static-route, canonical-roster, auth, error, projection-fixture, and DTO-mapper anchors.

### BLOCKER

- **B-01 — `/workspace` cannot be directly served in production within the stated Working Set.** The Design requires React Router’s canonical `/workspace` route and direct browser navigation (Sections 2, 5.3, and AC-01), while the current production Fastify static setup only serves `index.html` for `/` (`apps/api/src/server.ts:43–47`). It has no SPA fallback for `/workspace`. The candidate simultaneously prohibits modifying `apps/api/src/**` (Section 5.1) and says no API change is permitted (Section 5.3). A direct production request to `/workspace` would therefore not load the SPA, making an essential route/compatibility acceptance criterion impossible to verify or implement as designed.

**Required correction:** Refine the Design to settle the minimal production route-serving responsibility and adjust the Working Set/constraints accordingly, while preserving `/` projection ownership and leaving roster/projection DTOs and APIs unchanged. Do not start Tasks until this contradiction is resolved.

### CONDITION

- **C-01 — production privacy and recoverability gate:** unchanged. Before real student data or production use, SPEC-0014/0016 must define/implement retention and deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification.

### NON-BLOCKING

None.

### Review conclusion and next step

The candidate is otherwise bounded to the intended teacher-private workspace and preserves canonical roster DTO use, server-side privacy, fixture isolation, transient state, future-domain separation, and the planned test pyramid. B-01 is an implementation and objective-acceptance contradiction, not a styling preference; it requires the single specified Design Refinement before a follow-up scoped review.

---

## Design Refinement — B-01

**Problem:** The blocked candidate made path-based `/workspace` a production deep link although Fastify serves `index.html` only for `/`, while the Working Set correctly prohibited `apps/api/src/**` changes.

**Choice:** Use installed `react-router-dom` with a `HashRouter`: `/#/workspace` is the canonical teacher workspace route and `/#/workspace?year=<UUID>&group=<UUID>&student=<UUID>` carries only opaque navigation context. `/` remains the fixture-backed projection/demo route.

**Rejected:** A path-based `/workspace` route with a Fastify SPA fallback. It would require server route-serving work outside the intended web-only Working Set and is unnecessary for the bounded workspace.

**Rationale:** Browser requests omit the fragment, so reload or copy/paste of the canonical URL loads the existing `/` document; the client router then renders the workspace. This resolves B-01 without changing roster/projection DTOs or APIs, adding browser storage, or weakening teacher authentication and projection separation.

**Consequences:** Route tests must prove initial hash navigation, reload, and copied hash URL behavior, plus unchanged `/` projection ownership. `apps/api/src/server.ts` remains untouched. At the time of this refinement the Design remained **Refined / Candidate** pending the scoped B-01 follow-up review; it did not claim approval.

## Scoped Architecture Review — B-01 Follow-up

**Result:** APPROVED WITH CONDITIONS

**Scope and evidence:** Only the B-01 hash-route refinement and affected cross-references were reviewed: Sections 1, 2, 3, 5, 6, and 6.2; AC-01; rollout/rollback; the original blocked review; `AGENTS.md`; `docs/SDD-WORKFLOW.md`; archived SPEC-0001/0002 authority; `apps/api/src/server.ts`; `apps/web/src/main.tsx`; `apps/web/package.json`; and the current Playwright/Vite setup.

### BLOCKER
None. A request for `/#/workspace` has a request target of `/` because fragments are not sent to Fastify. The existing explicit `GET /` static response therefore boots the SPA without a `/workspace` fallback; React Router `HashRouter` can then resolve `workspace` and its hash query. `/` with no fragment remains the fixture-backed projection/demo route. The correction leaves teacher authentication, canonical roster DTO/API use, opaque UUID-only URL context, no browser persistence, projection isolation, C-01, and all unrelated Design decisions unchanged.

### CONDITION
- **C-01 — production privacy and recoverability gate:** unchanged. Before real student data or production use, SPEC-0014/0016 must define/implement retention and deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification.
- **C-02 — production-topology route proof:** Tasks must retain the hash-route Playwright coverage and add a focused proof against Fastify serving a built web artifact (not only the current Vite dev server): `/#/workspace` initial navigation/reload/copy-paste requests `/` and boots the workspace, while `/` remains the projection/demo route. This is a test/fixture constraint only; it requires neither a Fastify fallback nor an API/dependency change.

### NON-BLOCKING
None.

### Scoped review conclusion and next step
The B-01 correction is executable and leaves no unresolved route correctness, privacy, or data-safety blocker. Tasks can be derived without a new architecture decision. This Design remains Refined / Candidate awaiting maintainer approval; the original blocked review is retained above as history. **Next step: Maintainer approval of the SPEC-0003 Design with conditions, then Tasks.**

---

## Design Refinement — Undo Policy

**Problem:** The candidate described a 10-second undo window as though it were immutable for every future domain action, which would make the workspace decide future domain behavior.

**Choice:** The workspace supplies a 10-second default only when a future action returns an undo capability and omits `undoPolicy` or uses `'default'`. A future approved domain action may instead supply a positive finite `{ kind: 'window', durationMs }` override or `{ kind: 'none'`. The workspace owns transient presentation, timing, expiry feedback, replacement, and context invalidation; the creating domain owns continuing validity and reversal through its callback/result.

**Rejected:** A universal immutable window; a global undo stack, audit/history system, event sourcing, generic reversal engine, persistence, migration, or dependency.

**Rationale:** This keeps the SPEC-0003 foundation bounded and transient while allowing later approved domains to express their own business rules without making the shell validate mutation semantics.

**Review state:** The B-01 Architecture Review history above is preserved unchanged. The scoped undo-policy review below approves this refinement with C-01 and C-02 as the only conditions.

---

## Scoped Architecture Review — Undo Policy

**Result:** APPROVED WITH CONDITIONS

**Scope and evidence:** Only the undo-policy refinement and its affected contracts, state ownership, failure matrix, future seams, test strategy, AC-08/AC-09, and C-01/C-02 cross-references were reviewed, together with the current Design, `SESSION.md`, original Architecture Review, B-01 follow-up record, approved SPEC-0001/0002 boundaries, and `docs/SDD-WORKFLOW.md` finding semantics.

### BLOCKER
None. The workspace supplies 10 seconds only as a default for a returned capability with omitted/`'default'` policy. A future approved action can select that default, a positive finite exact override, or non-undoable; invalid override descriptors and absent capabilities create no opportunity. The discriminated contracts prevent a non-undoable action from returning a capability.

The workspace remains limited to presentation, transient timing, expiry feedback, replacement, and invalidation on refresh, navigation, year/group/student/context change. The creating domain supplies the callback, owns reversal and continuing business validity, and returns `undone`/`invalid`; callback failure is rendered without shell business rules. No global stack, history/audit system, event sourcing, generic reversal engine, persistence, migration, dependency, or future-domain mutation is introduced.

AC-08/AC-09 and the unit/E2E strategy objectively cover default, exact override, non-undoable, absent capability, domain-invalid/failing reversal, expiry, pending, replacement, and context invalidation. Tasks can be derived without a new architectural or product decision. All other approved Design decisions remain intact.

### CONDITION
- **C-01 — production privacy and recoverability gate (unchanged):** before real student data or production use, SPEC-0014/0016 must define/implement retention and deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification.
- **C-02 — production-topology route proof:** Tasks must retain the hash-route Playwright coverage and add a focused proof against Fastify serving a built web artifact (not only the current Vite dev server): `/#/workspace` initial navigation/reload/copy-paste requests `/` and boots the workspace, while `/` remains the projection/demo route. This is a test/fixture constraint only; it requires neither a Fastify fallback nor an API/dependency change.

### NON-BLOCKING
None.

### Scoped review conclusion and next step
SPEC-0003 Design is **Approved**. The retained Architecture Review result is **APPROVED WITH CONDITIONS**; C-01 and C-02 are the only conditions. **Next step: Autonomous post-Design SDD continuation: Tasks for SPEC-0003.**
