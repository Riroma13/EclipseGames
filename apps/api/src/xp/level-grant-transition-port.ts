import type Database from 'better-sqlite3';
export type XpLevelGrantTransition = { id: string; sequence: number; unlockId: string; studentId: string; academicYearId: string; level: number; kind: 'GRANT'|'REVOKE'|'REINSTATE'; occurredAt: string };
export type XpLevelGrantTransitionPort = { listAfter: (sequence: number, limit: number) => XpLevelGrantTransition[]; get: (id: string) => XpLevelGrantTransition | undefined };
export function createLevelGrantTransitionPort(db: Database.Database): XpLevelGrantTransitionPort {
  const map = (row: any): XpLevelGrantTransition => ({ id: row.id, sequence: row.sequence, unlockId: row.unlockId, studentId: row.studentId, academicYearId: row.academicYearId, level: row.level, kind: row.kind, occurredAt: row.occurredAt });
  return {
    listAfter: (sequence, limit) => (db.prepare(`SELECT t.id, t.sequence, t.unlock_id AS unlockId, u.student_id AS studentId, u.academic_year_id AS academicYearId, u.level, t.kind, t.occurred_at AS occurredAt FROM xp_level_grant_transitions t JOIN xp_level_unlocks u ON u.id=t.unlock_id WHERE t.sequence > ? ORDER BY t.sequence LIMIT ?`).all(sequence, Math.min(Math.max(limit, 1), 100)) as any[]).map(map),
    get: (id) => { const row = db.prepare(`SELECT t.id, t.sequence, t.unlock_id AS unlockId, u.student_id AS studentId, u.academic_year_id AS academicYearId, u.level, t.kind, t.occurred_at AS occurredAt FROM xp_level_grant_transitions t JOIN xp_level_unlocks u ON u.id=t.unlock_id WHERE t.id = ?`).get(id); return row ? map(row) : undefined; },
  };
}
