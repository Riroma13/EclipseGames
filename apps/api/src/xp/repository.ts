import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import type { XpLevelGrantTransition } from './level-grant-transition-port.js';

const categories = ['COMMUNICATION','PRECISION','CONSISTENCY','COLLABORATION'] as const;
type XpCategory = typeof categories[number];
const badgeLabels: Record<typeof categories[number], string> = { COMMUNICATION: 'Voz activa', PRECISION: 'Ojo clínico', CONSISTENCY: 'Paso firme', COLLABORATION: 'Buen aliado' };
const levelThresholds = [0, 10, 25, 45, 70, 100, 135, 175] as const;
function levelForXp(total: number) { let level = 1; for (let i = 1; i < levelThresholds.length; i += 1) if (total >= levelThresholds[i]) level = i + 1; return level as 1|2|3|4|5|6|7|8; }
function progressForXp(total: number) { const level = levelForXp(total); return level === 8 ? { current: 0, required: 0, nextLevel: null, isMaxLevel: true } : { current: total - levelThresholds[level - 1], required: levelThresholds[level] - levelThresholds[level - 1], nextLevel: level + 1, isMaxLevel: false }; }
const now = () => new Date().toISOString();
export type EventRow = { id:string; studentId:string; academicYearId:string; category:XpCategory; baseXp:number; specialtyBonusXp:number; effectiveXp:number; specialtyAtAward:string|null; comment:string|null; createdAt:string; reversedAt:string|null };
const eventSelect = `SELECT e.id, e.student_id AS studentId, e.academic_year_id AS academicYearId, e.category, e.base_xp AS baseXp, e.specialty_bonus_xp AS specialtyBonusXp, e.effective_xp AS effectiveXp, e.specialty_at_award AS specialtyAtAward, e.comment, e.created_at AS createdAt, r.created_at AS reversedAt FROM xp_evidence_events e LEFT JOIN xp_evidence_reversals r ON r.target_event_id=e.id`;
export function withTransaction<T>(db: Database.Database, work: () => T) { return db.transaction(work)(); }
export function findEvent(db: Database.Database, teacherId: string, eventId: string) { return db.prepare(`${eventSelect} WHERE e.id=? AND e.owner_teacher_id=?`).get(eventId, teacherId) as EventRow|undefined; }
export function findEventByRequest(db: Database.Database, teacherId: string, requestId: string) { return db.prepare(`${eventSelect} WHERE e.owner_teacher_id=? AND e.client_request_id=?`).get(teacherId, requestId) as EventRow|undefined; }
export function findReversalByRequest(db: Database.Database, teacherId: string, requestId: string) { return db.prepare(`SELECT r.id, r.target_event_id AS targetEventId, r.reason, r.created_at AS createdAt, r.request_fingerprint AS requestFingerprint, e.student_id AS studentId, e.academic_year_id AS academicYearId FROM xp_evidence_reversals r JOIN xp_evidence_events e ON e.id=r.target_event_id WHERE r.owner_teacher_id=? AND r.client_request_id=?`).get(teacherId, requestId) as any;
}
export function fingerprint(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function derive(db: Database.Database, studentId: string, academicYearId: string) {
  const events = db.prepare(`SELECT e.id,e.category,e.specialty_category_at_award AS specialtyCategoryAtAward,e.effective_xp AS effectiveXp FROM xp_evidence_events e LEFT JOIN xp_evidence_reversals r ON r.target_event_id=e.id WHERE e.student_id=? AND e.academic_year_id=? AND r.id IS NULL`).all(studentId, academicYearId) as any[];
  const total = events.reduce((sum, e) => sum + e.effectiveXp, 0); const level = levelForXp(total); const progress = progressForXp(total);
  const badges = categories.map((category) => { const qualifying = events.filter((e) => e.category === category && e.specialtyCategoryAtAward === category); const row = db.prepare(`SELECT * FROM xp_badge_unlocks WHERE student_id=? AND academic_year_id=? AND category=?`).get(studentId, academicYearId, category) as any; if (qualifying.length >= 3) { const source = qualifying[qualifying.length-1]; if (!row) db.prepare(`INSERT INTO xp_badge_unlocks (id,student_id,academic_year_id,category,badge_label,active,first_unlocked_at,last_activated_at,last_revoked_at,source_event_id) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(),studentId,academicYearId,category,badgeLabels[category],1,now(),now(),null,source.id); else if (!row.active) db.prepare(`UPDATE xp_badge_unlocks SET active=1,last_activated_at=?,source_event_id=? WHERE id=?`).run(now(),source.id,row.id); } else if (row?.active) db.prepare(`UPDATE xp_badge_unlocks SET active=0,last_revoked_at=?,source_event_id=NULL WHERE id=?`).run(now(),row.id); });
  const activeBadges = db.prepare(`SELECT category,badge_label AS label,first_unlocked_at AS unlockedAt FROM xp_badge_unlocks WHERE student_id=? AND academic_year_id=? AND active=1 ORDER BY category`).all(studentId, academicYearId) as any[];
  return { studentId, academicYearId, annualEffectiveXp: total, level, progress, badges: activeBadges };
}
function transitions(db: Database.Database, studentId: string, academicYearId: string, before: number, after: number, sourceEventId: string, sourceReversalId: string|null) {
  for (let level = 2; level <= 8; level += 1) { const threshold = levelThresholds[level - 1]; const row = db.prepare(`SELECT * FROM xp_level_unlocks WHERE student_id=? AND academic_year_id=? AND level=?`).get(studentId,academicYearId,level) as any; if (before < threshold && after >= threshold) { if (!row) { const unlockId=randomUUID(); db.prepare(`INSERT INTO xp_level_unlocks (id,student_id,academic_year_id,level,active,first_crossed_at,first_source_event_id,updated_at) VALUES (?,?,?,?,?,?,?,?)`).run(unlockId,studentId,academicYearId,level,1,now(),sourceEventId,now()); db.prepare(`INSERT INTO xp_level_grant_transitions (id,sequence,unlock_id,kind,source_event_id,source_reversal_id,occurred_at) VALUES (?,COALESCE((SELECT MAX(sequence)+1 FROM xp_level_grant_transitions),1),?,'GRANT',?,NULL,?)`).run(randomUUID(),unlockId,sourceEventId,now()); } else if (!row.active) { db.prepare(`UPDATE xp_level_unlocks SET active=1,updated_at=? WHERE id=?`).run(now(),row.id); db.prepare(`INSERT INTO xp_level_grant_transitions (id,sequence,unlock_id,kind,source_event_id,source_reversal_id,occurred_at) VALUES (?,COALESCE((SELECT MAX(sequence)+1 FROM xp_level_grant_transitions),1),?,'REINSTATE',?,NULL,?)`).run(randomUUID(),row.id,sourceEventId,now()); } } else if (before >= threshold && after < threshold && row?.active) { db.prepare(`UPDATE xp_level_unlocks SET active=0,updated_at=? WHERE id=?`).run(now(),row.id); db.prepare(`INSERT INTO xp_level_grant_transitions (id,sequence,unlock_id,kind,source_event_id,source_reversal_id,occurred_at) VALUES (?,COALESCE((SELECT MAX(sequence)+1 FROM xp_level_grant_transitions),1),?,'REVOKE',NULL,?,?)`).run(randomUUID(),row.id,sourceReversalId,now()); } }
}
export function createEvent(db: Database.Database, input: any) { const before = derive(db,input.studentId,input.academicYearId).annualEffectiveXp; db.prepare(`INSERT INTO xp_evidence_events (id,owner_teacher_id,student_id,academic_year_id,category,base_xp,specialty_at_award,specialty_category_at_award,bonus_eligible_at_award,specialty_bonus_xp,effective_xp,comment,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(input.id,input.teacherId,input.studentId,input.academicYearId,input.category,input.baseXp,input.specialtyAtAward,input.specialtyCategoryAtAward,input.bonusEligibleAtAward?1:0,input.specialtyBonusXp,input.effectiveXp,input.comment,input.createdAt,input.teacherId,input.requestId,input.fingerprint); const after=derive(db,input.studentId,input.academicYearId).annualEffectiveXp; transitions(db,input.studentId,input.academicYearId,before,after,input.id,null); return findEvent(db,input.teacherId,input.id)!; }
export function reverseEvent(db: Database.Database, input: any) { const event=findEvent(db,input.teacherId,input.eventId); if (!event) throw new ApiError('NOT_FOUND',404,'XP evidence not found.'); if (event.reversedAt) throw new ApiError('VALIDATION_FAILED',422,'XP evidence is already reversed.'); const before=derive(db,event.studentId,event.academicYearId).annualEffectiveXp; db.prepare(`INSERT INTO xp_evidence_reversals (id,owner_teacher_id,target_event_id,reason,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?)`).run(input.id,input.teacherId,event.id,input.reason,input.createdAt,input.teacherId,input.requestId,input.fingerprint); const after=derive(db,event.studentId,event.academicYearId).annualEffectiveXp; transitions(db,event.studentId,event.academicYearId,before,after,event.id,input.id); return { id:input.id,targetEventId:event.id,reason:input.reason,createdAt:input.createdAt,studentId:event.studentId,academicYearId:event.academicYearId }; }
export function summary(db: Database.Database, studentId: string, academicYearId: string) { return derive(db,studentId,academicYearId); }
export type GroupSummaryRow = { studentId:string; annualEffectiveXp:number; badges:string|null };
export function groupSummaryRows(db: Database.Database, groupId: string, academicYearId: string) {
  return db.prepare(`
    WITH active_events AS (
      SELECT e.id, e.student_id AS studentId, e.category, e.specialty_category_at_award AS specialtyCategoryAtAward, e.effective_xp AS effectiveXp
      FROM xp_evidence_events e
      LEFT JOIN xp_evidence_reversals r ON r.target_event_id=e.id
      WHERE e.academic_year_id=? AND r.id IS NULL
    ), totals AS (
      SELECT studentId, SUM(effectiveXp) AS annualEffectiveXp FROM active_events GROUP BY studentId
    ), active_badges AS (
      SELECT student_id AS studentId, group_concat(category || '|' || badge_label || '|' || first_unlocked_at, ';;') AS badges
      FROM xp_badge_unlocks WHERE academic_year_id=? AND active=1 GROUP BY student_id
    )
    SELECT s.id AS studentId, COALESCE(t.annualEffectiveXp,0) AS annualEffectiveXp, b.badges
    FROM students s
    LEFT JOIN totals t ON t.studentId=s.id
    LEFT JOIN active_badges b ON b.studentId=s.id
    WHERE s.group_id=?
    ORDER BY s.alias COLLATE NOCASE, s.id
  `).all(academicYearId, academicYearId, groupId) as GroupSummaryRow[];
}
export function listEvents(db: Database.Database, teacherId: string, studentId: string, yearId: string, cursor: {createdAt:string;id:string}|null, limit:number) { const rows=db.prepare(`${eventSelect} WHERE e.owner_teacher_id=? AND e.student_id=? AND e.academic_year_id=? ${cursor ? 'AND (e.created_at < ? OR (e.created_at = ? AND e.id < ?))' : ''} ORDER BY e.created_at DESC,e.id DESC LIMIT ?`).all(...(cursor?[teacherId,studentId,yearId,cursor.createdAt,cursor.createdAt,cursor.id,limit+1]:[teacherId,studentId,yearId,limit+1])) as EventRow[]; return rows; }
export function listTransitions(db: Database.Database, after:number, limit:number) { return db.prepare(`SELECT t.id,t.sequence,t.unlock_id AS unlockId,u.student_id AS studentId,u.academic_year_id AS academicYearId,u.level,t.kind,t.occurred_at AS occurredAt FROM xp_level_grant_transitions t JOIN xp_level_unlocks u ON u.id=t.unlock_id WHERE t.sequence>? ORDER BY t.sequence LIMIT ?`).all(after,limit) as XpLevelGrantTransition[]; }
