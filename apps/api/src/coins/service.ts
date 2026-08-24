import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import * as repository from './repository.js';

const fixedRewards = ['standard-assessment-advantage','exceptional-assessment-advantage'];
const now = () => new Date().toISOString();
const fingerprint = (value: unknown) => JSON.stringify(value, Object.keys(value as object).sort());
function ownedStudent(db: Database.Database, teacherId: string, studentId: string) {
  const row=db.prepare(`SELECT s.id,s.group_id AS groupId,s.archived_at AS studentArchivedAt,g.academic_year_id AS academicYearId,y.archived_at AS yearArchivedAt FROM students s JOIN groups g ON g.id=s.group_id JOIN academic_years y ON y.id=g.academic_year_id WHERE s.id=? AND g.owner_teacher_id=?`).get(studentId,teacherId) as any;
  if(!row) throw new ApiError('NOT_FOUND',404,'Student not found.'); return row;
}
function writableContext(db: Database.Database, teacherId: string, contextId: string) {
  const row=db.prepare(`SELECT c.id,c.group_id AS groupId,c.name,c.archived_at AS archivedAt,g.owner_teacher_id AS ownerTeacherId,g.academic_year_id AS academicYearId FROM assessment_contexts c JOIN groups g ON g.id=c.group_id WHERE c.id=? AND g.owner_teacher_id=?`).get(contextId,teacherId) as any;
  if(!row) throw new ApiError('NOT_FOUND',404,'Assessment context not found.'); if(row.archivedAt) throw new ApiError('VALIDATION_FAILED',422,'Archived assessment contexts are read-only.'); return row;
}
export function rewards(db: Database.Database) { return db.prepare("SELECT id,name,cost,type FROM coin_rewards WHERE id IN (?,?) ORDER BY cost").all(...fixedRewards); }
export function summary(db: Database.Database, teacherId: string, studentId: string) { const student=ownedStudent(db,teacherId,studentId); return { studentId, academicYearId:student.academicYearId, balance:repository.balance(db,studentId,student.academicYearId) }; }
export function contexts(db: Database.Database, teacherId: string, groupId: string) { return db.prepare('SELECT c.id,c.group_id AS groupId,c.name,c.archived_at AS archivedAt FROM assessment_contexts c JOIN groups g ON g.id=c.group_id WHERE c.group_id=? AND g.owner_teacher_id=? ORDER BY c.created_at,c.id').all(groupId,teacherId); }
export function createContext(db: Database.Database, teacherId: string, groupId: string, name: string) {
  const group=db.prepare('SELECT g.id,g.academic_year_id AS academicYearId,y.archived_at AS yearArchivedAt FROM groups g JOIN academic_years y ON y.id=g.academic_year_id WHERE g.id=? AND g.owner_teacher_id=?').get(groupId,teacherId) as any;
  if(!group) throw new ApiError('NOT_FOUND',404,'Group not found.');
  if(group.yearArchivedAt) throw new ApiError('VALIDATION_FAILED',422,'Archived academic years are read-only.');
  const id=randomUUID(); const createdAt=now(); db.prepare('INSERT INTO assessment_contexts (id,group_id,name,created_at) VALUES (?,?,?,?)').run(id,groupId,name.trim(),createdAt);
  return {id,groupId,name:name.trim(),archivedAt:null};
}
export function grantManual(db: Database.Database, teacherId: string, studentId: string, academicYearId: string, source: string) {
  const student=ownedStudent(db,teacherId,studentId);
  if(student.academicYearId!==academicYearId) throw new ApiError('NOT_FOUND',404,'Student not found.');
  if(student.studentArchivedAt || student.yearArchivedAt) throw new ApiError('VALIDATION_FAILED',422,'Archived students and academic years are read-only.');
  return repository.grant(db,{studentId,academicYearId,source});
}
export function spend(db: Database.Database, teacherId: string, studentId: string, contextId: string, rewardId: string, requestKey?: string) {
  const student=ownedStudent(db,teacherId,studentId), context=writableContext(db,teacherId,contextId);
  if(student.studentArchivedAt || student.yearArchivedAt) throw new ApiError('VALIDATION_FAILED',422,'Archived students and academic years are read-only.');
  if(context.academicYearId!==student.academicYearId || context.groupId!==student.groupId) throw new ApiError('NOT_FOUND',404,'Assessment context not found.');
  const reward=db.prepare('SELECT id,name,cost,type FROM coin_rewards WHERE id=? AND type=\'ASSESSMENT_ADVANTAGE\'').get(rewardId) as any; if(!reward) throw new ApiError('NOT_FOUND',404,'Reward not found.');
  if(!requestKey || !/^\w{8}-\w{4}-4\w{3}-[89ab]\w{3}-\w{12}$/i.test(requestKey)) throw new ApiError('VALIDATION_FAILED',422,'A UUID v4 Idempotency-Key header is required.');
  const requestFingerprint=fingerprint({studentId,contextId,rewardId});
  const replay=db.prepare('SELECT * FROM advantage_redemptions WHERE owner_teacher_id=? AND client_request_id=?').get(teacherId,requestKey) as any;
  if(replay) { if(replay.request_fingerprint!==requestFingerprint) throw new ApiError('CONFLICT',409,'Idempotency-Key was already used for a different request.'); return { id:replay.id,studentId:replay.student_id,assessmentContextId:replay.assessment_context_id,rewardId:replay.reward_id,cost:replay.cost,createdAt:replay.created_at,reversedAt:replay.reversed_at,replay:true }; }
  if(db.prepare('SELECT id FROM advantage_redemptions WHERE student_id=? AND assessment_context_id=?').get(studentId,contextId)) throw new ApiError('CONFLICT',409,'An advantage already exists for this assessment.');
  return db.transaction(() => { const id=randomUUID(), debit=repository.debit(db,{studentId,academicYearId:student.academicYearId,amount:reward.cost,redemptionId:id}), grants=repository.eligibleGrants(db,studentId,student.academicYearId,reward.cost); if(grants.length!==reward.cost) throw new ApiError('INTERNAL_ERROR',500,'Coin allocation invariant failed.'); const createdAt=now(); db.prepare('INSERT INTO advantage_redemptions (id,student_id,assessment_context_id,reward_id,cost,debit_ledger_id,created_at,owner_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,studentId,contextId,rewardId,reward.cost,debit,createdAt,teacherId,requestKey,requestFingerprint); for(const grant of grants) db.prepare('INSERT INTO coin_spend_allocations (id,redemption_id,grant_ledger_entry_id,created_at) VALUES (?,?,?,?)').run(randomUUID(),id,grant.id,createdAt); repository.assertActiveAllocations(db,id,reward.cost); return {id,studentId,assessmentContextId:contextId,rewardId,cost:reward.cost,createdAt,reversedAt:null,replay:false}; })();
}
export function reverse(db: Database.Database, teacherId: string, redemptionId: string) { const row=db.prepare(`SELECT r.*,s.group_id AS groupId,g.owner_teacher_id AS ownerTeacherId,g.academic_year_id AS academicYearId FROM advantage_redemptions r JOIN students s ON s.id=r.student_id JOIN groups g ON g.id=s.group_id WHERE r.id=? AND g.owner_teacher_id=?`).get(redemptionId,teacherId) as any; if(!row) throw new ApiError('NOT_FOUND',404,'Redemption not found.'); if(row.reversed_at) throw new ApiError('CONFLICT',409,'Redemption is already reversed.'); return db.transaction(() => { const refund=repository.refund(db,{studentId:row.student_id,academicYearId:row.academicYearId,amount:row.cost,redemptionId}); repository.releaseAllocations(db,redemptionId); const reversedAt=now(); db.prepare('UPDATE advantage_redemptions SET reversal_ledger_id=?,reversed_at=? WHERE id=?').run(refund,reversedAt,redemptionId); return {redemptionId,rewardId:row.reward_id,cost:row.cost,trigger:'MANUAL',refundLedgerEntryId:refund,reversedAt}; })(); }

export function reverseForEntitlement(db: Database.Database, grantId: string, source='LEVEL_ENTITLEMENT_REVOKE', sourceTransitionId?: string) {
  const grant=db.prepare('SELECT student_id AS studentId,academic_year_id AS academicYearId FROM coin_ledger WHERE id=?').get(grantId) as any;
  if(!grant) return null;
  const allocation=repository.activeRedemptionForGrant(db,grantId);
  if(allocation) { const row=db.prepare('SELECT * FROM advantage_redemptions WHERE id=?').get(allocation.redemptionId) as any; if(!row.reversed_at) { const refund=repository.refund(db,{studentId:grant.studentId,academicYearId:grant.academicYearId,amount:row.cost,redemptionId:row.id}); repository.releaseAllocations(db,row.id); db.prepare('UPDATE advantage_redemptions SET reversal_ledger_id=?,reversed_at=? WHERE id=?').run(refund,now(),row.id); } }
  return repository.compensate(db,{studentId:grant.studentId,academicYearId:grant.academicYearId,grantId,source,sourceTransitionId});
}
