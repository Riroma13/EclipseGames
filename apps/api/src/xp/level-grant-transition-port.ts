import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
export type XpLevelGrantTransition = { id: string; sequence: number; unlockId: string; studentId: string; academicYearId: string; level: number; kind: 'GRANT'|'REVOKE'|'REINSTATE'; occurredAt: string };
export type CanonicalXpTransitionPort = XpLevelGrantTransitionPort & { completeAuthoritativeLevelTransitions: (database: Database.Database) => { throughSequence: number; appendedTransitions: readonly { id: string; sequence: number }[] } };
export type XpLevelGrantTransitionPort = { listAfter: (sequence: number, limit: number) => XpLevelGrantTransition[]; get: (id: string) => XpLevelGrantTransition | undefined };
export function createLevelGrantTransitionPort(db: Database.Database): CanonicalXpTransitionPort {
  const map = (row: any): XpLevelGrantTransition => ({ id: row.id, sequence: row.sequence, unlockId: row.unlockId, studentId: row.studentId, academicYearId: row.academicYearId, level: row.level, kind: row.kind, occurredAt: row.occurredAt });
  return {
    listAfter: (sequence, limit) => (db.prepare(`SELECT t.id, t.sequence, t.unlock_id AS unlockId, u.student_id AS studentId, u.academic_year_id AS academicYearId, u.level, t.kind, t.occurred_at AS occurredAt FROM xp_level_grant_transitions t JOIN xp_level_unlocks u ON u.id=t.unlock_id WHERE t.sequence > ? ORDER BY t.sequence LIMIT ?`).all(sequence, limit) as any[]).map(map),
    get: (id) => { const row = db.prepare(`SELECT t.id, t.sequence, t.unlock_id AS unlockId, u.student_id AS studentId, u.academic_year_id AS academicYearId, u.level, t.kind, t.occurred_at AS occurredAt FROM xp_level_grant_transitions t JOIN xp_level_unlocks u ON u.id=t.unlock_id WHERE t.id = ?`).get(id); return row ? map(row) : undefined; },
    completeAuthoritativeLevelTransitions: () => completeAuthoritativeLevelTransitions(db),
  };
}

export function completeAuthoritativeLevelTransitions(db: Database.Database) {
  const thresholds = [10, 25, 45, 70, 100, 135, 175];
  const scopes = db.prepare('SELECT DISTINCT student_id AS studentId, academic_year_id AS academicYearId FROM xp_evidence_events ORDER BY academic_year_id,student_id').all() as Array<{studentId:string;academicYearId:string}>;
  const expected: Array<{studentId:string;academicYearId:string;level:number;kind:'GRANT'|'REVOKE'|'REINSTATE';eventId:string|null;reversalId:string|null;occurredAt:string;ownerTeacherId:string}> = [];
  for (const scope of scopes) {
    const events = db.prepare(`SELECT e.id,e.effective_xp AS effectiveXp,e.created_at AS occurredAt,g.owner_teacher_id AS ownerTeacherId,
      r.id AS reversalId,r.created_at AS reversalAt FROM xp_evidence_events e JOIN students s ON s.id=e.student_id JOIN groups g ON g.id=s.group_id
      LEFT JOIN xp_evidence_reversals r ON r.target_event_id=e.id WHERE e.student_id=? AND e.academic_year_id=? ORDER BY e.created_at,e.id`).all(scope.studentId, scope.academicYearId) as any[];
    const operations = events.flatMap(event => [{ ...event, delta: Number(event.effectiveXp), sourceId:event.id, reversalId:null, at:event.occurredAt, kind:'EVENT' }, ...(event.reversalId ? [{ ...event, delta: -Number(event.effectiveXp), sourceId:null, reversalId:event.reversalId, at:event.reversalAt, kind:'REVERSAL' }] : [])]).sort((a,b) => `${a.at}\u0000${a.sourceId ?? a.reversalId}`.localeCompare(`${b.at}\u0000${b.sourceId ?? b.reversalId}`));
    let total = 0;
    const activeLevels = new Set<number>();
    for (const operation of operations) {
      const after = total + operation.delta; if (!Number.isSafeInteger(after) || after < 0) throw new Error('XP total is not a safe integer.');
      if (operation.delta > 0) for (let level = 2; level <= 8; level += 1) if (total < thresholds[level - 2] && after >= thresholds[level - 2]) { expected.push({ ...scope, level, kind:activeLevels.has(level) ? 'REINSTATE' : 'GRANT', eventId:operation.sourceId, reversalId:null, occurredAt:operation.at, ownerTeacherId:operation.ownerTeacherId }); activeLevels.add(level); }
      else for (let level = 8; level >= 2; level -= 1) if (total >= thresholds[level - 2] && after < thresholds[level - 2]) { expected.push({ ...scope, level, kind:'REVOKE', eventId:null, reversalId:operation.reversalId, occurredAt:operation.at, ownerTeacherId:operation.ownerTeacherId }); activeLevels.delete(level); }
      total = after;
    }
  }
  const sourceKey = (row: {eventId:string|null;reversalId:string|null}) => row.eventId ?? row.reversalId!;
  const existing = db.prepare('SELECT t.*,u.student_id AS studentId,u.academic_year_id AS academicYearId,u.level,g.owner_teacher_id AS ownerTeacherId FROM xp_level_grant_transitions t JOIN xp_level_unlocks u ON u.id=t.unlock_id JOIN students s ON s.id=u.student_id JOIN groups g ON g.id=s.group_id ORDER BY t.sequence').all() as any[];
  const seen = new Set<string>();
  for (const row of existing) {
    if (!Number.isSafeInteger(row.sequence) || row.sequence < 1 || seen.has(String(row.sequence))) throw new Error('XP transition sequence is invalid.');
    seen.add(String(row.sequence));
  }
  const existingMax = existing.length ? Math.max(...existing.map(row => row.sequence)) : 0;
  if (existing.length !== existingMax || [...Array(existingMax)].some((_, index) => !seen.has(String(index + 1)))) throw new Error('XP transition sequences are not contiguous.');
  const missing = expected.filter(item => {
    const matches = existing.filter(row => row.level === item.level && row.kind === item.kind && row.studentId === item.studentId && row.academicYearId === item.academicYearId && row.source_event_id === item.eventId && row.source_reversal_id === item.reversalId);
    if (matches.length > 1) throw new Error('XP transition is duplicated.');
    return matches.length === 0;
  });
  const expectedKeys = new Set(expected.map(item => `${item.level}:${item.kind}:${item.studentId}:${item.academicYearId}:${sourceKey(item)}`));
  if (existing.some(row => !expectedKeys.has(`${row.level}:${row.kind}:${row.studentId}:${row.academicYearId}:${row.source_event_id ?? row.source_reversal_id}`))) throw new Error('XP transition lineage is not authoritative.');
  missing.sort((a,b) => `${a.occurredAt}\u0000${a.ownerTeacherId}\u0000${a.academicYearId}\u0000${a.studentId}\u0000${a.kind === 'GRANT' ? 0 : 1}\u0000${sourceKey(a)}\u0000${a.kind === 'REVOKE' ? -a.level : a.level}`.localeCompare(`${b.occurredAt}\u0000${b.ownerTeacherId}\u0000${b.academicYearId}\u0000${b.studentId}\u0000${b.kind === 'GRANT' ? 0 : 1}\u0000${sourceKey(b)}\u0000${b.kind === 'REVOKE' ? -b.level : b.level}`));
  let sequence = existingMax;
  const appended: Array<{id:string;sequence:number}> = [];
  for (const item of missing) {
    let unlock = db.prepare('SELECT id,active FROM xp_level_unlocks WHERE student_id=? AND academic_year_id=? AND level=?').get(item.studentId,item.academicYearId,item.level) as any;
    if (item.kind === 'GRANT' && !unlock) { unlock = { id: randomUUID(), active: 1 }; db.prepare('INSERT INTO xp_level_unlocks (id,student_id,academic_year_id,level,active,first_crossed_at,first_source_event_id,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(unlock.id,item.studentId,item.academicYearId,item.level,1,item.occurredAt,item.eventId,item.occurredAt); }
    if (!unlock) throw new Error('XP unlock is missing.');
    if (item.kind === 'REINSTATE') db.prepare('UPDATE xp_level_unlocks SET active=1,updated_at=? WHERE id=?').run(item.occurredAt,unlock.id);
    if (item.kind === 'REVOKE') db.prepare('UPDATE xp_level_unlocks SET active=0,updated_at=? WHERE id=?').run(item.occurredAt,unlock.id);
    sequence += 1; const id = randomUUID();
    db.prepare('INSERT INTO xp_level_grant_transitions (id,sequence,unlock_id,kind,source_event_id,source_reversal_id,occurred_at) VALUES (?,?,?,?,?,?,?)').run(id,sequence,unlock.id,item.kind,item.eventId,item.reversalId,item.occurredAt);
    appended.push({id,sequence});
  }
  return { throughSequence: sequence, appendedTransitions: appended };
}
