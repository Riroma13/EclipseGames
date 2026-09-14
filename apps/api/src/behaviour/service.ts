import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import type { BehaviourSessionStartPort } from '../calendar/service.js';
import { applyDelta, derivePolicy, effectiveActionDelta, type BehaviourState } from './domain.js';
import * as repository from './repository.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (code: 'NOT_FOUND'|'CONFLICT'|'VALIDATION_FAILED', status: number, message: string): never => { throw new ApiError(code, status, message); };
const stamp = () => new Date().toISOString();
const fingerprint = (operation:string, target:string, body:unknown) => createHash('sha256').update(JSON.stringify({ operation, target, body })).digest('hex');

function session(db:Database.Database, owner:string, sessionId:string) {
  const value = db.prepare('SELECT * FROM real_class_sessions WHERE id=? AND owner_teacher_id=?').get(sessionId, owner) as any;
  if (!value) fail('NOT_FOUND', 404, 'Real class session not found.');
  return value;
}
function rosterStudent(db:Database.Database, owner:string, sessionId:string, studentId:string) {
  const value = db.prepare(`SELECT r.*, s.archived_at FROM real_class_session_behaviour_roster r JOIN students s ON s.id=r.student_id WHERE r.session_id=? AND r.student_id=? AND r.owner_teacher_id=?`).get(sessionId, studentId, owner) as any;
  if (!value) fail('NOT_FOUND', 404, 'Behaviour resource not found.');
  return value;
}
function request(db:Database.Database, owner:string, key:string, operation:string, target:string, body:unknown) {
  if (!uuid.test(key)) fail('VALIDATION_FAILED', 422, 'Idempotency-Key must be a UUID-v4.');
  const found = db.prepare('SELECT * FROM behaviour_requests WHERE owner_teacher_id=? AND request_key=?').get(owner, key) as any;
  if (!found) return null;
  if (found.operation !== operation || found.fingerprint !== fingerprint(operation, target, body)) fail('CONFLICT', 409, 'Idempotency key was already used for another request.');
  return db.prepare('SELECT * FROM behaviour_actions WHERE id=?').get(found.target_id) as any ?? { id: found.target_id, replay: true };
}

function snapshotPort(): BehaviourSessionStartPort {
  return { onStarted(db, context, isReplay) {
    const current = db.prepare('SELECT behaviour_snapshot_version AS version FROM real_class_sessions WHERE id=? AND owner_teacher_id=?').get(context.sessionId, context.ownerTeacherId) as any;
    if (!current) fail('NOT_FOUND', 404, 'Real class session not found.');
    const students = db.prepare(`SELECT s.id FROM students s WHERE s.group_id=? AND s.archived_at IS NULL ORDER BY s.id`).all(context.groupId) as { id:string }[];
    const rows = db.prepare('SELECT student_id AS studentId,lives_at_start AS livesAtStart,inherited_action_id AS inheritedActionId,zero_source_action_id AS zeroSourceActionId FROM real_class_session_behaviour_roster WHERE session_id=? ORDER BY student_id').all(context.sessionId) as any[];
    if (isReplay || current.version === 1) {
      if (rows.length !== students.length || rows.some((row, index) => row.studentId !== students[index]?.id)) fail('CONFLICT', 409, 'Behaviour session snapshot lineage is inconsistent.');
      return;
    }
    for (const student of students) repository.snapshotLives(db, context.sessionId, student.id, context.ownerTeacherId, context.academicYearId, context.groupId, context.termId);
    db.prepare('UPDATE real_class_sessions SET behaviour_snapshot_version=1 WHERE id=? AND behaviour_snapshot_version IS NULL').run(context.sessionId);
  }};
}

export const sessionStartPort = snapshotPort();

function stateDto(db:Database.Database, sessionId:string, studentId:string, lives:number, actionId:string|null = null) {
  const policy = derivePolicy(lives);
  const incident = db.prepare('SELECT status FROM behaviour_incidents WHERE session_id=? AND student_id=?').get(sessionId, studentId) as { status:'ACTIVE'|'CORRECTED' }|undefined;
  const proposal = db.prepare("SELECT id,status FROM behaviour_proposals WHERE session_id=? AND student_id=? ORDER BY created_at DESC,id DESC LIMIT 1").get(sessionId, studentId) as { id:string; status:'OPEN'|'DISMISSED'|'WITHDRAWN' }|undefined;
  return { sessionId, studentId, lives, state: policy.state, restrictions: { bonusAllowed: policy.bonusAllowed, receiveGemAllowed: policy.receiveGemAllowed, spendGemAllowed: policy.spendGemAllowed, specialActivityAllowed: policy.specialActivityAllowed }, lastActionId: actionId, incidentStatus: incident?.status ?? null, proposal: proposal ?? null };
}

export function getState(db:Database.Database, owner:string, sessionId:string) {
  const s = session(db, owner, sessionId);
  const roster = db.prepare('SELECT student_id AS studentId,lives_at_start AS livesAtStart FROM real_class_session_behaviour_roster WHERE session_id=? ORDER BY student_id').all(sessionId) as any[];
  return { sessionId, students: roster.map(row => { const actions = db.prepare('SELECT id,kind,delta FROM behaviour_actions WHERE session_id=? AND student_id=? ORDER BY created_at,id').all(sessionId,row.studentId) as any[]; const lives = actions.reduce((value, action) => value + effectiveActionDelta(action.kind, action.delta), row.livesAtStart); return stateDto(db, s.id, row.studentId, lives, actions.at(-1)?.id ?? null); }) };
}

function writeAction(db:Database.Database, owner:string, sessionId:string, studentId:string, kind:'LOSS'|'RESTORE', key:string) {
  const body = { studentId, sessionId, kind }; const replay = request(db, owner, key, kind, studentId, body); if (replay) return { status: 200, value: replay.replay ? getStudentState(db, sessionId, studentId) : replay };
  const s = session(db, owner, sessionId); if (s.ended_at) fail('CONFLICT', 409, 'Closed sessions cannot be changed.'); const roster = rosterStudent(db, owner, sessionId, studentId); if (roster.archived_at) fail('VALIDATION_FAILED', 422, 'Student is not an active roster member.');
  const result = repository.appendAction(db, { ownerTeacherId:owner, academicYearId:s.academic_year_id, groupId:s.group_id, sessionId, studentId, kind, delta:kind === 'LOSS' ? -1 : 1, lineage:s.id, requestKey:key, fingerprint:fingerprint(kind,studentId,body), createdAt:stamp() });
  db.prepare('INSERT INTO behaviour_requests (id,owner_teacher_id,request_key,operation,fingerprint,target_id,created_at) VALUES (?,?,?,?,?,?,?)').run(randomUUID(),owner,key,kind,fingerprint(kind,studentId,body),result.id,stamp());
  updateEpisode(db, s, studentId, result.id, result.currentLives, kind);
  return { status:201, value:getStudentState(db, sessionId, studentId) };
}
function getStudentState(db:Database.Database, sessionId:string, studentId:string) { const row = db.prepare('SELECT lives_at_start AS livesAtStart FROM real_class_session_behaviour_roster WHERE session_id=? AND student_id=?').get(sessionId,studentId) as any; if (!row) fail('NOT_FOUND',404,'Behaviour resource not found.'); const actions = db.prepare('SELECT id,kind,delta FROM behaviour_actions WHERE session_id=? AND student_id=? ORDER BY created_at,id').all(sessionId,studentId) as any[]; const lives=actions.reduce((value,action)=>value+effectiveActionDelta(action.kind,action.delta),row.livesAtStart); return stateDto(db,sessionId,studentId,lives,actions.at(-1)?.id??null); }
function updateEpisode(db:Database.Database, s:any, studentId:string, actionId:string, lives:number, kind:string) {
  const incident = db.prepare('SELECT * FROM behaviour_incidents WHERE session_id=? AND student_id=?').get(s.id,studentId) as any;
  if (lives <= 1 && !incident) db.prepare('INSERT INTO behaviour_incidents VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),s.id,studentId,s.owner_teacher_id,'ACTIVE',actionId,null,stamp());
  if (lives > 1 && incident?.status === 'ACTIVE') db.prepare('UPDATE behaviour_incidents SET status=\'CORRECTED\',corrected_by_action_id=? WHERE id=?').run(actionId,incident.id);
  if (lives === 0) { const state=repository.findState(db,studentId,s.academic_year_id); if (state?.activeZeroSourceActionId===actionId || !db.prepare('SELECT 1 FROM behaviour_proposals WHERE session_id=? AND student_id=? AND status=\'OPEN\'').get(s.id,studentId)) db.prepare('INSERT OR IGNORE INTO behaviour_proposals (id,session_id,student_id,owner_teacher_id,zero_source_action_id,status,created_at,dismissed_at) VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),s.id,studentId,s.owner_teacher_id,actionId,'OPEN',stamp(),null); }
  if (lives > 0) db.prepare("UPDATE behaviour_proposals SET status='WITHDRAWN' WHERE session_id=? AND student_id=? AND status='OPEN'").run(s.id,studentId);
}

export function loseLife(db:Database.Database, owner:string, sessionId:string, studentId:string, key:string) { return db.transaction(() => writeAction(db,owner,sessionId,studentId,'LOSS',key))(); }
export function restoreLife(db:Database.Database, owner:string, sessionId:string, studentId:string, key:string) { return db.transaction(() => writeAction(db,owner,sessionId,studentId,'RESTORE',key))(); }

export function correctAction(db:Database.Database, owner:string, actionId:string, key:string) { return db.transaction(() => { const original=db.prepare('SELECT * FROM behaviour_actions WHERE id=? AND owner_teacher_id=?').get(actionId,owner) as any; if(!original) fail('NOT_FOUND',404,'Behaviour action not found.'); const body={actionId}; const replay=request(db,owner,key,'CORRECTION',actionId,body); if(replay)return {status:200,value:getStudentState(db,original.session_id,original.student_id)}; const s=session(db,owner,original.session_id); const latest=db.prepare('SELECT id FROM behaviour_actions WHERE session_id=? AND student_id=? ORDER BY created_at DESC,id DESC LIMIT 1').get(original.session_id,original.student_id) as any; if(latest?.id!==actionId) fail('CONFLICT',409,'Only the latest effective action can be corrected.'); const result=repository.appendAction(db,{ownerTeacherId:owner,academicYearId:original.academic_year_id,groupId:original.group_id,sessionId:original.session_id,studentId:original.student_id,kind:'CORRECTION',delta:original.delta,lineage:s.id,requestKey:key,fingerprint:fingerprint('CORRECTION',actionId,body),correctionOf:actionId,createdAt:stamp()}); db.prepare('INSERT INTO behaviour_requests VALUES (?,?,?,?,?,?,?)').run(randomUUID(),owner,key,'CORRECTION',fingerprint('CORRECTION',actionId,body),result.id,stamp()); updateEpisode(db,s,original.student_id,result.id,result.currentLives,'CORRECTION'); return {status:201,value:getStudentState(db,original.session_id,original.student_id)}; })(); }

export function dismissProposal(db:Database.Database, owner:string, proposalId:string, key:string) { return db.transaction(() => { const p=db.prepare('SELECT * FROM behaviour_proposals WHERE id=? AND owner_teacher_id=?').get(proposalId,owner) as any; if(!p)fail('NOT_FOUND',404,'Behaviour proposal not found.'); const body={proposalId}; const replay=request(db,owner,key,'DISMISSAL',proposalId,body); if(replay)return {status:200,value:proposalDto(p)}; if(p.status!=='OPEN')fail('CONFLICT',409,'Behaviour proposal is no longer open.'); db.prepare("UPDATE behaviour_proposals SET status='DISMISSED',dismissed_at=? WHERE id=? AND status='OPEN'").run(stamp(),proposalId); db.prepare('INSERT INTO behaviour_requests VALUES (?,?,?,?,?,?,?)').run(randomUUID(),owner,key,'DISMISSAL',fingerprint('DISMISSAL',proposalId,body),proposalId,stamp()); return {status:201,value:proposalDto({...p,status:'DISMISSED'})}; })(); }
function proposalDto(p:any) { return {id:p.id,sessionId:p.session_id,studentId:p.student_id,status:p.status}; }
