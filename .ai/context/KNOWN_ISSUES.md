# KNOWN_ISSUES.md — Protocole Éclipse

Known issues here are non-blocking limitations, debt or deferred decisions.
Future features belong in `ROADMAP.md`.

## Control-plane reconciliation

The repository is now governed by SDD Lite in `docs/SDD-WORKFLOW.md` and
`docs/architecture/sdd-lite.md`. Older notes that describe Portable v1,
Apply/Archive/Health/Repository Ready, or automated Git handoff are historical
and must not be used as current execution instructions. This section is
governance context only; it does not create a product requirement.

## KI-001 — Technical stack not selected

**Status:** Resolved by SPEC-0001  
**Severity:** Expected / non-blocking  
**Area:** Architecture

### Problem
The project starts without code or an approved implementation stack.

### Impact
No product implementation should begin until SPEC-0001 selects the architecture.

### Resolution
Resolved by the archived SPEC-0001 platform foundation Design.

---

## KI-009 — Encrypted restic execution unavailable on archive host

**Status:** Open / production gate  
**Severity:** High before production  
**Area:** Operations / recoverability

### Problem
The archive host does not provide `restic`, so encrypted restic backup/restore execution has not been demonstrated.

### Impact
The local fixture restore drill is not encrypted-restic proof. Real student data and production use remain blocked by C-01.

### Resolution
Complete the approved SPEC-0014/0016 retention/deletion, backup-expiry, and quarterly encrypted-restic restore verification work.

---

## KI-002 — Exact legal/privacy compliance controls not yet designed

**Status:** Open  
**Severity:** High before production  
**Area:** Privacy / compliance

### Problem
The product handles educational data relating to minors, but technical retention, deletion, backup and access-control policies are not yet designed.

### Impact
This does not block architecture exploration, but blocks production use.

### Resolution
Address baseline controls in SPEC-0001 and perform dedicated hardening in SPEC-0014.

---

## KI-003 — Avatar source strategy unresolved (SUPERSEDED / RESOLVED by SPEC-0017)

**Status:** Superseded / resolved
**Severity:** Low  
**Area:** UX / privacy

### Historical problem
The product requires avatars but has not decided whether they are generated, selected from a built-in library or uploaded.

### Historical impact
May affect storage and privacy surface.

### Resolution
SPEC-0017 defines Agent Éclipse identity, temporary access expiry, Avatar Core
evolution, and keeps uploads/boutique out until explicitly designed.

---

## KI-004 — Energy public-state thresholds need canonical implementation values (SUPERSEDED / RESOLVED by SPEC-0017)

**Status:** Superseded / resolved
**Severity:** Medium  
**Area:** Domain / UI

### Problem
The product requires public visual states such as critical, low, stable, high and maximum, but exact Energy thresholds should be defined once in the relevant Design.

### Impact
No impact until SPEC-0006 / SPEC-0009.

### Resolution
SPEC-0017 defines Critical 0–2.9, Low 3–4.9, Stable 5–6.4, High 6.5–8.4,
and Maximum 8.5–10 from current-term RT average.

---

## KI-005 — School-year rollover semantics not fully designed

**Status:** Open  
**Severity:** Medium  
**Area:** Data lifecycle

### Problem
Annual XP and badges persist through the school year, but year rollover/archive
and copy-forward behaviour are not yet designed. Retention is owned separately
by production hardening.

### Impact
Does not block MVP core implementation.

### Resolution
Cover rollover in the relevant future SPEC and retention in SPEC-0014/0016.

---

## KI-006 — Behaviour session boundary requires technical definition (SUPERSEDED / RESOLVED by SPEC-0017)

**Status:** Superseded / resolved
**Severity:** Medium  
**Area:** Behaviour

### Problem
The product says behaviour state resets at the next teaching session, but the technical definition of a session is not yet decided.

### Impact
Must be resolved before SPEC-0007 Apply.

### Resolution
SPEC-0017 defines a real class session as the interval between explicit
`Comenzar clase` and `Finalizar clase` within timetable, teaching-day, and
holiday configuration.

---

## KI-007 — Assessment-context model for coin spending unresolved (SUPERSEDED / RESOLVED by SPEC-0017)

**Status:** Superseded / resolved
**Severity:** Medium  
**Area:** Coins

### Problem
The business rule allows at most one advantage per assessment, but the app does not manage exam grades. A minimal way to identify an assessment instance is still needed.

### Impact
Must be resolved before reward-spending implementation.

### Resolution
SPEC-0017 preserves one advantage per assessment while replacing future money
with gem-owned contracts; assessment identity may be reused without coin/gem
coupling.

---

## KI-008 — Narrative media hosting unresolved

**Status:** Open  
**Severity:** Low  
**Area:** Narrative

### Problem
Video/media assets are planned, but storage/hosting strategy is not selected.

### Impact
No impact on core MVP.

### Resolution
SPEC-0013.
