import { describe, expect, it } from 'vitest';
import { assessReadiness, closeRt, orderSnapshotStudents, staleReasons, type TermCloseStudent } from './domain.js';

describe('term-close domain', () => {
  it('requires every active student to have a current closed M5 snapshot, while no RT is ready', () => {
    const result = assessReadiness([
      { studentId: 'b', active: true, rubricState: 'CLOSED', snapshotVersion: 2, rt: [] },
      { studentId: 'a', active: true, rubricState: 'OPEN', snapshotVersion: null, rt: [{ id: 'r', value: 'ABSENT' }] },
    ]);
    expect(result).toMatchObject({ activeCount: 2, readyCount: 1, ready: false });
    expect(result.blockers).toEqual([{ studentId: 'a', reason: 'M5_NOT_CLOSED' }]);
  });

  it('sums 10/5/0, excludes ABSENT, and preserves null for no evaluated RT', () => {
    expect(closeRt([{ id: '1', value: '10' }, { id: '2', value: 'ABSENT' }, { id: '3', value: '5' }, { id: '4', value: '0' }])).toEqual({ sum: 15, evaluatedCount: 3, average: 5 });
    expect(closeRt([{ id: 'a', value: 'ABSENT' }])).toEqual({ sum: null, evaluatedCount: 0, average: null });
  });

  it('orders immutable snapshot rows by real name NOCASE then student id', () => {
    const rows: TermCloseStudent[] = [
      { studentId: '2', realName: 'ada', gradeMilli: 1, evaluationId: 'e2', evaluationSnapshotVersion: 1, rt: [] },
      { studentId: '1', realName: 'Ada', gradeMilli: 2, evaluationId: 'e1', evaluationSnapshotVersion: 1, rt: [] },
    ];
    expect(orderSnapshotStudents(rows).map(row => row.studentId)).toEqual(['1', '2']);
  });

  it('explains stale cohort, rubric, and RT lineage changes', () => {
    expect(staleReasons(
      { cohort: ['a'], rubric: [{ studentId: 'a', version: 1, state: 'CLOSED' }], rt: [{ id: 'r', value: '10' }] },
      { cohort: ['b'], rubric: [{ studentId: 'a', version: 2, state: 'REOPENED' }], rt: [{ id: 'r', value: '5' }] },
    )).toEqual(['COHORT_CHANGED', 'M5_CHANGED', 'RT_CHANGED']);
  });
});
