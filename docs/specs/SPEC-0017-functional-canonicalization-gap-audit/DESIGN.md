# SPEC-0017 — Functional Canonicalization and Gap Audit

## Design

**Status:** Current Design; ready for Architecture Review.
**Lifecycle Checkpoint:** Design | PASS | Architecture Review | DESIGN.md

This M0 change makes the maintainer-supplied canonical register below the product authority for later SPECs, reconciles conflicting stable context, and records implementation gaps without changing product code, schemas, prior SPECs, or runtime metadata. EclipseGames remains a teacher-operated classroom tool: Spanish teacher UI, no permanent student accounts, gradebook, stored source marks, Additio dependency, or public ranking. C-01 keeps real student data and production use blocked.

### Canonical register

- XP records preserve `baseXp` (1–3), flat matching-specialty `specialtyBonusXp` (0/1), and effective/game XP. Annual levels use effective XP at 0/10/25/45/70/100/135/175, continue accumulating above L8, and grant one Emerald per newly unlocked level. Rubric evidence aggregates active **base XP only**; behaviour never removes it.
- RT is `10 | 5 | 0 | ABSENT`; Spanish UI uses `Ausente`. `ABSENT` is excluded from average, Energy, and streak. It is not future `NOT_EVALUATED`. Energy is derived from current-term RT average: Critical 0–2.9, Low 3–4.9, Stable 5–6.4, High 6.5–8.4, Maximum 8.5–10. Streak increments on 10, resets on 5/0, ignores absence, and four 10s grant one Emerald then reset.
- Emerald, Ruby, and Diamond replace coins/Eclipse Points. No automatic conversion or new coin write is allowed. Advantages cost their defined 2 Emeralds, 1 Ruby, or 1 Diamond; one per assessment, no stacking or grade mutation. Teacher-triggered result rewards are `<7 none`, `7–7.99 +1 Emerald`, `8–8.99 +2 Emeralds`, `9–9.99 +1 Ruby`, `10 +1 Diamond`; source marks are never stored.
- Lives 4/3/2/1/0 map to Normal/Vigilancia/Alerta/Código Rojo. Vigilancia blocks gem receipt; Alerta also blocks specialty bonus; Código Rojo also blocks spending and special session activities. At zero, propose—but never confirm—a minor report. Academic facts remain unchanged.
- A real class session exists only between teacher actions `Comenzar clase` and `Finalizar clase`, within configured timetable, teaching days, and holidays. An unopened date consumes no pending restriction. T1/T2/T3 dates belong to an academic year; XP is annual while RT, Energy, rubric, and close snapshots are term-scoped.
- Rubric dimensions match XP categories; term base XP maps 0–2/3–5/6–9/10+ to levels 1–4. Teacher adjustment is allowed; grade is `(sum / 16) * 10`. Close snapshots are immutable; reopen is explicit and traceable. Warn below four evidence events and for genuine future not-evaluated evidence, never merely for `ABSENT`.
- `Exportar` creates XLSX columns Student, Classroom Observation /10, RT average /10.
- Projection allowlists avatar/alias, specialty/badge, level/progress, qualitative Energy, gem balances, and narrative progress. Real name, exact RT, rubric/grade, base/category XP, history, comments, and disciplinary data stay private. `Mostrar al alumno` may add current behaviour temporarily and must auto-return after a configured timeout.
- Every student has an Agent Éclipse avatar without an account. Temporary teacher-controlled code/URL/QR access expires. Persistent identity is face, skin tone, base hair/features, and alias; evolution uses clothing/accessories/badges/frames/backgrounds. Boutique follows Avatar Core.
- Narrative remains optional, collective, lightweight, and nine-event compatible. Events, challenges, and minigames never mutate academic or behaviour facts automatically.

## Technical Approach

M0 adopts a source-to-rule audit. Each rule is compared across stable authority, SQLite schema/migrations, domain logic, Fastify/API DTOs, React UI, tests, and operations, then classified `KEEP`, `ADAPT`, `LEGACY`, `STOP-USING`, or `MISSING`. `KEEP` preserves proven ownership; `ADAPT` requires a later SPEC; `LEGACY` remains readable audit evidence; `STOP-USING` forbids new dependencies/writes; `MISSING` requires new design. The audit implements no runtime behavior and modifies only authority documents, leaving all application behavior demonstrably unchanged.

## Architecture Decisions

| Decision | Choice and rationale |
|---|---|
| Platform | KEEP React/Vite, Fastify REST, SQLite/Drizzle, cookie sessions, pure TypeScript domains, server DTO allowlists, Vitest/Playwright, and one Docker service (DEC-011). No audit evidence justifies a stack change. |
| Authority | Update current stable context with explicit `CURRENT`/`SUPERSEDED` markers; never rewrite archived SPECs. Historical implementation remains evidence, not product truth. |
| Domain ownership | Later SPECs add narrow calendar/session, RT, gems, behaviour, rubric, avatar, projection, and history modules. No generic rules/reward/event engine or cross-domain table reads. |
| Legacy money | Preserve coin tables and records unchanged as audit evidence. M3 must introduce gem-owned contracts, disable all new coin grants/reconciliation before gem writes activate, and prohibit dual-write or inferred conversion. Assessment-context identity may be reused, but coin balances cannot seed gems. |
| Absence | Replace the representative `NOT_EVALUATED` RT type before real RT persistence. There are no task rows to reinterpret; `ABSENT` starts with explicit semantics, while any future not-evaluated value requires a distinct discriminator. |
| Projection | Keep server-side construction. Retire the fixture-backed projection model when M8 composes canonical domain read models; never merge private DTOs then filter in React. |

## Data Flow and Contracts

```text
teacher action -> authenticated Fastify route -> owning domain service
               -> transaction / derived read -> explicit teacher or projection DTO
projection DTO -> allowlisted classroom display (never private DTO filtering)
```

### Evidence-backed gap matrix

| Area | Class | Repository evidence | Compatibility implication |
|---|---|---|---|
| Roster/year/auth | KEEP/ADAPT | `db/schema.ts:16-55`, `roster/{service,mapper,routes}.ts` | Stable student/year ownership remains; M1 adds terms, timetable, holidays, and explicit class sessions without changing identity. |
| XP evidence | KEEP/ADAPT | `xp_evidence_events` stores base/bonus/effective; `xp/service.ts:15-29`; `domain/xp/*` | Event model and thresholds remain. M5 must aggregate active base XP; M3 redirects level entitlement to Emerald without coin dual-write. |
| RT/Energy/streak | STOP-USING/MISSING | `domain/foundation.ts` exposes only representative `NOT_EVALUATED`; fixture DTO stores precomposed Energy | M2 owns persisted task entries, `ABSENT`, term average, derived Energy, streak, bulk entry, correction, and tests. Fixture values are not authority. |
| Coins/advantages | LEGACY/STOP-USING/ADAPT | `coin_ledger`, rewards, redemptions, allocations; `/coins` routes and coin contracts | Retain read-only historical evidence; no conversion/new writes. M3 owns gems and result rewards; one-assessment identity/redemption invariants may be adapted without coin coupling. |
| Behaviour/session | LEGACY/MISSING | fixture `behaviour_state`; no lives, timetable, class-session tables, or owning service | M1 creates real sessions; M4 adds lives/restrictions/report proposal against session identity. Minigame “sessions” are unrelated. |
| Rubric/close/export | LEGACY/MISSING | projection fixture has opaque rubric/grade fields; no canonical tables/export route | M5 owns rubric derivation/adjustment; M6 owns immutable close/reopen and XLSX. |
| Projection | KEEP/ADAPT/LEGACY | `game/service.ts:585-598` builds safe roster payload; privacy tests reject private keys; `projection/*` is fixture-backed and `showStudent=true` has no timeout | Preserve allowlisting; M8 composes Energy/gems/narrative, implements expiring Show Student, and removes fixture authority. No API version is required until M8 defines replacement contracts. |
| Avatar | ADAPT/MISSING | roster stores one approved opaque avatar token; no temporary access or evolution model | M7 retains student identity and adds Avatar Core/access expiry; uploads and boutique stay out until explicitly designed. |
| Events/challenges/minigames | KEEP/ADAPT | `classroom_events`, `classroom_challenges`, `minigame_sessions`; safe aliases in `game/repository.ts:146-151` | M11 reuses mechanics and adds canonical narrative integration, with no academic/behaviour side effects. |
| Operations/privacy | KEEP/MISSING | `ops/backup/*` defines restic and local drill; `KNOWN_ISSUES.md` records restic proof absent | Preserve deployment baseline; M12 adds retention/deletion/backup expiry and executed encrypted restore evidence. C-01 remains open. |

## Failure and Privacy Boundaries

- Fail closed on ambiguous ownership, term/session identity, private-field classification, `ABSENT` meaning, money provenance, snapshot integrity, or migration evidence.
- No coin-to-gem conversion, reinterpretation of existing values, browser-side privacy filter, stored source mark, or automatic disciplinary/academic mutation.
- Temporary classroom access and Show Student must expire server-authoritatively or through an equivalent bounded contract; client timeout alone is insufficient.
- M0 introduces no routing, shell/subprocess, VCS automation, executable classification, or process integration. Threat matrix: N/A.
- C-01 remains an OPEN production blocker regardless of passing application tests.

## Working Set and Read Order

M0 Apply may modify only:

| File | Required authority reconciliation |
|---|---|
| `.ai/context/PROJECT.md` | Mark mutable 0–50 Energy, `NOT_EVALUATED`, coins, old behaviour/session, projection coin fields, and unresolved avatar rules SUPERSEDED; install the canonical register. |
| `.ai/context/DECISIONS.md` | Mark DEC-003 superseded and append one current canonicalization decision covering ABSENT/derived Energy/gems/session semantics; preserve DEC-001/2/4–6/11/12. |
| `.ai/context/ROADMAP.md` | Preserve archived history, replace only the current future plan with M1–M12 below. |
| `.ai/context/KNOWN_ISSUES.md` | Mark KI-003, KI-004, KI-006, and KI-007 superseded/resolved by this Design; retain KI-002/KI-009 and C-01; narrow KI-005 to rollover/retention only. |

Tasks/Apply must read this Design, Architecture Review, the four files above, then cited implementation/tests. They must not modify `.ai/context/SESSION.md`, `apps/**`, `packages/**`, migrations, prior SPECs, `.sdd-runtime/**`, workflow/adapter files, or create implementation SPECs.

Dependency order: M1 calendar/terms/timetable/real sessions → M2 RT/ABSENT/term average/Energy/streak → M3 gems/advantages/result rewards → M4 lives/behaviour/Red Code → M5 quarterly rubric → M6 term close/XLSX → M7 Avatar Core/temporary access → M8 workspace/Classroom Mode/Show Student → M9 boutique → M10 history/filters/audit → M11 narrative/events/challenges/minigames integration → M12 production hardening/privacy.

## Testing Strategy

M0 acceptance is documentary: validate all nine EclipseGames semantic topics; assert the canonical register, explicit stale markers, complete classification matrix, M1–M12 order, bounded file allowlist, and C-01 language. Mechanical evidence runs `pnpm sdd:validate:design -- --active-only docs/specs/SPEC-0017-functional-canonicalization-gap-audit/DESIGN.md` and `pnpm sdd:validate`; reviewers verify no product, prior-SPEC, or runtime mutation. Later SPECs own RED domain, migration, API/privacy, and Playwright tests; M0 must not claim those behaviors exist.

## Migration / Rollout

M0 has no schema, API, compatibility view, data migration, flag, or deployment. Rollback is restoration of the four context documents from review history. Later migrations are forward-only and independently approved. In particular, M3 starts gems at zero/explicit new grants, freezes legacy coin writes, and retains coin rows without conversion; M8 replaces fixture projection only after allowlist/privacy parity; M12 alone may close C-01 with policy plus executed evidence.

## Simplicity Check

M0 limits modifications to one authoritative audit and four bounded context reconciliations. It keeps the platform, roster, XP evidence, assessment identity, safe projection construction, gameplay mechanics, and backup scripts; adds no runtime dependency, table, endpoint, generic engine, configuration surface, or product implementation. Each missing capability stays with one dependency-ordered later SPEC, preventing speculative complexity.
