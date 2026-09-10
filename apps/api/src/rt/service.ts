import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import { getOwnedRealClassSessionContext } from '../calendar/service.js';
import { getOwnedAcademicYearGroupContext } from '../roster/calendar-context.js';
import { lockStudentGroupCorrection } from '../roster/service.js';
import { runTransaction } from '../services/transactions.js';
import { replayRt, type RtValue } from './domain.js';

type Tx = Database.Database;
type EntryInput = { studentId: string; value: RtValue };
const fail = (message: string, status = 422): never => { throw new ApiError(status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION_FAILED', status, message); };
const now = () => new Date().toISOString();
const keyIsUuidV4 = (key: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
const fingerprint = (sessionId: string, entries: EntryInput[]) => createHash('sha256').update(JSON.stringify({ operation: 'BULK_UPSERT', sessionId, entries: [...entries].sort((a, b) => a.studentId.localeCompare(b.studentId)) })).digest('hex');

function snapshotRoster(db: Tx, context: ReturnType<typeof getOwnedRealClassSessionContext>) {
  const count = (db.prepare('SELECT COUNT(*) AS count FROM real_class_session_rt_roster WHERE session_id=?').get(context.id) as { count: number }).count;
  if (count) return;
  const students = db.prepare('SELECT id FROM students WHERE group_id=? AND archived_at IS NULL ORDER BY id').all(context.groupId) as Array<{ id: string }>;
  const insert = db.prepare('INSERT INTO real_class_session_rt_roster (session_id,student_id,owner_teacher_id,academic_year_id,group_id,term_id) VALUES (?,?,?,?,?,?)');
  for (const student of students) insert.run(context.id, student.id, context.ownerTeacherId, context.academicYearId, context.groupId, context.termId);
  for (const student of students) lockStudentGroupCorrection(db, context.ownerTeacherId, student.id);
}

function reconcileEntitlements(db: Tx, studentId: string, termId: string, values: Array<{ id: string; value: RtValue; createdAt: string }>) {
  const eligible = new Set<string>(); let streak = 0;
  for (const entry of values) {
    if (entry.value === 'ABSENT') continue;
    if (entry.value === 10) { streak += 1; if (streak === 4) { eligible.add(entry.id); streak = 0; } } else streak = 0;
  }
  const existing = db.prepare('SELECT * FROM rt_streak_emerald_entitlements WHERE student_id=? AND term_id=? ORDER BY id').all(studentId, termId) as any[];
  const bySource = new Map(existing.map(row => [row.source_entry_id, row]));
  for (const entry of values.filter(value => eligible.has(value.id))) {
    if (!bySource.has(entry.id)) db.prepare(`INSERT INTO rt_streak_emerald_entitlements (id,source_key,source_entry_id,student_id,term_id,active,revision) VALUES (?,?,?,?,?,?,?)`).run(randomUUID(), `RT_STREAK:${entry.id}`, entry.id, studentId, termId, 1, 1);
  }
  for (const row of existing) {
    const active = eligible.has(row.source_entry_id) ? 1 : 0;
    if (active !== row.active) db.prepare('UPDATE rt_streak_emerald_entitlements SET active=?, revision=revision+1 WHERE id=?').run(active, row.id);
  }
}

const decodeValue = (value: string): RtValue => value === 'ABSENT' ? 'ABSENT' : Number(value) as 0 | 5 | 10;
function entriesForStudent(db: Tx, studentId: string, termId: string) { return (db.prepare('SELECT e.id,e.value,e.created_at AS createdAt FROM rt_entries e JOIN real_class_sessions s ON s.id=e.session_id WHERE e.student_id=? AND e.term_id=? ORDER BY s.started_at,s.id').all(studentId, termId) as Array<{ id:string; value:string; createdAt:string }>).map(entry => ({ ...entry, value: decodeValue(entry.value) })); }
function summary(db: Tx, studentId: string, termId: string) { const values = entriesForStudent(db, studentId, termId); const replay = replayRt(values.map(value => value.value)); return { studentId, termId, average: replay.average, energy: replay.energy, streak: replay.streak }; }

export function listEntries(db: Tx, owner: string, sessionId: string) {
  const context = getOwnedRealClassSessionContext(db, owner, sessionId); let roster = db.prepare('SELECT student_id AS studentId FROM real_class_session_rt_roster WHERE session_id=? ORDER BY student_id').all(sessionId);
  if (!roster.length) roster = db.prepare('SELECT id AS studentId FROM students WHERE group_id=? AND archived_at IS NULL ORDER BY id').all(context.groupId);
  const entries = (db.prepare('SELECT id,student_id AS studentId,value,created_at AS createdAt,updated_at AS updatedAt FROM rt_entries WHERE session_id=? ORDER BY student_id').all(sessionId) as Array<{ id: string; studentId: string; value: string; createdAt: string; updatedAt: string }>).map(entry => ({ ...entry, value: decodeValue(entry.value) }));
  return { sessionId, termId: context.termId, students: roster, entries };
}

export function upsertEntries(db: Tx, owner: string, sessionId: string, entries: EntryInput[], idempotencyKey: string) {
  if (!keyIsUuidV4(idempotencyKey)) fail('Idempotency-Key must be a UUID-v4.');
  if (!entries.length) fail('Entries must not be empty.');
  if (new Set(entries.map(entry => entry.studentId)).size !== entries.length) fail('Each student may appear only once.');
  const context = getOwnedRealClassSessionContext(db, owner, sessionId);
  return runTransaction(db, () => {
    const fp = fingerprint(sessionId, entries); const prior = db.prepare('SELECT * FROM rt_requests WHERE owner_teacher_id=? AND idempotency_key=?').get(owner, idempotencyKey) as any;
    if (prior) { if (prior.fingerprint !== fp) fail('Idempotency key was already used for another request.', 409); return { status: 200, ...listEntries(db, owner, sessionId), replay: true }; }
    if (context.endedAt) fail('Closed sessions are read-only.', 409);
    snapshotRoster(db, context);
    const roster = new Set((db.prepare('SELECT student_id AS id FROM real_class_session_rt_roster WHERE session_id=?').all(sessionId) as Array<{id:string}>).map(row => row.id));
    if (entries.some(entry => !roster.has(entry.studentId))) fail('All entries must belong to the session roster.');
    const stamp = now();
    for (const entry of entries) {
      const current = db.prepare('SELECT id FROM rt_entries WHERE session_id=? AND student_id=?').get(sessionId, entry.studentId) as {id:string}|undefined;
      if (current) db.prepare('UPDATE rt_entries SET value=?,updated_at=? WHERE id=?').run(String(entry.value), stamp, current.id);
      else db.prepare('INSERT INTO rt_entries (id,session_id,student_id,term_id,value,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(randomUUID(), sessionId, entry.studentId, context.termId, String(entry.value), stamp, stamp);
      reconcileEntitlements(db, entry.studentId, context.termId, entriesForStudent(db, entry.studentId, context.termId));
    }
    db.prepare('INSERT INTO rt_requests (id,owner_teacher_id,idempotency_key,operation,session_id,fingerprint,created_at) VALUES (?,?,?,?,?,?,?)').run(randomUUID(), owner, idempotencyKey, 'BULK_UPSERT', sessionId, fp, stamp);
    return { status: 201, ...listEntries(db, owner, sessionId), replay: false };
  });
}

export function summaries(db: Tx, owner: string, groupId: string, academicYearId: string, termId: string) {
  const { group } = getOwnedAcademicYearGroupContext(db, owner, academicYearId, groupId);
  const term = db.prepare('SELECT id FROM academic_terms WHERE id=? AND academic_year_id=?').get(termId, academicYearId); if (!term) fail('Term not found.', 404);
  const students = db.prepare('SELECT id FROM students WHERE group_id=? ORDER BY archived_at IS NOT NULL, alias COLLATE NOCASE, id').all(group.id) as Array<{id:string}>;
  return { groupId, academicYearId, termId, summaries: students.map(student => summary(db, student.id, termId)) };
}

type EntitlementRow = { id: string; sourceKey: `RT_STREAK:${string}`; sourceEntryId: string; studentId: string; termId: string; active: number; revision: number; consumerId: string | null; grantId: string | null; consumedRevision: number | null; consumedAt: string | null };
export type RtStreakEmeraldEntitlementState = Omit<EntitlementRow, 'active' | 'consumerId' | 'grantId' | 'consumedRevision' | 'consumedAt'> & { active: boolean; consumption: null | { consumerId: string; grantId: string; consumedRevision: number; consumedAt: string } };
const entitlementState = (row: EntitlementRow): RtStreakEmeraldEntitlementState => ({ id: row.id, sourceKey: row.sourceKey, sourceEntryId: row.sourceEntryId, studentId: row.studentId, termId: row.termId, active: Boolean(row.active), revision: row.revision, consumption: row.consumerId === null ? null : { consumerId: row.consumerId, grantId: row.grantId!, consumedRevision: row.consumedRevision!, consumedAt: row.consumedAt! } });

export const RtStreakEmeraldEntitlementPort = {
  listForReconciliation(studentId: string, termId: string, db: Tx) { return (db.prepare('SELECT id,source_key AS sourceKey,source_entry_id AS sourceEntryId,student_id AS studentId,term_id AS termId,active,revision,consumer_id AS consumerId,grant_id AS grantId,consumed_revision AS consumedRevision,consumed_at AS consumedAt FROM rt_streak_emerald_entitlements WHERE student_id=? AND term_id=? ORDER BY id').all(studentId, termId) as EntitlementRow[]).map(entitlementState); },
  getForReconciliation(id: string, db: Tx) { const row = db.prepare('SELECT id,source_key AS sourceKey,source_entry_id AS sourceEntryId,student_id AS studentId,term_id AS termId,active,revision,consumer_id AS consumerId,grant_id AS grantId,consumed_revision AS consumedRevision,consumed_at AS consumedAt FROM rt_streak_emerald_entitlements WHERE id=?').get(id) as EntitlementRow | undefined; return row ? entitlementState(row) : null; },
  consumeActive(id: string, expectedRevision: number, consumerId: string, grantId: string, db: Tx) {
    const result = db.prepare('UPDATE rt_streak_emerald_entitlements SET consumer_id=?,grant_id=?,consumed_revision=?,consumed_at=? WHERE id=? AND active=1 AND consumer_id IS NULL AND revision=?').run(consumerId, grantId, expectedRevision, now(), id, expectedRevision);
    if (result.changes !== 1) fail('Entitlement is stale, inactive, or already consumed.', 409);
    return RtStreakEmeraldEntitlementPort.getForReconciliation(id, db);
  },
};
