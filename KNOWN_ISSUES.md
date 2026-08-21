# KNOWN_ISSUES.md — Protocole Éclipse

Known issues here are non-blocking limitations, debt or deferred decisions.
Future features belong in `ROADMAP.md`.

## KI-001 — Technical stack not selected

**Status:** Open  
**Severity:** Expected / non-blocking  
**Area:** Architecture

### Problem
The project starts without code or an approved implementation stack.

### Impact
No product implementation should begin until SPEC-0001 selects the architecture.

### Resolution
SPEC-0001.

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

## KI-003 — Avatar source strategy unresolved

**Status:** Open  
**Severity:** Low  
**Area:** UX / privacy

### Problem
The product requires avatars but has not decided whether they are generated, selected from a built-in library or uploaded.

### Impact
May affect storage and privacy surface.

### Resolution
Decide in the first SPEC that needs avatar persistence.

---

## KI-004 — Energy public-state thresholds need canonical implementation values

**Status:** Open  
**Severity:** Medium  
**Area:** Domain / UI

### Problem
The product requires public visual states such as critical, low, stable, high and maximum, but exact Energy thresholds should be defined once in the relevant Design.

### Impact
No impact until SPEC-0006 / SPEC-0009.

### Resolution
Set explicit thresholds in Design and test them.

---

## KI-005 — School-year rollover semantics not fully designed

**Status:** Open  
**Severity:** Medium  
**Area:** Data lifecycle

### Problem
Annual XP and badges persist through the school year, but year rollover/archive mechanics, retention and copy-forward behaviour are not yet designed.

### Impact
Does not block MVP core implementation.

### Resolution
Cover in SPEC-0002 and revisit before production.

---

## KI-006 — Behaviour session boundary requires technical definition

**Status:** Open  
**Severity:** Medium  
**Area:** Behaviour

### Problem
The product says behaviour state resets at the next teaching session, but the technical definition of a session is not yet decided.

### Impact
Must be resolved before SPEC-0007 Apply.

### Resolution
Define session lifecycle in SPEC-0007 Design.

---

## KI-007 — Assessment-context model for coin spending unresolved

**Status:** Open  
**Severity:** Medium  
**Area:** Coins

### Problem
The business rule allows at most one advantage per assessment, but the app does not manage exam grades. A minimal way to identify an assessment instance is still needed.

### Impact
Must be resolved before reward-spending implementation.

### Resolution
SPEC-0005 Design.

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
