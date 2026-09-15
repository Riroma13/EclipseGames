import { closeRt } from './domain.js';

export function toTermCloseDto(value: any) {
  return {
    state: value.closure?.state ?? 'OPEN',
    revision: value.closure?.revision ?? 0,
    currentSnapshotVersion: value.closure?.currentSnapshotVersion ?? null,
    activeCount: value.activeCount,
    readyCount: value.readyCount,
    ready: value.ready,
    students: value.rows.map((row: any) => ({
      studentId: row.studentId,
      realName: row.realName,
       rubricState: row.rubricState,
       snapshotVersion: row.snapshotVersion,
       rtCount: row.rt.length,
       gradeMilli: row.gradeMilli ?? null,
       rtAverage: closeRt(row.rt).average,
    })),
    blockers: value.blockers,
    b01Count: value.b01Count,
    b01Warning: value.b01Warning,
    staleReasons: value.staleReasons ?? [],
    closedAt: value.closure?.closedAt ?? null,
  };
}

export function toTermCloseMutationDto(value: any) {
  return { revision: value.revision, version: value.version };
}
