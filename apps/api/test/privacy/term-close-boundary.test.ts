import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { b01Warning } from '../../src/term-close/domain.js';
import { toProjectionStudentDto } from '../../src/projection/mapper.js';
import { toTermCloseDto } from '../../src/term-close/mapper.js';

describe('term-close privacy boundary', () => {
  it('keeps teacher-private names, grades, RT, sources, snapshots and files out of classroom projection', () => {
    const record = {
      avatar: 'owl', alias: 'Visible alias', specialty: 'Communication', unlockedBadge: null,
      xpLevel: 2, progressToNextLevel: 10, energyVisualState: 'stable', coinBalance: 0,
      narrativeProgress: 0, realName: 'PRIVATE NAME', rtAverage: 8.5, rubric: 'PRIVATE RUBRIC',
      observationGrade: 9.125, xpBreakdown: 'PRIVATE XP', comments: 'PRIVATE COMMENT',
      incidents: 'PRIVATE INCIDENT', redCodes: 'PRIVATE RED CODE', disciplinaryHistory: 'PRIVATE HISTORY',
      detailedHistory: 'PRIVATE DETAIL', ownerTeacherId: 'PRIVATE OWNER', sourceEntryId: 'PRIVATE SOURCE',
      xlsxBytes: Buffer.from('PRIVATE FILE'),
    } as any;
    const projection = toProjectionStudentDto(record);
    expect(projection).toEqual({ avatar: 'owl', alias: 'Visible alias', specialty: 'Communication', unlockedBadge: null, xpLevel: 2, progressToNextLevel: 10, energyVisualState: 'stable', coinBalance: 0, narrativeProgress: 0 });
    expect(JSON.stringify(projection)).not.toMatch(/PRIVATE|grade|rt|rubric|source|xlsx/i);
  });

  it('maps readiness metadata without exposing export bytes or source details', () => {
    const readiness = toTermCloseDto({ closure: null, activeCount: 1, readyCount: 1, ready: true, blockers: [], b01Count: 0, b01Warning: null, staleReasons: [], rows: [{ studentId: 'opaque-id', realName: 'Teacher-only name', rubricState: 'CLOSED', snapshotVersion: 1, rt: [] }], xlsxBytes: Buffer.from('PRIVATE FILE'), sourceEntryId: 'PRIVATE SOURCE' });
    expect(readiness.students[0]).toEqual({ studentId: 'opaque-id', realName: 'Teacher-only name', rubricState: 'CLOSED', snapshotVersion: 1, rtCount: 0, gradeMilli: null, rtAverage: null });
    expect(JSON.stringify(readiness)).not.toMatch(/xlsx|bytes|source/i);
  });

  it('preserves B-01 as annual-only and never infers a term', () => {
    expect(b01Warning(0)).toBeNull();
    expect(b01Warning(3)).toBe('La actividad XP heredada sin trimestre es solo anual; no se infiere el trimestre.');
  });

  it('keeps C-01 as a production rollout limitation', () => {
    const design = readFileSync('docs/specs/SPEC-0037-m6-term-close-xlsx/DESIGN.md', 'utf8');
    expect(design).toContain('real-data production remains blocked by retention/deletion, backup expiry, and executed encrypted-restic restore evidence');
    expect(design).toContain('this SPEC does not solve it');
  });
});
