import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { b01Warning, closeRt, orderSnapshotStudents, staleReasons, type RtEvidence, type TermCloseStudent } from './domain.js';

export type CloseContext = { ownerTeacherId: string; academicYearId: string; groupId: string; calendarId: string; termId: string; yearArchived: boolean; yearLabel: string; groupName: string; termCode: 'T1' | 'T2' | 'T3' };
export type Readiness = ReturnType<typeof readReadiness>;

const lineage = (db: Database.Database, owner: string, year: string, group: string, term: string): CloseContext | null => db.prepare(`SELECT g.owner_teacher_id ownerTeacherId,g.academic_year_id academicYearId,g.id groupId,t.calendar_id calendarId,t.id termId,y.archived_at yearArchived,y.label yearLabel,g.name groupName,t.code termCode FROM groups g JOIN academic_years y ON y.id=g.academic_year_id JOIN academic_terms t ON t.academic_year_id=y.id AND t.owner_teacher_id=y.owner_teacher_id WHERE g.id=? AND g.owner_teacher_id=? AND y.id=? AND t.id=?`).get(group, owner, year, term) as CloseContext | null;
const rtFor = (db: Database.Database, studentId: string, termId: string): RtEvidence[] => (db.prepare(`SELECT e.id,e.value FROM rt_entries e JOIN real_class_sessions s ON s.id=e.session_id WHERE e.student_id=? AND e.term_id=? ORDER BY s.started_at,s.id,e.id`).all(studentId, termId) as Array<{ id: string; value: string }>).map((row) => ({ id: row.id, value: row.value as RtEvidence['value'] }));
const studentsFor = (db: Database.Database, context: CloseContext): TermCloseStudent[] => (db.prepare(`SELECT s.id studentId,s.real_name realName,e.id evaluationId,e.state rubricState,e.current_snapshot_version snapshotVersion,ss.grade_milli gradeMilli FROM students s LEFT JOIN observation_rubric_evaluations e ON e.student_id=s.id AND e.term_id=? LEFT JOIN observation_rubric_snapshots ss ON ss.evaluation_id=e.id AND ss.version=e.current_snapshot_version WHERE s.group_id=? AND s.archived_at IS NULL ORDER BY s.id`).all(context.termId, context.groupId) as any[]).map((row) => ({ studentId: row.studentId, realName: row.realName, evaluationId: row.evaluationId ?? '', evaluationSnapshotVersion: row.snapshotVersion ?? 0, gradeMilli: row.gradeMilli ?? 0, rt: rtFor(db, row.studentId, context.termId), rubricState: row.rubricState ?? null, snapshotVersion: row.snapshotVersion ?? null } as TermCloseStudent & { rubricState: string | null; snapshotVersion: number | null }));

export function ownedContext(db: Database.Database, owner: string, year: string, group: string, term: string) { return lineage(db, owner, year, group, term); }
export function readReadiness(db: Database.Database, owner: string, year: string, group: string, term: string) {
  const context = lineage(db, owner, year, group, term);
  if (!context) return null;
  const rows = studentsFor(db, context) as Array<TermCloseStudent & { rubricState: string | null; snapshotVersion: number | null }>;
  const blockers = rows.filter((row) => row.rubricState !== 'CLOSED' || row.snapshotVersion === null).map((row) => ({ studentId: row.studentId, reason: 'M5_NOT_CLOSED' }));
  const closure = db.prepare('SELECT c.id,c.state,c.revision,c.current_snapshot_version currentSnapshotVersion,s.closed_at closedAt FROM group_term_closures c LEFT JOIN group_term_close_snapshots s ON s.closure_id=c.id AND s.version=c.current_snapshot_version WHERE c.owner_teacher_id=? AND c.academic_year_id=? AND c.group_id=? AND c.term_id=?').get(owner, year, group, term) as any;
  const b01Count = (db.prepare(`SELECT COUNT(*) AS count FROM xp_evidence_events e JOIN students s ON s.id=e.student_id WHERE s.group_id=? AND s.archived_at IS NULL AND e.academic_year_id=? AND e.term_id IS NULL`).get(group, year) as { count: number }).count;
  return { context, rows, activeCount: rows.length, readyCount: rows.length - blockers.length, ready: rows.length > 0 && blockers.length === 0, blockers, b01Count, b01Warning: b01Warning(b01Count), closure };
}

export function currentSnapshotLineage(db: Database.Database, closureId: string) {
  const snapshot = db.prepare('SELECT * FROM group_term_close_snapshots WHERE closure_id=? ORDER BY version DESC LIMIT 1').get(closureId) as any;
  if (!snapshot) return null;
  const students = db.prepare('SELECT student_id studentId,evaluation_id evaluationId,evaluation_snapshot_version version FROM group_term_close_students WHERE snapshot_id=? ORDER BY ordinal').all(snapshot.id) as any[];
  const evidence = db.prepare('SELECT student_id studentId,entry_id id,value FROM group_term_close_rt_evidence WHERE snapshot_id=? ORDER BY rowid').all(snapshot.id) as any[];
  return { cohort: students.map((row) => row.studentId), rubric: students.map((row) => ({ studentId: row.studentId, version: row.version, state: 'CLOSED' })), rt: evidence.map((row) => ({ id: row.id, value: row.value })) };
}

export function snapshotForDownload(db: Database.Database, owner: string, year: string, group: string, term: string, version: number) {
  return db.prepare(`SELECT s.xlsx_bytes xlsxBytes,s.xlsx_sha256 xlsxSha256,s.xlsx_length xlsxLength,s.version,s.closed_at closedAt,y.label yearLabel,g.name groupName,t.code termCode FROM group_term_close_snapshots s JOIN group_term_closures c ON c.id=s.closure_id JOIN academic_years y ON y.id=c.academic_year_id JOIN groups g ON g.id=c.group_id JOIN academic_terms t ON t.id=c.term_id WHERE c.owner_teacher_id=? AND c.academic_year_id=? AND c.group_id=? AND c.term_id=? AND s.version=?`).get(owner, year, group, term, version) as any;
}

export function staleReasonsFor(db: Database.Database, closureId: string) {
  const saved = currentSnapshotLineage(db, closureId); if (!saved) return [];
  const closure = db.prepare('SELECT owner_teacher_id owner,academic_year_id year,group_id groupId,term_id term FROM group_term_closures WHERE id=?').get(closureId) as any;
  if (!closure) return [];
  const current = readReadiness(db, closure.owner, closure.year, closure.groupId, closure.term);
  if (!current) return ['COHORT_CHANGED'];
  const currentRubric = current.rows.map((row: any) => ({ studentId: row.studentId, version: row.snapshotVersion ?? 0, state: row.rubricState ?? 'OPEN' }));
  const currentRt = current.rows.flatMap((row: any) => row.rt);
  return staleReasons(saved, { cohort: current.rows.map((row: any) => row.studentId), rubric: currentRubric, rt: currentRt });
}

export function closeSnapshot(db: Database.Database, context: CloseContext, closureId: string, version: number, actor: string, bytes = Buffer.alloc(0), priorVersion: number | null = null, sourceRows?: TermCloseStudent[]) {
  const rows = orderSnapshotStudents(sourceRows ?? studentsFor(db, context));
  const snapshotId = randomUUID(); const stamp = new Date().toISOString();
  db.prepare('INSERT INTO group_term_close_snapshots (id,closure_id,version,prior_version,cohort_count,closed_by_teacher_id,closed_at,xlsx_bytes,xlsx_sha256,xlsx_length) VALUES (?,?,?,?,?,?,?,?,?,?)').run(snapshotId, closureId, version, priorVersion, rows.length, actor, stamp, bytes, createHash('sha256').update(bytes).digest('hex'), bytes.length);
  const studentInsert = db.prepare('INSERT INTO group_term_close_students (id,snapshot_id,student_id,ordinal,real_name,evaluation_id,evaluation_snapshot_version,grade_milli,rt_sum,rt_evaluated_count) VALUES (?,?,?,?,?,?,?,?,?,?)');
  const evidenceInsert = db.prepare('INSERT INTO group_term_close_rt_evidence (id,snapshot_id,student_id,entry_id,value) VALUES (?,?,?,?,?)');
  rows.forEach((row, index) => { const rt = closeRt(row.rt); studentInsert.run(randomUUID(), snapshotId, row.studentId, index + 1, row.realName, row.evaluationId, row.evaluationSnapshotVersion, row.gradeMilli, rt.sum, rt.evaluatedCount); row.rt.forEach((entry) => evidenceInsert.run(randomUUID(), snapshotId, row.studentId, entry.id, entry.value)); });
  return { snapshotId, version, rows };
}
