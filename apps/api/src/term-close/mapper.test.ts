import { describe, expect, it } from 'vitest';
import { toTermCloseDto } from './mapper.js';

describe('term-close private mapper', () => {
  it('exposes the fields consumed by the private readiness UI', () => {
    const dto = toTermCloseDto({
      closure: { state: 'CLOSED', revision: 4, currentSnapshotVersion: 2, closedAt: '2026-12-01T10:00:00.000Z' },
      activeCount: 1,
      readyCount: 1,
      ready: true,
      rows: [{ studentId: 'student', realName: 'Ada', rubricState: 'CLOSED', snapshotVersion: 3, gradeMilli: 8125, closedAt: '2026-11-30T10:00:00.000Z', rt: [{ id: 'rt', value: '10' }] }],
      blockers: [], b01Count: 0, b01Warning: null, staleReasons: [],
    });

    expect(dto).toMatchObject({ closedAt: '2026-12-01T10:00:00.000Z', students: [{ gradeMilli: 8125, rtAverage: 10 }] });
  });
});
