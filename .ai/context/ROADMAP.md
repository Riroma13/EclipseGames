# ROADMAP.md — Protocole Éclipse

This roadmap is ordered by dependency and product value.
SPEC numbering is provisional until each SPEC is created.

## Milestone M0 — Platform foundation

### SPEC-0001 — Platform foundation and architecture
**Priority:** P0
**Status:** Complete / archived 2026-08-21 (`PASS WITH CONDITIONS`; C-01 remains a production gate)

Choose:
- stack;
- repository structure;
- database/persistence;
- teacher authentication;
- deployment;
- testing;
- privacy architecture;
- baseline UI approach.

**Depends on:** none.

**Next:** SPEC-0002 — Academic years, groups and students.

---

## Milestone M1 — Classroom core

### SPEC-0002 — Academic years, groups and students
**Priority:** P0
**Status:** Complete / archived 2026-08-22 (`PASS WITH CONDITIONS`; C-01 remains a production gate)

Includes:
- school year;
- groups;
- student CRUD/archive;
- alias;
- avatar;
- specialty assignment.

**Depends on:** SPEC-0001.

**Next:** SPEC-0003 — Teacher classroom workspace.

### SPEC-0003 — Teacher classroom workspace
**Priority:** P0
**Status:** Complete / archived 2026-08-22 (`PASS WITH WARNINGS`; C-01 remains a non-blocking production-only condition)

Includes:
- group selector;
- student cards;
- instant search;
- student side panel;
- fast action shell;
- undo foundation.

**Depends on:** SPEC-0002.

**Next:** Health Report for SPEC-0003.

---

## Milestone M2 — Observation and gamification

### SPEC-0004 — XP, specialties, annual levels and badges
**Priority:** P0

Includes:
- XP events;
- specialty bonus;
- annual level calculation;
- level-up event;
- badge progress and unlock.

**Depends on:** SPEC-0002, SPEC-0003.

### SPEC-0005 — Coins and assessment advantages
**Priority:** P0

Includes:
- coin ledger;
- automatic and manual sources;
- reward catalogue;
- spending validation;
- balance rules.

**Depends on:** SPEC-0004.

---

## Milestone M3 — Task tracking

### SPEC-0006 — RT, Energy and task streaks
**Priority:** P0

Includes:
- task entry 10/5/0/Not Evaluated;
- bulk classroom entry;
- RT average;
- Energy;
- streaks;
- automatic coin reward after four completes.

**Depends on:** SPEC-0002, SPEC-0003, SPEC-0005.

---

## Milestone M4 — Behaviour

### SPEC-0007 — Behaviour state and Red Code incidents
**Priority:** P0

Includes:
- Normal/Vigilance/Alert/Red Code;
- session reset;
- game restrictions;
- Red Code incident counter;
- proposal after four incidents;
- disciplinary history.

**Depends on:** SPEC-0003, SPEC-0005.

---

## Milestone M5 — Quarterly assessment

### SPEC-0008 — Observation rubric and term close
**Priority:** P0

Includes:
- term XP aggregation by category;
- provisional rubric suggestion;
- teacher adjustment;
- Observation grade calculation;
- close/reopen;
- snapshot semantics.

**Depends on:** SPEC-0004, SPEC-0006.

---

## Milestone M6 — Projection and privacy

### SPEC-0009 — Classroom mode and Show Student
**Priority:** P0

Includes:
- classroom-safe student cards;
- Energy visual state;
- no academic/disciplinary leakage;
- temporary Show Student view;
- projection UX.

**Depends on:** SPEC-0003, SPEC-0004, SPEC-0005, SPEC-0006, SPEC-0007.

---

## Milestone M7 — History and export

### SPEC-0010 — Student history and audit trail
**Priority:** P1

Includes:
- unified chronological history;
- filters;
- correction traceability;
- evaluation events.

**Depends on:** previous event-producing domains.

### SPEC-0011 — Term export
**Priority:** P0

Includes:
- XLSX export;
- group and term selection;
- Observation grade;
- RT grade.

**Depends on:** SPEC-0008.

### SPEC-0012 — Full rubric export
**Priority:** P1

Includes:
- detailed XLSX;
- optional PDF if justified.

**Depends on:** SPEC-0008, SPEC-0011.

---

## Milestone M8 — Narrative

### SPEC-0013 — Protocole Éclipse narrative module
**Priority:** P1

Includes:
- nine canonical events;
- class-level progress;
- blocked/available/completed state;
- collective challenge resolution;
- clues.

**Depends on:** SPEC-0009 for projection integration.

---

## Milestone M9 — Product hardening

### SPEC-0014 — Privacy and security hardening
**Priority:** P0 before production

Includes:
- authorization review;
- projection data-contract tests;
- sensitive-data logging review;
- backup/restore verification.

### SPEC-0015 — UX, accessibility and classroom performance
**Priority:** P1

Includes:
- keyboard/tablet usability;
- projector readability;
- action latency;
- accessibility;
- responsive behaviour.

### SPEC-0016 — Production readiness
**Priority:** P0 before real use

Includes:
- deployment;
- backups;
- restore drill;
- monitoring appropriate to the chosen stack;
- release checklist;
- final regression suite.

---

## Deferred until evidence exists

Do not schedule without a real requirement:
- student accounts;
- parent accounts;
- school administration portal;
- multi-school tenancy;
- mobile native app;
- public leaderboards;
- complex branching narrative;
- AI-generated grades;
- exam management;
- Additio integration dependency.
