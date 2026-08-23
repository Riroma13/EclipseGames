# PROJECT.md — Protocole Éclipse

## 1. Product purpose

Protocole Éclipse is a teacher-facing classroom gamification, observation and task-tracking application designed initially for French classes in secondary education.

The product must support groups of roughly 30 students while remaining fast enough to use live during lessons.

Its purpose is to combine:

- classroom observation evidence;
- task / homework tracking;
- light gamification;
- behaviour-state management;
- quarterly rubric support;
- safe classroom projection;
- lightweight collective narrative.

It is a teaching tool first and a game layer second.

## 2. Primary users

### Teacher
Authenticated private user with full access to:

- real student names;
- groups;
- XP records;
- RT/task records;
- Energy;
- coins;
- behaviour state;
- incidents;
- rubrics;
- history;
- exports;
- narrative controls.

### Students
No individual accounts in the MVP.

Students interact indirectly through:

- classroom projection;
- collective narrative events;
- teacher-triggered temporary "Show student" view.

## 3. Product domains

The system has four conceptual domains that must remain separate.

### 3.1 Academic observation
- XP events are evidence.
- Categories: Communication, Precision, Consistency, Collaboration.
- Quarterly rubric is the official observation assessment.
- XP must never be treated as a direct grade.

### 3.2 Task tracking
- RT task values: `10`, `5`, `0`, `NOT_EVALUATED`.
- RT grade is the arithmetic mean of evaluated entries only.
- `NOT_EVALUATED` is excluded from numerator and denominator.
- Energy is a gamified representation associated with task/work engagement, not a grade.

### 3.3 Gamification
- annual XP levels;
- specialties;
- specialty bonus;
- badges;
- coins;
- task streaks;
- reward spending;
- narrative progression.

### 3.4 Behaviour
- Normal;
- Vigilance;
- Alert;
- Red Code;
- Red Code incidents;
- proposed minor disciplinary report after four incidents.

Behaviour may restrict game mechanics only according to documented rules.
It must never lower academic assessment.

## 4. Core functional rules

### XP categories

Communication:
- +1 participation in Spanish;
- +2 French with help or a short phrase;
- +3 spontaneous or developed French.

Precision:
- +1 corrects or improves;
- +2 correct and careful work;
- +3 especially precise work.

Consistency:
- +1 tries despite difficulty;
- +2 maintains effort;
- +3 clearly overcomes difficulty or improves.

Collaboration:
- +1 appropriate occasional help;
- +2 active collaboration;
- +3 especially valuable collaboration.

### Specialties

Communication:
- Leader
- Diplomat

Precision:
- Strategist
- Analyst

Consistency:
- Disciplined
- Perseverant

Collaboration:
- Helper
- Ally

Matching specialty category adds `+1 XP`.

This is a flat bonus, never a multiplier.

The bonus is disabled in Alert and Red Code states.

### XP levels

| Level | Minimum annual XP |
|---|---:|
| 1 | 0 |
| 2 | 10 |
| 3 | 25 |
| 4 | 45 |
| 5 | 70 |
| 6 | 100 |
| 7 | 135 |
| 8 | 175 |

Level-up grants +1 coin once.

XP persists across the school year.

### Badge unlock

Specialty badge unlocks after 3 XP evidence events in the student's specialty category.

Badges:
- Communication → Voz activa
- Precision → Ojo clínico
- Consistency → Paso firme
- Collaboration → Buen aliado

Badges persist for the school year and have no grading effect.

### RT

Allowed values:
- `10` complete;
- `5` partial;
- `0` not completed;
- `NOT_EVALUATED`.

RT average:
`sum(evaluated values) / count(evaluated values)`.

### Energy

Initial value: 30.
Range: 0–50.

Current agreed adjustments:
- complete task → +10;
- partial task → +5;
- especially good classwork → +5;
- clearly incomplete work / poor use of work time → -5;
- work not completed → -10.

Energy must be clamped to 0–50.

The classroom view shows an Energy state / bar, not a numeric academic grade.

### Task streak

- `10` increments streak.
- `5` resets streak.
- `0` resets streak.
- `NOT_EVALUATED` neither increments nor breaks streak.
- 4 consecutive complete tasks grant +1 coin and reset streak to 0.

### Coins

Valid +1 sources:
- level-up;
- four-complete-task streak;
- clear personal improvement;
- exceptional use of French;
- exceptional collaboration;
- special challenge/event.

Balance can never be negative.

Reward costs:
- standard advantage: 2 coins;
- exceptional advantage: 3 coins.

Maximum one advantage per assessment.

The app records the spending event but does not store the resulting assessment grade.

### Behaviour state

States:
- NORMAL
- VIGILANCE
- ALERT
- RED_CODE

Restrictions:

NORMAL:
- normal game access.

VIGILANCE:
- cannot receive coins during the session.

ALERT:
- cannot receive coins;
- no specialty XP bonus.

RED_CODE:
- cannot receive coins;
- cannot spend coins;
- no specialty XP bonus;
- cannot participate in special game advantages/events for that session;
- records one Red Code incident per session.

Base XP remains available in all behaviour states.

Behaviour resets to NORMAL on a new teaching session unless a future approved Design defines a specific documented exception.

After 4 Red Code incidents:
- show a proposal to consider a minor disciplinary report;
- never create it automatically;
- teacher decides;
- if registered, incident counter resets to 0.

No behaviour event changes XP, RT, Energy grade semantics or rubric scores.

## 5. Quarterly observation rubric

Dimensions:
- Communication
- Precision
- Consistency
- Collaboration

Levels:
1. Insufficient
2. Developing
3. Adequate
4. Excellent

Automatic provisional suggestion per category using XP earned during that term:
- 0–2 XP → level 1;
- 3–5 XP → level 2;
- 6–9 XP → level 3;
- 10+ XP → level 4.

The teacher can adjust suggested levels before closing.

Official observation grade:
`(sum of four final rubric levels / 16) * 10`.

Closing a term must create an immutable evaluation snapshot.
Changes after close require explicit reopen and must remain traceable.

## 6. Classroom projection privacy boundary

### Classroom-safe
- avatar;
- alias;
- specialty;
- unlocked badge;
- XP level;
- progress to next level;
- Energy visual state;
- coin balance;
- class narrative progress.

### Teacher-private
- real name;
- exact RT average;
- rubric;
- observation grade;
- XP category breakdown;
- comments;
- incidents;
- Red Codes;
- disciplinary reports;
- detailed history.

### "Show student" temporary view

May show:
- avatar;
- alias;
- specialty;
- badge;
- level;
- progress;
- Energy visual state;
- coins;
- current behaviour state.

Must not show:
- grades;
- XP category breakdown;
- rubric;
- comments;
- incidents;
- disciplinary reports;
- history.

## 7. Narrative

Narrative is collective, lightweight and optional.

Setting:
a school on an island off the French coast loses contact with the outside world after a blackout.

Central question:
"Does Protocole Éclipse protect the students, or keep them trapped?"

Three events per term:

### Term 1 — La señal
1. El apagón
2. El mensaje
3. Éclipse

### Term 2 — El protocolo
4. El expediente
5. La anomalía
6. La reunión

### Term 3 — La verdad
7. La prueba
8. El archivo Éclipse
9. La llamada

Narrative events do not automatically modify grades, XP, RT or behaviour.

## 8. UX requirements

The primary operational requirement is speed.

Target interaction:
`Find the student → perform the classroom action → continue teaching`.

Guidelines:
- common classroom actions should require approximately 1–2 interactions after context/student selection where practical;
- no mandatory comments for routine events;
- RT must support whole-class bulk entry plus exception editing;
- autosave or equivalent safe persistence is desirable;
- undo / correction must exist for frequent classroom actions;
- laptop/tablet are primary;
- mobile is secondary;
- classroom projection must be legible at distance;
- no public ranking.

## 9. Export

Generic feature name: `Export`.

Minimum term export:
- student name;
- Observation grade;
- RT grade.

Preferred format:
- XLSX.

Extended rubric export may later include:
- XP by category;
- suggested level;
- final level;
- descriptors;
- final grade;
- close date.

The product must not depend on Additio.

## 10. Stack and architecture status

The repository starts from zero.

No implementation stack is approved yet.

The first architecture Design must explicitly choose and justify:
- frontend framework;
- backend strategy;
- database;
- authentication;
- deployment target;
- testing stack;
- repository structure;
- persistence strategy;
- backup strategy.

Do not invent or silently assume a stack before that Design is approved.

## 11. Engineering philosophy

### Product simplicity principle

> EclipseGames should be the simplest product that reliably solves the teacher's classroom workflow. Complexity requires justification; simplicity does not.

- Optimize first for teachers actively teaching a class.
- Product north star: `Find the student → perform the classroom action → continue teaching.`
- Common classroom actions should require approximately 1–2 interactions after context/student selection when practical.
- Prefer obvious workflows over configurable workflows.
- Prefer sensible defaults over settings.
- Prefer explicit small domain modules over generic engines/frameworks.
- Avoid enterprise architecture for hypothetical scale.
- Optimize for normal academy/classroom-sized groups, not internet-scale workloads.
- Do not introduce microservices, event buses, generic workflow engines, generic reward engines, complex role systems, or infrastructure abstractions without a concrete approved requirement.
- Do not implement future SPEC functionality early merely for extensibility.
- Reuse existing concepts and infrastructure before creating new abstractions.
- Keep teacher-facing language classroom-oriented and understandable.
- Minimize administrative data entry.
- Routine classroom actions must not require comments, confirmation dialogs, or long forms unless correctness genuinely requires them.
- Prefer progressive disclosure so detail does not obstruct frequent actions.
- Simplicity must never weaken privacy, authentication, correctness, data integrity, backups, recoverability, or automated testing.
- Prefer derived state over additional mutable state when cheap and clear.
- Prefer synchronous/local/simple mechanisms appropriate to the existing single-service SQLite architecture.
- A new runtime dependency requires concrete present value.
- A new abstraction requires at least one concrete current use case.
- A new persistent concept requires a clear authoritative purpose.
- A new user-facing setting requires a real decision that cannot reasonably be defaulted.
- Every future Design must include a short **Simplicity Check** validating its major concepts against this principle.

- Small, cohesive modules.
- Explicit domain rules.
- Strong tests around calculations and privacy boundaries.
- Minimal dependencies.
- Avoid premature abstraction.
- Prefer configuration only where real future reuse is likely.
- Keep French-specific narrative/content separate from reusable product core when practical.
- Build for one teacher first; generalize only with evidence.
- Privacy-sensitive logic must be enforced server-side or at the authoritative data boundary, not only in UI rendering.

## 12. Repository conventions

Until SPEC-0001 defines implementation conventions:

- SDD artifacts live in `docs/specs/SPEC-XXXX/`.
- Stable context lives in `.ai/context/`.
- Do not add infrastructure folders without an approved Design.
- Do not introduce code-generation or orchestration frameworks by default.
- Prefer conventional commits once Git is initialized.

## 13. Current major unknowns

These are intentionally unresolved until SPEC-0001:
- technical stack;
- repository topology;
- authentication mechanism;
- hosting;
- deployment;
- backup implementation;
- exact schema;
- API style;
- UI component library.

They are architectural decisions, not implementation assumptions.
