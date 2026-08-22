# SPEC-0002 Archive Report

## Outcome

SPEC-0002 — Academic Years, Groups, and Students was archived on 2026-08-22 according to `docs/SDD-WORKFLOW.md`.

The final Verify outcome is **PASS WITH CONDITIONS**. AC-01–AC-08 are complete. No CRITICAL finding or unresolved BLOCKER remains. C-01 is the sole condition and remains production-only: real student data and production use remain blocked until SPEC-0014/0016 define and implement retention/deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification.

## Artifact traceability

| Artifact | Repository path | Engram observation |
|---|---|---|
| Design | `docs/specs/SPEC-0002-academic-years-groups-students/DESIGN.md` | #1896 (`sdd/spec-0002-academic-years-groups-students/design`); status changed to Archived |
| Tasks | `docs/specs/SPEC-0002-academic-years-groups-students/TASKS.md` | #1908 (`sdd/spec-0002-academic-years-groups-students/tasks`); tasks 1.1–4.3 checked |
| Apply Summary | `docs/specs/SPEC-0002-academic-years-groups-students/APPLY-SUMMARY.md` | #1911 (`sdd/spec-0002-academic-years-groups-students/apply-progress`); cumulative remediation evidence |
| Apply gate | `docs/specs/SPEC-0002-academic-years-groups-students/APPLY-SUMMARY.md` | #1922 (`sdd/spec-0002-academic-years-groups-students/apply-contract-gate-final`) |
| Verify Report | `docs/specs/SPEC-0002-academic-years-groups-students/VERIFY-REPORT.md` | #1924 (`sdd/spec-0002-academic-years-groups-students/verify-report`); final `PASS WITH CONDITIONS` |
| Archive report | `docs/specs/SPEC-0002-academic-years-groups-students/ARCHIVE-REPORT.md` | #1930 (`sdd/SPEC-0002-academic-years-groups-students/archive-report`) |

This repository-native change has no proposal/spec artifact and no OpenSpec change/spec tree. No foreign OpenSpec status or decision fields were added.

## Completion checks

- Tasks 1.1–4.3: **all checked**.
- Apply Summary: present and preserved as the cumulative implementation audit trail.
- Verify Report: present; final outcome `PASS WITH CONDITIONS`; AC-01–AC-08 complete; no CRITICAL findings; C-01 is the sole production-only condition.
- Avatar remediation: the approved five-token catalog (`default`, `fox`, `owl`, `cat`, `wolf`) is aligned across service validation, route validation, SQLite persistence, and authenticated regression coverage.
- Design: preserved in full; lifecycle status changed from Approved to Archived.
- OpenSpec sync/move: **not applicable**; no OpenSpec directories exist and none were created.
- Implementation files, tests, schema, migrations, TASKS, APPLY-SUMMARY, and VERIFY-REPORT: not modified by Archive.
- VCS actions: none; no commit, push, merge, release, or tag.

## Acceptance criteria

| Criterion | Archive result |
|---|---|
| AC-01 | Complete — authenticated roster workflow, ownership, correction, and archive evidence passed. |
| AC-02 | Complete — migration ordering/repeatability, constraints, atomic rollback, and fail-closed evidence passed. |
| AC-03 | Complete — server-side private/classroom-safe DTO boundaries and negative privacy evidence passed. |
| AC-04 | Complete — `projection_students` remains fixture-only. |
| AC-05 | Complete with C-01 — no non-goal or later-SPEC drift; production gate remains open. |
| AC-06 | Complete — terminal manual year archive and historical-read behaviour passed. |
| AC-07 | Complete — trimming, casing, uniqueness, avatar catalog, and persistence evidence passed. |
| AC-08 | Complete — bounded same-year group correction, stable ID, no history, and failure coverage passed. |

## Findings and deferred work

### CONDITION

- **C-01 — production privacy and recoverability gate:** Before real student data or production use, SPEC-0014/0016 must define and implement retention and deletion including backup expiry and demonstrate quarterly encrypted-restic restore verification. The archive host does not provide `restic`; local fixture restore is not encrypted-restic proof.

### NON-BLOCKING

- Roster UI remains SPEC-0003 scope.
- Avatar presentation/catalog UX, year rollover/copy-forward, and student transfer/history remain deferred to their designated future Designs.
- Exact legal/privacy retention and deletion controls remain deferred to SPEC-0014.

## Durable context updates

- `DESIGN.md`: marked Archived without changing the approved Design or review history.
- `ROADMAP.md`: marked SPEC-0002 complete/archived with `PASS WITH CONDITIONS` and identified SPEC-0003 as the next dependency step.
- `SESSION.md`: recorded the archive result, C-01, and the exact next SDD step: `Health Report for SPEC-0002`.
- `DECISIONS.md`: no update required; no new durable decision was introduced.
- `KNOWN_ISSUES.md`: no update required; C-01 and existing deferred issues are already recorded under the established convention.

## Next step

`Health Report for SPEC-0002.`
