# SPEC-0042 — M11 Narrative, Events, Challenges, and Minigame Integration

**Phase:** Design (Sol)  
**Level:** C — progression, migration, concurrency, privacy, and cross-owner adapters  
**Status:** DESIGN READY; maintainer-approved canon for all nine events is incorporated; Terra's Projection blocker is resolved in design and requires targeted re-review; aggregate-CAS, lineage, error-contract, and response-loss idempotency blockers remain resolved  
**Dependencies:** M1–M10 and roster/calendar/game/projection/history boundaries

## 1. Outcome, scope, and invariants

Add the collective **Protocole Éclipse** sequence per teacher-owned group/year: T1 `El apagón`, `El mensaje`, `Éclipse`; T2 `El expediente`, `La anomalía`, `La reunión`; T3 `La prueba`, `El archivo Éclipse`, `La llamada`. The explicit narrative catalogue owns the approved stable keys, ordinals 1–9, terms, prerequisites, final scene summaries, canonical clues, mechanic relationships, completion rules, and visibility classification in section 3. Persistence owns group/year progress, reveals, links, aggregate revision, and command receipts.

The teacher is Game Master; UI is Spanish; students have no accounts. Narrative state is exactly `BLOCKED`, `AVAILABLE`, or `COMPLETED`. An event becomes `AVAILABLE` only after every preceding event is `COMPLETED` and its calendar term has begun; later terms may finish earlier events. `start` records that the teacher has opened the currently `AVAILABLE` event but does not create or change narrative state. Only the teacher starts, reveals, links, and completes. Narrative never writes grades, rubric, XP, RT/Energy, gems/currency, behaviour, roster, calendar, Avatar, Boutique, term-close, source game records, or generic game state.

**Non-goals:** accounts, ranking, branching engine, academic/reward mutation, websockets, generic event bus, microservices, generic audit system, history replacement, deployment, C-01 closure, or inference from `theme='NARRATIVE'`. Linked mechanics retain SPEC-0041 current-state history; narrative is not silently added as a history family.

## 2. Architecture and ownership

| Decision | Contract and rationale |
|---|---|
| Explicit narrative domain | Create `apps/api/src/narrative/{catalogue,repository,service,mapper,routes}.ts`; do not overload `classroom_events`, challenges, or minigames with canonical order. Approved French-specific content stays separate from reusable progression rules. |
| Pure catalogue | The catalogue is the sole source for the nine identities and all approved content in section 3. Stored key/ordinal/term and requested mechanic kind must match it or fail closed. There is no nine-row content seed. |
| Derived state | `COMPLETED` means the event has `completed_at`; `AVAILABLE` means it is not completed, all lower ordinals are completed, and its term is eligible; otherwise it is `BLOCKED`. A persisted `started_at`, clue count, or link never creates another state. |
| Narrow Game adapters | `narrative` may validate an owned, same-group challenge or minigame link and read terminal state (`COMPLETED`/`ENDED`). Completion remains an explicit narrative command; neither owner writes the other. Generic events are not links. |
| Aggregate revision owner | Exactly one `narrative_group_state` head per teacher-owned `(group_id, academic_year_id)` is the sole authoritative, monotonic revision owner. Its enforceable identity includes `owner_teacher_id`; event-row revisions are last-change stamps only and never source `NarrativeStateDto.revision`. |
| Durable command receipts | A narrative-owned request journal makes start, reveal, link, and complete idempotent after commit/response loss. It stores the fingerprint and exact successful HTTP outcome in the same transaction as aggregate CAS and event mutation; replay never re-runs rules or mutates state. |
| Narrow Projection adapter | Extend the existing display composer with optional `narrative`; priority is `SHOW_STUDENT > MINIGAME > CHALLENGE > EVENT > NARRATIVE > IDLE`. The lifecycle allowlist is uniform across all nine events: `AVAILABLE` exposes only title, term, ordinal, and collective progress—never clue text; `COMPLETED` may additionally expose approved revealed clue text and the completed marker. Projection never reads private source records directly. |

Flow: teacher UI → authenticated narrative route → authoritative owned group/year and calendar checks → `BEGIN IMMEDIATE` aggregate CAS → narrative repository → narrow read-only Game/Projection adapters.

## 3. Approved canonical event catalogue

`NARRATIVE-CONTENT-DRAFT.md` is retained unchanged as the approved source record. Maintainer approval covers the complete canon below; Build must treat these values as authoritative rather than pending or provisional.

### 3.1 T1 — La señal

#### Event 1 — El apagón

- **Stable key / title / term:** `t1_el_apagon` / `El apagón` / `T1`.
- **Final scene summary:** Durante una tarde aparentemente normal, las pantallas del aula se apagan al mismo tiempo que la escuela pierde el contacto fiable con el exterior de la isla. Cuando vuelven, solo queda una señal breve: una fecha, una coordenada y el símbolo de Éclipse.
- **Canonical clues, in order:**
  1. `La señal no llegó desde fuera: alguien la preparó dentro de la escuela.`
  2. `La coordenada apunta a un lugar que todos conocen, pero que casi nadie mira.`
- **Mechanic relationship:** **REQUIRED — challenge.** Link an existing group challenge used to reconstruct the signal; narrative observes only terminal `COMPLETED`.
- **Completion rule:** The event moves `BLOCKED → AVAILABLE` when T1 is eligible. While `AVAILABLE`, the teacher starts it, may reveal approved clues, must link the approved existing challenge, and waits for that challenge to reach `COMPLETED`; only an explicit teacher completion command moves it `AVAILABLE → COMPLETED`.
- **Projection-visible:** While `AVAILABLE`: only title `El apagón`, T1, ordinal 1, and collective progress such as `0/9`; no clue text. After `COMPLETED`: completed marker/progress and, additionally, approved revealed clue text. Never expose challenge ID or private administration.
- **Teacher-private:** Unrevealed clues, mechanic ID, challenge administration, teacher actions, and all student-linked data.

#### Event 2 — El mensaje

- **Stable key / title / term:** `t1_el_mensaje` / `El mensaje` / `T1`.
- **Final scene summary:** La señal contiene una frase incompleta. Al ordenar sus fragmentos, aparece una advertencia: el apagón y el silencio del exterior no fueron un accidente, y el siguiente indicio está escondido a plena vista.
- **Canonical clues, in order:**
  1. `Las palabras faltantes forman una instrucción, no una contraseña.`
  2. `El mensaje cambia de sentido cuando se lee de derecha a izquierda.`
  3. `La primera pista estaba destinada a quien supiera hacer preguntas.`
- **Mechanic relationship:** **OPTIONAL — minigame.** The teacher may link an existing minigame session used to assemble or decode the message; narrative reads only terminal `ENDED`.
- **Completion rule:** The event moves `BLOCKED → AVAILABLE` when Event 1 is `COMPLETED` and T1 is eligible. While `AVAILABLE`, the teacher starts it and may reveal approved clues. With no link, the teacher may explicitly move it `AVAILABLE → COMPLETED`; with a linked minigame, that session must first reach `ENDED`.
- **Projection-visible:** While `AVAILABLE`: only title `El mensaje`, T1, ordinal 2, and collective progress; no clue text. After `COMPLETED`: completed marker/progress and, additionally, approved revealed clue text using only approved collective wording.
- **Teacher-private:** Unrevealed clues, linked minigame ID/session details, teacher controls, and private source records.

#### Event 3 — Éclipse

- **Stable key / title / term:** `t1_eclipse` / `Éclipse` / `T1`.
- **Final scene summary:** Los dos primeros indicios forman el emblema de Éclipse. No es el nombre de una persona ni de un lugar: es el nombre de un protocolo que decide qué información puede verse, oírse y abrirse, y en qué momento.
- **Canonical clues, in order:**
  1. `Éclipse no oculta la verdad: decide cuándo puede ser encontrada.`
  2. `El archivo se abrirá cuando la escuela vuelva a escuchar lo que dejó de oír.`
- **Mechanic relationship:** **NONE.** This is a teacher-led narrative reveal using existing progression only; link is rejected.
- **Completion rule:** The event moves `BLOCKED → AVAILABLE` when Events 1 and 2 are `COMPLETED` and T1 is eligible. While `AVAILABLE`, the teacher starts it and may reveal approved clues; only an explicit teacher command moves it `AVAILABLE → COMPLETED`.
- **Projection-visible:** While `AVAILABLE`: only title `Éclipse`, T1, ordinal 3, and collective progress; no clue text. After `COMPLETED`: completed marker/progress and, additionally, approved revealed clue text; no archive contents or private records.
- **Teacher-private:** Unrevealed clues, teacher notes/actions, and any future archive detail not explicitly approved for collective display.

### 3.2 T2 — El protocolo

#### Event 4 — El expediente

- **Stable key / title / term:** `t2_el_expediente` / `El expediente` / `T2`.
- **Final scene summary:** Al comenzar el segundo tramo del curso, aparece un expediente sin nombre. Sus páginas describen decisiones tomadas durante el apagón y el aislamiento, pero cada conclusión está cubierta por una franja de tinta azul.
- **Canonical clues, in order:**
  1. `El expediente no registra culpables; registra decisiones.`
  2. `La tinta azul aparece junto a dos verbos: conservar y limitar.`
  3. `Una página pide mantener abierta la señal; otra ordena cerrar el acceso.`
- **Mechanic relationship:** **OPTIONAL — challenge.** The teacher may link an existing group challenge that organizes the expediente's collective evidence; narrative observes only terminal `COMPLETED`.
- **Completion rule:** The event moves `BLOCKED → AVAILABLE` when Events 1–3 are `COMPLETED` and T2 is eligible. While `AVAILABLE`, the teacher starts it and may reveal approved clues. With no link, the teacher may explicitly move it `AVAILABLE → COMPLETED`; with a linked challenge, that challenge must first reach `COMPLETED`.
- **Projection-visible:** While `AVAILABLE`: only title `El expediente`, T2, ordinal 4, and collective progress; no clue text. After `COMPLETED`: completed marker/progress and, additionally, approved revealed clue text, never the expediente's private contents.
- **Teacher-private:** Unrevealed clues, linked challenge ID, teacher notes, and all student or source-record data.

#### Event 5 — La anomalía

- **Stable key / title / term:** `t2_la_anomalia` / `La anomalía` / `T2`.
- **Final scene summary:** Una línea del expediente no encaja con las demás. La anomalía se repite en tres lugares distintos, como si alguien hubiera dejado una puerta abierta dentro del protocolo.
- **Canonical clues, in order:**
  1. `La anomalía no es un error: es una invitación a comprobar el camino.`
  2. `Tres marcas iguales señalan una sola decisión pendiente.`
  3. `La puerta abierta conduce al archivo, pero todavía no permite cruzarlo.`
- **Mechanic relationship:** **REQUIRED — minigame.** Link an existing minigame session for the collective pattern check; narrative observes only terminal `ENDED`.
- **Completion rule:** The event moves `BLOCKED → AVAILABLE` when Event 4 is `COMPLETED` and T2 is eligible. While `AVAILABLE`, the teacher starts it, may reveal approved clues, must link the approved minigame, and waits for that session to reach `ENDED`; only an explicit teacher command moves it `AVAILABLE → COMPLETED`.
- **Projection-visible:** While `AVAILABLE`: only title `La anomalía`, T2, ordinal 5, and collective progress; no clue text. After `COMPLETED`: completed marker/progress and, additionally, approved revealed clue text; no minigame ID, answer history, or student data.
- **Teacher-private:** Unrevealed clues, minigame/session details, teacher controls, and private source records.

#### Event 6 — La reunión

- **Stable key / title / term:** `t2_la_reunion` / `La reunión` / `T2`.
- **Final scene summary:** El expediente contiene un acta sin firmas y un fragmento de audio de una reunión que nunca aparece en ningún calendario. Varias voces discuten si el archivo debe conservarse cerrado o abrirse cuando regrese la señal.
- **Canonical clues, in order:**
  1. `El acta quedó sin firmas, pero el audio conserva dos voces en desacuerdo.`
  2. `Una voz pide mantener el protocolo hasta que pase el riesgo; otra advierte que el silencio también encierra.`
- **Mechanic relationship:** **NONE.** This is a teacher-led narrative transition using no linked mechanic; link is rejected.
- **Completion rule:** The event moves `BLOCKED → AVAILABLE` when Events 4 and 5 are `COMPLETED` and T2 is eligible. While `AVAILABLE`, the teacher starts it and may reveal approved clues; only an explicit teacher command moves it `AVAILABLE → COMPLETED`.
- **Projection-visible:** While `AVAILABLE`: only title `La reunión`, T2, ordinal 6, and collective progress; no clue text. After `COMPLETED`: completed marker/progress and, additionally, approved revealed clue text; only safe collective text is shown.
- **Teacher-private:** Unrevealed clues, teacher notes/actions, and any non-approved interpretation of the meeting.

### 3.3 T3 — La verdad

#### Event 7 — La prueba

- **Stable key / title / term:** `t3_la_prueba` / `La prueba` / `T3`.
- **Final scene summary:** El archivo ofrece una prueba sencilla: seguir sin cambiar la señal, el mensaje y el expediente, y comprobar si sus tres partes forman una misma historia. La respuesta dependerá de la atención colectiva, no de una respuesta única.
- **Canonical clues, in order:**
  1. `La prueba no pide acertar: pide conservar juntos los indicios.`
  2. `Cuando las tres partes coinciden, aparece una fecha sin año.`
- **Mechanic relationship:** **OPTIONAL — challenge.** The teacher may link an existing group challenge for collective verification; narrative observes only terminal `COMPLETED`.
- **Completion rule:** The event moves `BLOCKED → AVAILABLE` when Events 1–6 are `COMPLETED` and T3 is eligible. While `AVAILABLE`, the teacher starts it and may reveal approved clues. With no link, the teacher may explicitly move it `AVAILABLE → COMPLETED`; with a linked challenge, that challenge must first reach `COMPLETED`.
- **Projection-visible:** While `AVAILABLE`: only title `La prueba`, T3, ordinal 7, and collective progress; no clue text. After `COMPLETED`: completed marker/progress and, additionally, approved revealed clue text; no challenge administration or private data.
- **Teacher-private:** Unrevealed clues, linked challenge ID, teacher actions, and all student-linked information.

#### Event 8 — El archivo Éclipse

- **Stable key / title / term:** `t3_el_archivo_eclipse` / `El archivo Éclipse` / `T3`.
- **Final scene summary:** El archivo finalmente se abre. Registra que Éclipse fue activado durante una emergencia para conservar información y mantener la continuidad de la comunidad. También muestra que filtró comunicaciones y restringió accesos durante el aislamiento: pudo ser una protección necesaria o una forma de confinamiento.
- **Canonical clues, in order:**
  1. `El archivo no pertenece a una persona: pertenece a una promesa compartida.`
  2. `La primera activación ocurrió cuando la escuela dejó de recibir señales del exterior.`
  3. `El mismo protocolo que conservó la información decidió qué mensajes podían pasar y cuáles debían esperar.`
- **Mechanic relationship:** **REQUIRED — minigame.** Link an existing minigame session used for the collective archive opening; narrative observes only terminal `ENDED`.
- **Completion rule:** The event moves `BLOCKED → AVAILABLE` when Event 7 is `COMPLETED` and T3 is eligible. While `AVAILABLE`, the teacher starts it, may reveal approved clues, must link the approved minigame, and waits for that session to reach `ENDED`; only an explicit teacher command moves it `AVAILABLE → COMPLETED`.
- **Projection-visible:** While `AVAILABLE`: only title `El archivo Éclipse`, T3, ordinal 8, and collective progress; no clue text, and archive contents remain private. After `COMPLETED`: completed marker/progress and, additionally, approved revealed clue text; no archive contents, minigame ID, or private administration.
- **Teacher-private:** Unrevealed clues, archive detail, minigame/session data, teacher notes, and all student or educational records.

#### Event 9 — La llamada

- **Stable key / title / term:** `t3_la_llamada` / `La llamada` / `T3`.
- **Final scene summary:** La señal vuelve una última vez como una comunicación recuperable desde fuera de la isla. El contacto confirma que el exterior existía y que alguien intentó alcanzar la escuela durante el aislamiento, pero no explica por sí solo si las restricciones de Éclipse estaban justificadas.
- **Canonical clues, in order:**
  1. `La llamada conserva una fecha, una coordenada y una frase enviada desde el exterior.`
  2. `El mensaje confirma que alguien esperaba respuesta, pero llega incompleto antes de explicar por qué el contacto falló.`
- **Mechanic relationship:** **NONE.** The finale is a teacher-led collective conclusion with no linked mechanic; link is rejected.
- **Completion rule:** The event moves `BLOCKED → AVAILABLE` when Event 8 is `COMPLETED` and T3 is eligible. While `AVAILABLE`, the teacher starts it and may reveal approved clues; only an explicit teacher command moves it `AVAILABLE → COMPLETED`.
- **Projection-visible:** While `AVAILABLE`: only title `La llamada`, T3, ordinal 9, and collective progress; no clue text. After `COMPLETED`: completed marker/progress and, additionally, approved revealed clue text and collective completion of the nine-event arc.
- **Teacher-private:** Unrevealed clues, teacher notes/actions, future chapter material, and all student, academic, behaviour, currency, and history data.

## 4. Persistence, API, and UI

Migration `0019_m11_narrative_progress.sql` creates three tables. `narrative_group_state` contains `owner_teacher_id`, `group_id`, `academic_year_id`, `revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0)`, and created/updated timestamps. Keep primary key `(group_id,academic_year_id)`, add named `UNIQUE` index `uq_narrative_group_state_lineage` on `(group_id,academic_year_id,owner_teacher_id)` matching `uq_groups_lineage`, and foreign-key `(group_id,academic_year_id,owner_teacher_id)` to `groups(id,academic_year_id,owner_teacher_id)`.

`narrative_group_events` keeps UUID id, all three lineage columns, `event_key`, ordinal 1–9, term `T1|T2|T3`, `started_at`, `completed_at`, `revealed_clue_count >= 0`, nullable paired `mechanic_kind CHALLENGE|MINIGAME`/`mechanic_id`, `revision` as the aggregate revision that last changed the row, and `updated_at`. It stores no narrative-state column. Its complete `(group_id,academic_year_id,owner_teacher_id)` foreign key references `narrative_group_state`; a group/year-only reference is forbidden. Enforce unique event key and ordinal per owner/group/year. Catalogue identity must match stored key/ordinal/term or fail closed.

`narrative_command_requests` stores UUID id, complete lineage, `command START|REVEAL_NEXT_CLUE|LINK|COMPLETE`, `idempotency_key`, SHA-256 `request_fingerprint`, `event_key`, `resulting_revision`, exact successful `response_status`, canonical `response_body_json`, and `created_at`. A named unique key on `(owner_teacher_id,group_id,academic_year_id,command,idempotency_key)` defines durable replay scope, and the complete lineage foreign key references `narrative_group_state`. Receipts share narrative progress privacy and retention: retain for the aggregate lifetime, including archive, and delete only with the aggregate under lawful year/group deletion. No TTL, process-local authority, background cleanup, or independent receipt deletion may turn a delayed retry into a second mutation.

`GET /api/v1/groups/:groupId/narrative?academicYearId=` returns `NarrativeStateDto`: aggregate revision, current term, completed count, and nine ordered events with exactly one of the three derived states; clues are `{ordinal,text,revealed}`. Commands remain `POST .../events/:eventKey/start`, `/reveal-next-clue`, `/link`, and `/complete`, each with `expectedRevision`; link adds `{kind,id}`. Every command requires one `Idempotency-Key` header containing a canonical hyphenated UUID v4 (case-insensitive hexadecimal accepted, maximum 36 characters); missing, repeated/multi-value, malformed, or non-v4 keys are `422 VALIDATION_FAILED` before a write transaction.

Every read first resolves the authenticated teacher's `groups` lineage and then loads head/events with all three predicates; every insert, update, delete, join, uniqueness scope, receipt lookup, and CAS uses the same complete lineage. Missing or foreign-owned tuples are `404`, never fallback group/year lookups. Responses are `no-store`. Add `/narrative` and **Narrativa** navigation with the teacher-private timeline, current available scene, clue/link/completion controls, and loading/retry/read-only/conflict states. Teacher controls may show revealed clues while an event is `AVAILABLE`, but the projected student-facing UI must render no clue text in that state. It may render approved revealed clue text only after the event is `COMPLETED`, alongside the completed marker/progress. The Spanish client creates one key per intended command, retains it across timeout/network/unknown-outcome retry, and clears it only after an authoritative response, final client error, cancellation, or owner/group/year/event/command/payload change. Existing game pages remain intact.

After authentication, strict shape validation, and owned-lineage resolution, fingerprint canonical JSON with recursively sorted object keys: `{command, routeTarget:{groupId,academicYearId,eventKey}, payload}`. `payload` is the exact validated semantic body, including `expectedRevision` and normalized `{kind,id}` for link; reject unknown fields. In a receipt scope, the same fingerprint returns stored status and exact body—including original resulting revision—without rechecking current revision, archive/calendar/mechanic state, or mutating. Changed reuse returns shared `409 CONFLICT` without revealing prior request/outcome. Failed or uncommitted attempts store no receipt and may retry the same key.

An absent head and zero progress rows is canonical initial state: reads return revision `0`, Event 1 `AVAILABLE`, and no write. First valid mutation inserts the head at revision `0` inside its transaction; `INSERT OR IGNORE` handles concurrent initialization. Progress without a head is forbidden. Each successful command changes the head exactly once from `R` to `R+1`:

| Command | Preconditions and event-row write after aggregate CAS |
|---|---|
| start | Target is derived `AVAILABLE` and has no row; insert it with `started_at`, clue count 0, and row revision `R+1`. Its derived state remains `AVAILABLE`. |
| reveal next clue | Target is derived `AVAILABLE`, has a started row, and count `C` is below catalogue clue count; update to `C+1` where full lineage, key, `completed_at IS NULL`, `revision=R`, and clue count is `C`. |
| link | Target is derived `AVAILABLE` with a started row; catalogue relationship is not `NONE`; referenced mechanic exists, is teacher-owned, same-group, and of the exact approved kind. Set/replace the pair where full lineage, key, `completed_at IS NULL`, and `revision=R`. Narrative never mutates the mechanic. |
| complete | Target is derived `AVAILABLE` with a started row. `REQUIRED` requires the approved link and its terminal source state; `OPTIONAL` requires terminal source state only when linked; `NONE` forbids a link. Set `completed_at` and row revision `R+1` where full lineage, key, `completed_at IS NULL`, and `revision=R`. |

Projection adds scene `NARRATIVE` with a lifecycle-specific serialized allowlist. For an `AVAILABLE` event, its narrative payload is exactly `{title,term,ordinal,completedCount,totalCount:9}`: these counts are collective progress, and no event key, lifecycle field, clue field, or clue text is serialized. For a `COMPLETED` event, the payload may additionally contain `completed:true` and `revealedClues:string[]`; that array contains only approved clues actually revealed before completion. Projection excludes every unrevealed clue, final scene detail not represented by approved revealed text, mechanic IDs, administration, student identity, academic data, currency, behaviour, history, and all private source-domain records.

## 5. Failure boundaries, migration, rollout, and acceptance

Authentication and shape validation precede mutation. Within `BEGIN IMMEDIATE`: resolve owned lineage (`404` otherwise); load receipt by complete scope; return exact replay or reject changed reuse before head initialization, revision comparison, archive/rule checks, or adapter reads. For an unseen key, initialize/load the head, compare `expectedRevision`, then check archive, derived state, term, prerequisites, start, clue, catalogue relationship, and mechanic rules. Revision mismatch is always `409 CONFLICT` before command-specific checks, with no write, using existing `ApiError('CONFLICT', 409, 'Narrative state changed. Refresh and retry.')`. Clients refresh authoritative state from request context and never branch on message text.

Claim with `UPDATE narrative_group_state SET revision=R+1,updated_at=? WHERE owner_teacher_id=? AND group_id=? AND academic_year_id=? AND revision=R`; affected rows must equal one. Then perform the owner-scoped conditional event write, compose success, and insert the receipt before commit. Head initialization, CAS, event mutation, and receipt are atomic; any failure rolls all back. `BEGIN IMMEDIATE` serializes identical-key races so the waiter replays the committed receipt. Archived years reject new keys as read-only while exact receipt replay remains available. Other rule conflicts are `409 CONFLICT`; malformed input is `422 VALIDATION_FAILED`; unexpected failures use the existing sanitized `500 INTERNAL_ERROR` boundary.

Migration starts empty: infer or backfill nothing from generic rows; Event 1 is derived `AVAILABLE`. Inside `0019`, require migration-0011 `uq_groups_lineage`, create `narrative_group_state` and `uq_narrative_group_state_lineage`, then `narrative_group_events`, then `narrative_command_requests`, each with full-lineage foreign keys/indexes; register `0019` only after `0018`. Run migration tests with `PRAGMA foreign_keys=ON`. Roll out migration, schema/repository, API, and shared contracts before web; old displays tolerate absent `narrative`; rollback disables UI/routes and retains progress/receipts. No deployment. Threat matrix: N/A—no shell, subprocess, VCS automation, executable classification, or process-integration boundary.

Tests and acceptance must prove:

- Catalogue equality for every approved key, title, term, ordinal, final scene summary, clue string/order, mechanic relationship, completion rule, Projection allowlist, and teacher-private exclusion; nine unique sequential events; three per term; valid prerequisites and clue bounds; and no narrative state outside the three-state model. Parameterized checks over all nine events prove that an `AVAILABLE` Projection narrative payload is exactly title, term, ordinal, and collective-progress counts and serializes no event key, lifecycle field, clue field, or clue text, even after one or more teacher reveals.
- Migration named lineage keys, complete FKs, receipt-scope uniqueness, rejection of cross-owner tuples, empty initialization, and absence of generic-row inference.
- Owner/group/year scoping for every head/event/receipt operation; revision 0 without rows; first-command head creation; archive/term/catch-up/future gates; mechanic relationship enforcement; terminal source reads; rollback; and zero cross-domain writes.
- Parameterized stale calls for start, reveal, link, and complete return exact `409 CONFLICT`, store no receipt, and change neither revision nor event. Distinct-key same-revision races yield one success and one conflict.
- For each command, committed-response-loss retry with the same UUID-v4 key, route, and body returns the original status/body/revision after later mutations, advances once, writes one receipt, and changes the event once. Same-key races converge on one stored success; changed reuse conflicts without extra writes; scope isolation prevents aliasing; injected pre-receipt failure rolls back everything and permits retry.
- Privacy allowlists for DTO, Projection, logs, and errors expose no idempotency key, fingerprint, stored response, prior request, clue text while `AVAILABLE`, unrevealed clue after `COMPLETED`, mechanic ID, real name, grades/rubrics, XP/RT, behaviour, gems/currency, history, or administration. Parameterized checks over all nine completed events prove that Projection may include only approved clues actually revealed before completion, together with the completed marker/progress, and omits unapproved or unrevealed text.
- Spanish web states, key retention after unknown outcomes, conflict refresh, keyboard/focus, projector readability, progression, links, reload, response-loss replay, and Projection privacy. UI acceptance proves every `AVAILABLE` projected event remains clue-free after teacher reveals and that approved revealed clues appear only after `COMPLETED`; teacher-private controls remain usable without changing Projection output. Existing game/history authority remains unchanged; no `NARRATIVE_REVISION_STALE` contract literal is introduced.

## 6. Risks, Terra readiness, and Simplicity Check

Controls: the aggregate head removes per-event revision ambiguity; full owner/group/year keys prevent lineage aliasing; term/prerequisite derivation prevents early unlocks; the approved per-event catalogue prevents mechanic/content drift; allowlists prevent leakage; immediate transactions/CAS prevent lost updates; durable same-transaction receipts recover committed outcomes after response loss; existing closed `CONFLICT` preserves the shared API boundary.

**Level C / Terra:** targeted Terra re-review remains **REQUIRED before Build** and is justified by lineage DDL/FKs, durable idempotency replay, transaction ordering, owner-scoped access, aggregate CAS, cross-owner mechanic validation, exact approved content mapping, the corrected three-state model, and Projection privacy across persistence/API/UI trust boundaries. The design has no unresolved content-approval condition. This task does not invoke Terra.

**Simplicity Check:** one explicit catalogue, one aggregate-head table, one progress table without persisted narrative state, one narrow command-receipt table, one small service, four commands, and existing adapters. The head is the minimum deterministic CAS authority; the receipt is the minimum durable response-loss boundary. Catalogue-derived progression avoids a workflow or branching engine. Aggregate-lifetime receipt retention avoids cleanup machinery. No duplicated game mechanic, generic event bus, generic audit system, background job, websocket, new runtime dependency, or deployment change.

**DESIGN READY — STOP. Do not create TASKS.md or VERIFY.md; do not enter Build, Verify, Ship, deployment, or Git/VCS.**
