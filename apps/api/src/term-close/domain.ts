export type RtEvidence = { id: string; value: '10' | '5' | '0' | 'ABSENT' };
export type TermCloseStudent = {
  studentId: string;
  realName: string;
  gradeMilli: number;
  evaluationId: string;
  evaluationSnapshotVersion: number;
  rt: RtEvidence[];
};

export function closeRt(entries: readonly RtEvidence[]) {
  const evaluated = entries.filter((entry) => entry.value !== 'ABSENT');
  const sum = evaluated.reduce((total, entry) => total + Number(entry.value), 0);
  return { sum: evaluated.length ? sum : null, evaluatedCount: evaluated.length, average: evaluated.length ? sum / evaluated.length : null };
}

export function b01Warning(count: number) {
  return count > 0 ? 'La actividad XP heredada sin trimestre es solo anual; no se infiere el trimestre.' : null;
}

export function orderSnapshotStudents(rows: readonly TermCloseStudent[]) {
  return [...rows].sort((a, b) => a.realName.localeCompare(b.realName, undefined, { sensitivity: 'base' }) || a.studentId.localeCompare(b.studentId));
}

export type ReadinessRow = { studentId: string; active: boolean; rubricState: string | null; snapshotVersion: number | null; rt: RtEvidence[] };
export function assessReadiness(rows: readonly ReadinessRow[]) {
  const blockers = rows.filter((row) => row.active && (row.rubricState !== 'CLOSED' || row.snapshotVersion === null)).map((row) => ({ studentId: row.studentId, reason: 'M5_NOT_CLOSED' as const }));
  return { activeCount: rows.filter((row) => row.active).length, readyCount: rows.filter((row) => row.active && row.rubricState === 'CLOSED' && row.snapshotVersion !== null).length, ready: rows.length > 0 && blockers.length === 0, blockers };
}

type Lineage = { cohort: string[]; rubric: Array<{ studentId: string; version: number; state: string }>; rt: RtEvidence[] };
export function staleReasons(previous: Lineage, current: Lineage) {
  const reasons: string[] = [];
  if (JSON.stringify([...previous.cohort].sort()) !== JSON.stringify([...current.cohort].sort())) reasons.push('COHORT_CHANGED');
  if (JSON.stringify(previous.rubric) !== JSON.stringify(current.rubric)) reasons.push('M5_CHANGED');
  if (JSON.stringify(previous.rt) !== JSON.stringify(current.rt)) reasons.push('RT_CHANGED');
  return reasons;
}
