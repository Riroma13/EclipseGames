# SPEC-0042 — Canonical Narrative Content Draft

> **Status: DRAFT FOR MAINTAINER APPROVAL.** This document proposes the
> canonical keys, scene summaries, clues, and mechanic relationships for the
> nine-event Protocole Éclipse arc. It is not authoritative until approved and
> must not be copied into `DESIGN.md` without that approval.

## Review rules

- The narrative is collective at group/year scope and never changes grades,
  XP, RT, Energy, behaviour, gems, or currency.
- The teacher is the Game Master. All completion actions are explicit teacher
  commands.
- Existing challenge and minigame records are linked only through their
  existing APIs and terminal states; this draft introduces no new mechanic.
- Unrevealed clues remain teacher-private. Revealed clues are safe collective
  text and may be shown in Projection.
- `AVAILABLE` Projection shows the event title, term, ordinal, and collective
  progress only. `COMPLETED` Projection may additionally show revealed clues.
- The event-specific mechanic choices below are proposals for approval.

## T1 — La señal

### Event 1 — El apagón

- **Key:** `t1_el_apagon`
- **Title:** `El apagón`
- **Scene summary:** Durante una tarde aparentemente normal, las pantallas del
  aula se apagan al mismo tiempo que la escuela pierde el contacto fiable con
  el exterior de la isla. Cuando vuelven, solo queda una señal breve: una
  fecha, una coordenada y el símbolo de Éclipse.
- **Clues:**
  1. `La señal no llegó desde fuera: alguien la preparó dentro de la escuela.`
  2. `La coordenada apunta a un lugar que todos conocen, pero que casi nadie mira.`
- **Narrative purpose:** Introduce el misterio, el símbolo y la pregunta central
  sin revelar todavía quién dejó la señal.
- **Challenge/minigame relation:** **REQUIRED — challenge.** Link an existing
  group challenge used to reconstruct the signal; the narrative only observes
  its terminal `COMPLETED` state.
- **Completion condition:** The event is `AVAILABLE` when progression and term
  eligibility allow it. The teacher may reveal its approved clues, links the
  approved existing challenge, waits until that challenge is `COMPLETED`, then
  explicitly transitions the narrative event from `AVAILABLE` to `COMPLETED`.
- **Projection-visible while AVAILABLE:** `El apagón`, T1, ordinal 1, and
  collective progress such as `0/9`; no clue text until revealed.
- **Projection-visible after COMPLETED:** The completed event marker and the
  approved revealed clue text; no challenge ID or private administration.
- **Teacher-private:** Unrevealed clues, mechanic ID, challenge administration,
  teacher actions, and all student-linked data.

### Event 2 — El mensaje

- **Key:** `t1_el_mensaje`
- **Title:** `El mensaje`
- **Scene summary:** La señal contiene una frase incompleta. Al ordenar sus
  fragmentos, aparece una advertencia: el apagón y el silencio del exterior no
  fueron un accidente, y el siguiente indicio está escondido a plena vista.
- **Clues:**
  1. `Las palabras faltantes forman una instrucción, no una contraseña.`
  2. `El mensaje cambia de sentido cuando se lee de derecha a izquierda.`
  3. `La primera pista estaba destinada a quien supiera hacer preguntas.`
- **Narrative purpose:** Convierte la señal inexplicada en un mensaje
  intencionado y establece el método para leer el misterio.
- **Challenge/minigame relation:** **OPTIONAL — minigame.** The teacher may
  link an existing minigame session used to assemble or decode the message;
  the narrative reads only its terminal `ENDED` state.
- **Completion condition:** When Event 1 is complete and the term is eligible,
  this event is `AVAILABLE`. The teacher may reveal its approved clues and
  explicitly transitions it from `AVAILABLE` to `COMPLETED`. If a minigame is
  linked, it must be `ENDED` first; without a link, the teacher may complete it
  while `AVAILABLE`.
- **Projection-visible while AVAILABLE:** `El mensaje`, T1, ordinal 2, and
  collective progress; unrevealed clues remain hidden.
- **Projection-visible after COMPLETED:** Completed marker and revealed clues,
  using only the approved collective wording.
- **Teacher-private:** Unrevealed clues, linked minigame ID/session details,
  teacher controls, and private source records.

### Event 3 — Éclipse

- **Key:** `t1_eclipse`
- **Title:** `Éclipse`
- **Scene summary:** Los dos primeros indicios forman el emblema de Éclipse.
  No es el nombre de una persona ni de un lugar: es el nombre de un protocolo
  que decide qué información puede verse, oírse y abrirse, y en qué momento.
- **Clues:**
  1. `Éclipse no oculta la verdad: decide cuándo puede ser encontrada.`
  2. `El archivo se abrirá cuando la escuela vuelva a escuchar lo que dejó de oír.`
- **Narrative purpose:** Nombra el protocolo y cierra T1 sin decidir si sus
  límites protegen a la escuela o mantienen aislada a la comunidad.
- **Challenge/minigame relation:** **NONE.** This is a teacher-led narrative
  reveal using the existing event progression only.
- **Completion condition:** When Events 1 and 2 are complete and the term is
  eligible, this event is `AVAILABLE`. The teacher may reveal its approved
  clues and explicitly transitions it from `AVAILABLE` to `COMPLETED`.
- **Projection-visible while AVAILABLE:** `Éclipse`, T1, ordinal 3, and
  collective progress; no unrevealed clue text.
- **Projection-visible after COMPLETED:** Completed marker and revealed clues;
  no archive contents or private records.
- **Teacher-private:** Unrevealed clues, teacher notes/actions, and any future
  archive detail not explicitly approved for collective display.

## T2 — El protocolo

### Event 4 — El expediente

- **Key:** `t2_el_expediente`
- **Title:** `El expediente`
- **Scene summary:** Al comenzar el segundo tramo del curso, aparece un
  expediente sin nombre. Sus páginas describen decisiones tomadas durante el
  apagón y el aislamiento, pero cada conclusión está cubierta por una franja
  de tinta azul.
- **Clues:**
  1. `El expediente no registra culpables; registra decisiones.`
  2. `La tinta azul aparece junto a dos verbos: conservar y limitar.`
  3. `Una página pide mantener abierta la señal; otra ordena cerrar el acceso.`
- **Narrative purpose:** Introduce pruebas de que Éclipse podría preservar a la
  comunidad o restringirla, sin exponer registros reales de estudiantes.
- **Challenge/minigame relation:** **OPTIONAL — challenge.** The teacher may
  link an existing group challenge that organizes the expediente's collective
  evidence; only its terminal `COMPLETED` state matters.
- **Completion condition:** When Events 1–3 are complete and T2 is eligible,
  this event is `AVAILABLE`. The teacher may reveal its approved clues and
  explicitly transitions it from `AVAILABLE` to `COMPLETED`. If a challenge is
  linked, it must be `COMPLETED` first; without a link, the teacher may complete
  it while `AVAILABLE`.
- **Projection-visible while AVAILABLE:** `El expediente`, T2, ordinal 4, and
  collective progress; only revealed clues may be shown.
- **Projection-visible after COMPLETED:** Completed marker and approved
  revealed clues, never the expediente's private contents.
- **Teacher-private:** Unrevealed clues, linked challenge ID, teacher notes,
  and all student or source-record data.

### Event 5 — La anomalía

- **Key:** `t2_la_anomalia`
- **Title:** `La anomalía`
- **Scene summary:** Una línea del expediente no encaja con las demás. La
  anomalía se repite en tres lugares distintos, como si alguien hubiera dejado
  una puerta abierta dentro del protocolo.
- **Clues:**
  1. `La anomalía no es un error: es una invitación a comprobar el camino.`
  2. `Tres marcas iguales señalan una sola decisión pendiente.`
  3. `La puerta abierta conduce al archivo, pero todavía no permite cruzarlo.`
- **Narrative purpose:** Aumenta la tensión y dirige al grupo hacia el archivo,
  manteniendo la duda sobre si la puerta abierta es una salida o una brecha en
  una protección.
- **Challenge/minigame relation:** **REQUIRED — minigame.** Link an existing
  minigame session for the collective pattern check; the narrative requires
  only its terminal `ENDED` state.
- **Completion condition:** When Event 4 is complete and the term is eligible,
  this event is `AVAILABLE`. The teacher may reveal its approved clues, links
  the approved minigame, waits for `ENDED`, and explicitly transitions the
  event from `AVAILABLE` to `COMPLETED`.
- **Projection-visible while AVAILABLE:** `La anomalía`, T2, ordinal 5, and
  collective progress; unrevealed clues stay private.
- **Projection-visible after COMPLETED:** Completed marker and revealed clues;
  no minigame ID, answer history, or student data.
- **Teacher-private:** Unrevealed clues, minigame/session details, teacher
  controls, and private source records.

### Event 6 — La reunión

- **Key:** `t2_la_reunion`
- **Title:** `La reunión`
- **Scene summary:** El expediente contiene un acta sin firmas y un fragmento de
  audio de una reunión que nunca aparece en ningún calendario. Varias voces
  discuten si el archivo debe conservarse cerrado o abrirse cuando regrese la
  señal.
- **Clues:**
  1. `El acta quedó sin firmas, pero el audio conserva dos voces en desacuerdo.`
  2. `Una voz pide mantener el protocolo hasta que pase el riesgo; otra advierte que el silencio también encierra.`
- **Narrative purpose:** Ofrece al grupo un registro tangible del desacuerdo y
  cierra T2 sin decidir si Éclipse protege o confina.
- **Challenge/minigame relation:** **NONE.** This is a teacher-led narrative
  transition and uses no linked mechanic.
- **Completion condition:** When Events 4 and 5 are complete and the term is
  eligible, this event is `AVAILABLE`. The teacher may reveal its approved
  clues and explicitly transitions it from `AVAILABLE` to `COMPLETED`.
- **Projection-visible while AVAILABLE:** `La reunión`, T2, ordinal 6, and
  collective progress; no unrevealed clues.
- **Projection-visible after COMPLETED:** Completed marker and revealed clues;
  only safe collective text is shown.
- **Teacher-private:** Unrevealed clues, teacher notes/actions, and any
  non-approved interpretation of the meeting.

## T3 — La verdad

### Event 7 — La prueba

- **Key:** `t3_la_prueba`
- **Title:** `La prueba`
- **Scene summary:** El archivo ofrece una prueba sencilla: seguir sin cambiar
  la señal, el mensaje y el expediente, y comprobar si sus tres partes forman
  una misma historia. La respuesta dependerá de la atención colectiva, no de
  una respuesta única.
- **Clues:**
  1. `La prueba no pide acertar: pide conservar juntos los indicios.`
  2. `Cuando las tres partes coinciden, aparece una fecha sin año.`
- **Narrative purpose:** Convierte la investigación en un acto colectivo de
  verificación y prepara la apertura del archivo sin convertir la prueba en una
  evaluación académica.
- **Challenge/minigame relation:** **OPTIONAL — challenge.** The teacher may
  link an existing group challenge for the collective verification; only
  `COMPLETED` is relevant to narrative completion.
- **Completion condition:** When Events 1–6 are complete and T3 is eligible,
  this event is `AVAILABLE`. The teacher may reveal its approved clues and
  explicitly transitions it from `AVAILABLE` to `COMPLETED`. If a challenge is
  linked, it must be `COMPLETED` first; without a link, the teacher may complete
  it while `AVAILABLE`.
- **Projection-visible while AVAILABLE:** `La prueba`, T3, ordinal 7, and
  collective progress; unrevealed clues remain hidden.
- **Projection-visible after COMPLETED:** Completed marker, revealed clues,
  and no challenge administration or private data.
- **Teacher-private:** Unrevealed clues, linked challenge ID, teacher actions,
  and all student-linked information.

### Event 8 — El archivo Éclipse

- **Key:** `t3_el_archivo_eclipse`
- **Title:** `El archivo Éclipse`
- **Scene summary:** El archivo finalmente se abre. Registra que Éclipse fue
  activado durante una emergencia para conservar información y mantener la
  continuidad de la comunidad. También muestra que filtró comunicaciones y
  restringió accesos durante el aislamiento: pudo ser una protección necesaria
  o una forma de confinamiento.
- **Clues:**
  1. `El archivo no pertenece a una persona: pertenece a una promesa compartida.`
  2. `La primera activación ocurrió cuando la escuela dejó de recibir señales del exterior.`
  3. `El mismo protocolo que conservó la información decidió qué mensajes podían pasar y cuáles debían esperar.`
- **Narrative purpose:** Revela pruebas creíbles de protección y confinamiento
  al mismo tiempo, haciendo más precisa la pregunta central sin decidir qué
  interpretación es correcta.
- **Challenge/minigame relation:** **REQUIRED — minigame.** Link an existing
  minigame session used for the collective archive opening; only `ENDED` is
  required by the narrative.
- **Completion condition:** When Event 7 is complete and the term is eligible,
  this event is `AVAILABLE`. The teacher may reveal its approved clues, links
  the approved minigame, waits for `ENDED`, and explicitly transitions the
  event from `AVAILABLE` to `COMPLETED`.
- **Projection-visible while AVAILABLE:** `El archivo Éclipse`, T3, ordinal 8,
  and collective progress; archive contents remain private.
- **Projection-visible after COMPLETED:** Completed marker and revealed clues;
  no archive contents, minigame ID, or private administration.
- **Teacher-private:** Unrevealed clues, archive detail, minigame/session data,
  teacher notes, and all student or educational records.

### Event 9 — La llamada

- **Key:** `t3_la_llamada`
- **Title:** `La llamada`
- **Scene summary:** La señal vuelve una última vez como una comunicación
  recuperable desde fuera de la isla. El contacto confirma que el exterior
  existía y que alguien intentó alcanzar la escuela durante el aislamiento,
  pero no explica por sí solo si las restricciones de Éclipse estaban
  justificadas.
- **Clues:**
  1. `La llamada conserva una fecha, una coordenada y una frase enviada desde el exterior.`
  2. `El mensaje confirma que alguien esperaba respuesta, pero llega incompleto antes de explicar por qué el contacto falló.`
- **Narrative purpose:** Reconecta al grupo con el exterior, cierra el misterio
  de M11 con una pregunta informada sobre protección y confinamiento, y deja
  espacio para un futuro capítulo narrativo aprobado.
- **Challenge/minigame relation:** **NONE.** The finale is a teacher-led
  collective conclusion with no linked mechanic.
- **Completion condition:** When Event 8 is complete and T3 is eligible, this
  event is `AVAILABLE`. The teacher may reveal its approved clues and explicitly
  transitions it from `AVAILABLE` to `COMPLETED`.
- **Projection-visible while AVAILABLE:** `La llamada`, T3, ordinal 9, and
  collective progress; unrevealed clues remain private.
- **Projection-visible after COMPLETED:** Completed marker, revealed clues, and
  the collective completion state of the nine-event arc.
- **Teacher-private:** Unrevealed clues, teacher notes/actions, future chapter
  material, and all student, academic, behaviour, currency, and history data.

## Approval checklist

- [ ] Approve the nine stable internal keys.
- [ ] Approve all scene summaries exactly as written.
- [ ] Approve all clue prose exactly as written.
- [ ] Approve each `REQUIRED`, `OPTIONAL`, or `NONE` mechanic relationship.
- [ ] Approve the teacher-driven completion conditions and terminal-state rules.
- [ ] Approve the Projection visibility rules and private-data exclusions.
- [ ] Confirm that no narrative content changes grades, XP, RT, Energy,
  behaviour, gems/currency, or existing source-domain authority.
