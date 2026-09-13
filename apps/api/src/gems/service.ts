import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import { runImmediateTransaction, assertGemSourceTransaction, type GemSourceTx } from '../services/transactions.js';
import { balances } from './repository.js';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const now = () => new Date().toISOString();
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (message: string, status: 404|409|422 = 422): never => { throw new ApiError(status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION_FAILED', status, message); };
function key(value: string) { if (!uuidV4.test(value)) fail('A UUID v4 Idempotency-Key is required.'); return value; }
function ownerContext(db: Database.Database, owner: string, studentId: string, contextId: string) {
  const row = db.prepare(`SELECT s.id AS studentId,g.id AS groupId,g.academic_year_id AS academicYearId,c.id AS contextId
    FROM students s JOIN groups g ON g.id=s.group_id JOIN assessment_contexts c ON c.group_id=g.id
    WHERE s.id=? AND c.id=? AND g.owner_teacher_id=? AND c.archived_at IS NULL`).get(studentId, contextId, owner) as any;
  if (!row) fail('Student or assessment context not found.', 404);
  return row as { studentId:string; groupId:string; academicYearId:string; contextId:string };
}
function movement(db: Database.Database, input: { id?:string; studentId:string; academicYearId:string; currency:string; amount:1|-1; kind:string; sourceKind:string; sourceId:string; family:string; unit:number; correctionOf?:string|null; owner:string; requestKey?:string; requestFingerprint?:string }) {
  const pairs: Record<string, { amount: 1|-1; source: string[]; predecessor: string[] }> = {
    GRANT: { amount: 1, source: ['XP_TRANSITION','RT_REVISION','RESULT_REWARD'], predecessor: [] },
    REVOKE: { amount: -1, source: ['XP_TRANSITION','RT_REVISION'], predecessor: ['GRANT','REINSTATE'] },
    REINSTATE: { amount: 1, source: ['XP_TRANSITION','RT_REVISION'], predecessor: ['REVOKE'] },
    CORRECTION: { amount: -1, source: ['RESULT_REWARD'], predecessor: ['GRANT'] },
    SPEND: { amount: -1, source: ['REDEMPTION'], predecessor: [] },
    SPEND_REVERSAL: { amount: 1, source: ['REDEMPTION'], predecessor: ['SPEND'] },
  };
  const rule = pairs[input.kind];
  if (!rule || rule.amount !== input.amount || !rule.source.includes(input.sourceKind) || (rule.predecessor.length === 0) !== (input.correctionOf == null)) fail('Gem movement matrix is invalid.', 409);
  if (!/^[A-Z_]+$/.test(input.currency) || !['EMERALD','RUBY','DIAMOND'].includes(input.currency) || input.unit < 1 || !Number.isSafeInteger(input.unit)) fail('Gem movement lineage is invalid.', 409);
  if (input.sourceKind === 'XP_TRANSITION' && !/^xp:unlock:[^:]+$/.test(input.family)) fail('Gem source family is invalid.', 409);
  if (input.sourceKind === 'RT_REVISION' && !/^rt:entitlement:[^:]+$/.test(input.family)) fail('Gem source family is invalid.', 409);
  if (input.sourceKind === 'RESULT_REWARD' && !/^result:reward:[^:]+$/.test(input.family)) fail('Gem source family is invalid.', 409);
  if (input.sourceKind === 'REDEMPTION' && !/^redemption:[^:]+$/.test(input.family)) fail('Gem source family is invalid.', 409);
  if (input.correctionOf != null) {
    const predecessor = db.prepare('SELECT * FROM gem_ledger WHERE id=?').get(input.correctionOf) as any;
    if (!predecessor || !rule.predecessor.includes(predecessor.movement_kind) || predecessor.student_id !== input.studentId || predecessor.academic_year_id !== input.academicYearId || predecessor.currency !== input.currency || predecessor.owner_teacher_id !== input.owner || predecessor.source_kind !== input.sourceKind || predecessor.source_family_id !== input.family || predecessor.unit_index !== input.unit) fail('Gem predecessor lineage is invalid.', 409);
    if (db.prepare('SELECT 1 FROM gem_ledger WHERE correction_of_id=?').get(input.correctionOf)) fail('Gem predecessor already has a successor.', 409);
  }
  const id = input.id ?? randomUUID();
  db.prepare(`INSERT INTO gem_ledger (id,student_id,academic_year_id,currency,amount,movement_kind,source_kind,source_id,source_family_id,unit_index,correction_of_id,request_key,request_fingerprint,created_at,owner_teacher_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,input.studentId,input.academicYearId,input.currency,input.amount,input.kind,input.sourceKind,input.sourceId,input.family,input.unit,input.correctionOf ?? null,input.requestKey ?? null,input.requestFingerprint ?? null,now(),input.owner);
  return id;
}
function activeFunding(db: Database.Database, studentId: string, yearId: string, currency: string, cost: number) {
  return db.prepare(`SELECT l.* FROM gem_ledger l LEFT JOIN gem_spend_allocations a ON a.funding_movement_id=l.id AND a.released_at IS NULL
    WHERE l.student_id=? AND l.academic_year_id=? AND l.currency=? AND l.amount=1 AND l.movement_kind IN ('GRANT','REINSTATE') AND a.id IS NULL
    AND NOT EXISTS (SELECT 1 FROM gem_ledger n WHERE n.correction_of_id=l.id) ORDER BY l.created_at,l.id LIMIT ?`).all(studentId,yearId,currency,cost) as any[];
}
function ownedStudent(db: Database.Database, owner: string, studentId: string) {
  const row = db.prepare(`SELECT s.id,g.academic_year_id AS academicYearId FROM students s JOIN groups g ON g.id=s.group_id WHERE s.id=? AND g.owner_teacher_id=?`).get(studentId,owner) as any;
  if (!row) fail('Student not found.',404); return row as {id:string;academicYearId:string};
}
function tier(score: string): { tier:'NONE'|'EMERALD_1'|'EMERALD_2'|'RUBY_1'|'DIAMOND_1'; currency:string; units:number } {
  if (!/^(?:0|[1-9](?:[0-9])?)(?:\.[0-9]{1,2})?$/.test(score)) fail('Score is invalid.');
  const value = Number(score); if (!Number.isFinite(value) || value < 0 || value > 10) fail('Score is invalid.');
  if (value < 7) return { tier:'NONE',currency:'EMERALD',units:0 }; if (value < 8) return { tier:'EMERALD_1',currency:'EMERALD',units:1 }; if (value < 9) return { tier:'EMERALD_2',currency:'EMERALD',units:2 }; if (value < 10) return { tier:'RUBY_1',currency:'RUBY',units:1 }; return { tier:'DIAMOND_1',currency:'DIAMOND',units:1 };
}
export function resultReward(db: Database.Database, owner: string, studentId: string, contextId: string, score: string, requestKey: string) {
  key(requestKey); tier(score);
  return runImmediateTransaction(db, `result:${owner}:${requestKey}`, tx => {
    const context = ownerContext(tx.db, owner, studentId, contextId); const selected = tier(score);
    const fp = fingerprint({operation:'RESULT_GRANT',ownerTeacherId:owner,studentId,academicYearId:context.academicYearId,assessmentContextId:contextId,tier:selected.tier,currency:selected.currency,units:selected.units});
    const prior = tx.db.prepare('SELECT * FROM gem_result_reward_operations WHERE owner_teacher_id=? AND request_key=?').get(owner, requestKey) as any;
    if (prior) { if (prior.request_fingerprint !== fp) fail('Idempotency key conflict.',409); const ids = JSON.parse(prior.movement_ids); if (!Array.isArray(ids)) fail('Result reward linkage is invalid.',409); return {status:200,replay:true,id:prior.reward_id,tier:prior.resulting_tier,state:'ACTIVE'}; }
    const existing = tx.db.prepare('SELECT * FROM gem_result_rewards WHERE student_id=? AND assessment_context_id=? AND academic_year_id=?').get(studentId,contextId,context.academicYearId) as any;
    if (existing) { if (existing.owner_teacher_id !== owner || existing.tier !== selected.tier || existing.state !== 'ACTIVE') fail('Result reward conflicts with existing state.',409); const operation = tx.db.prepare("SELECT * FROM gem_result_reward_operations WHERE reward_id=? AND operation='GRANT'").get(existing.id) as any; if (!operation || operation.request_fingerprint !== fp) fail('Result reward fingerprint conflicts.',409); return {status:200,replay:true,id:existing.id,tier:existing.tier,state:existing.state}; }
    const rewardId=randomUUID(); const operationId=randomUUID(); const ids:string[]=[]; const sourceId=`result:operation:${operationId}`; const family=`result:reward:${rewardId}`;
    tx.db.prepare('INSERT INTO gem_result_rewards (id,student_id,assessment_context_id,academic_year_id,tier,state,owner_teacher_id,created_at) VALUES (?,?,?,?,?,?,?,?)').run(rewardId,studentId,contextId,context.academicYearId,selected.tier,'ACTIVE',owner,now());
    for(let unit=1;unit<=selected.units;unit++) ids.push(movement(tx.db,{studentId,academicYearId:context.academicYearId,currency:selected.currency,amount:1,kind:'GRANT',sourceKind:'RESULT_REWARD',sourceId,family,unit,owner,requestKey,requestFingerprint:fp}));
    tx.db.prepare('INSERT INTO gem_result_reward_operations (operation_id,reward_id,owner_teacher_id,operation,request_key,request_fingerprint,prior_tier,resulting_tier,movement_ids,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(operationId,rewardId,owner,'GRANT',requestKey,fp,'NONE',selected.tier,JSON.stringify(ids),now()); return {status:201,replay:false,id:rewardId,tier:selected.tier,state:'ACTIVE'};
  });
}
export function spend(db: Database.Database, owner: string, studentId: string, contextId: string, rewardId: string, requestKey: string) {
  key(requestKey); return runImmediateTransaction(db, `spend:${owner}:${requestKey}`, tx => { const context=ownerContext(tx.db,owner,studentId,contextId); const prior=tx.db.prepare('SELECT * FROM gem_advantage_redemptions WHERE owner_teacher_id=? AND request_key=?').get(owner,requestKey) as any; if(prior){if(prior.student_id!==studentId||prior.assessment_context_id!==contextId)fail('Idempotency key conflict.',409);return {status:200,replay:true,id:prior.id,currency:prior.currency,cost:prior.cost,state:prior.state};} const reward=tx.db.prepare('SELECT id,currency,cost FROM gem_reward_catalogue WHERE id=?').get(rewardId) as any; if(!reward) fail('Reward not found.',404); const funds=activeFunding(tx.db,studentId,context.academicYearId,reward.currency,reward.cost); if(funds.length!==reward.cost) fail('Insufficient gem balance.',409); const fundingMovementIds=funds.map(f=>f.id); const fp=fingerprint({operation:'SPEND',ownerTeacherId:owner,studentId,academicYearId:context.academicYearId,assessmentContextId:contextId,catalogueRewardId:rewardId,currency:reward.currency,cost:reward.cost,fundingMovementIds}); const occupied=tx.db.prepare('SELECT * FROM gem_advantage_redemptions WHERE student_id=? AND assessment_context_id=? AND academic_year_id=?').get(studentId,contextId,context.academicYearId) as any; if(occupied){if(occupied.request_fingerprint!==fp)fail('Advantage already used with another semantic request.',409);return {status:200,replay:true,id:occupied.id,currency:occupied.currency,cost:occupied.cost,state:occupied.state};} const id=randomUUID(); tx.db.prepare('INSERT INTO gem_advantage_redemptions (id,student_id,assessment_context_id,academic_year_id,currency,cost,request_key,request_fingerprint,state,owner_teacher_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,studentId,contextId,context.academicYearId,reward.currency,reward.cost,requestKey,fp,'ACTIVE',owner,now()); for(let index=0;index<funds.length;index++){const spendId=movement(tx.db,{studentId,academicYearId:context.academicYearId,currency:reward.currency,amount:-1,kind:'SPEND',sourceKind:'REDEMPTION',sourceId:`redemption:spend:${id}`,family:`redemption:${id}`,unit:index+1,owner,requestKey,requestFingerprint:fp}); tx.db.prepare('INSERT INTO gem_spend_allocations (id,redemption_id,funding_movement_id,spend_movement_id,created_at) VALUES (?,?,?,?,?)').run(randomUUID(),id,funds[index].id,spendId,now());} return {status:201,replay:false,id,currency:reward.currency,cost:reward.cost,state:'ACTIVE'}; });
}
  export function reverseSpend(db: Database.Database, owner: string, redemptionId: string, reason: string, requestKey: string) { key(requestKey); if(!reason.trim()||reason.length>500) fail('A reversal reason is required.'); return runImmediateTransaction(db, `reverse:${owner}:${requestKey}`, tx=>{const row=tx.db.prepare('SELECT * FROM gem_advantage_redemptions WHERE id=? AND owner_teacher_id=?').get(redemptionId,owner) as any;if(!row)fail('Redemption not found.',404); const all=tx.db.prepare('SELECT * FROM gem_spend_allocations WHERE redemption_id=? ORDER BY spend_movement_id').all(redemptionId) as any[]; const links=all.map(a=>({fundingMovementId:a.funding_movement_id,spendMovementId:a.spend_movement_id,unitIndex:(tx.db.prepare('SELECT unit_index AS unitIndex FROM gem_ledger WHERE id=?').get(a.spend_movement_id) as any)?.unitIndex})); const fp=fingerprint({operation:'SPEND_REVERSAL',redemptionId,ownerTeacherId:owner,studentId:row.student_id,academicYearId:row.academic_year_id,assessmentContextId:row.assessment_context_id,currency:row.currency,cost:row.cost,trigger:'MANUAL',reason,allocations:links}); const prior=tx.db.prepare('SELECT * FROM gem_advantage_redemptions WHERE owner_teacher_id=? AND reversal_request_key=?').get(owner,requestKey) as any; if(prior){if(prior.id!==redemptionId||prior.reversal_fingerprint!==fp)fail('Reversal request conflicts.',409);return {status:200,replay:true,redemptionId,state:'REVERSED'};} if(row.state==='REVERSED')fail('Redemption is already reversed.',409); const allocations=all.filter(a=>a.released_at===null);if(allocations.length!==row.cost)fail('Redemption allocation invariant failed.',409); const op=randomUUID(); for(const allocation of allocations){const unit=(tx.db.prepare('SELECT unit_index AS unitIndex FROM gem_ledger WHERE id=?').get(allocation.spend_movement_id) as any).unitIndex;const reversal=movement(tx.db,{studentId:row.student_id,academicYearId:row.academic_year_id,currency:row.currency,amount:1,kind:'SPEND_REVERSAL',sourceKind:'REDEMPTION',sourceId:`redemption:reversal:${op}`,family:`redemption:${redemptionId}`,unit,correctionOf:allocation.spend_movement_id,owner});tx.db.prepare("UPDATE gem_spend_allocations SET spend_reversal_movement_id=?,released_at=?,release_reason='ADVANTAGE_REVERSED' WHERE id=?").run(reversal,now(),allocation.id);}tx.db.prepare("UPDATE gem_advantage_redemptions SET state='REVERSED',reversal_operation_id=?,reversal_request_key=?,reversal_fingerprint=?,reversal_trigger='MANUAL',reversal_reason=?,reversed_at=? WHERE id=?").run(op,requestKey,fp,reason,now(),redemptionId);return {status:201,replay:false,redemptionId,state:'REVERSED'};}); }

function reverseForSource(tx: GemSourceTx, redemptionId: string, sourceId: string, owner: string) {
  const row = tx.db.prepare('SELECT * FROM gem_advantage_redemptions WHERE id=? AND owner_teacher_id=?').get(redemptionId, owner) as any;
  if (!row || row.state !== 'ACTIVE') fail('Redemption linkage is invalid.', 409);
  const allocations = tx.db.prepare('SELECT * FROM gem_spend_allocations WHERE redemption_id=? AND released_at IS NULL ORDER BY id').all(redemptionId) as any[];
  if (allocations.length !== row.cost) fail('Redemption allocation invariant failed.', 409);
  for (let index=0; index<allocations.length; index+=1) { const allocation=allocations[index]; const spend=tx.db.prepare('SELECT unit_index AS unitIndex FROM gem_ledger WHERE id=?').get(allocation.spend_movement_id) as {unitIndex:number}|undefined; if(!spend)fail('Redemption spend linkage is invalid.',409); const reversal=movement(tx.db,{studentId:row.student_id,academicYearId:row.academic_year_id,currency:row.currency,amount:1,kind:'SPEND_REVERSAL',sourceKind:'REDEMPTION',sourceId:`redemption:reversal:${sourceId}`,family:`redemption:${redemptionId}`,unit:spend!.unitIndex,correctionOf:allocation.spend_movement_id,owner}); tx.db.prepare("UPDATE gem_spend_allocations SET spend_reversal_movement_id=?,released_at=?,release_reason='ENTITLEMENT_REVOKED' WHERE id=?").run(reversal,now(),allocation.id); }
  tx.db.prepare("UPDATE gem_advantage_redemptions SET state='REVERSED',reversal_operation_id=?,reversal_fingerprint=?,reversal_trigger='SOURCE_REVOKED',reversed_at=? WHERE id=?").run(sourceId,fingerprint({operation:'SPEND_REVERSAL',redemptionId,ownerTeacherId:owner,studentId:row.student_id,academicYearId:row.academic_year_id,assessmentContextId:row.assessment_context_id,currency:row.currency,cost:row.cost,trigger:'SOURCE_REVOKED',reason:null,allocations:[]}),now(),redemptionId);
}

export function correctResultReward(db: Database.Database, owner: string, rewardId: string, reason: string, requestKey: string) {
  key(requestKey); if (!reason.trim() || reason.length > 500) fail('A correction reason is required.');
  return runImmediateTransaction(db, `result-correction:${owner}:${requestKey}`, tx => {
    const reward=tx.db.prepare('SELECT * FROM gem_result_rewards WHERE id=? AND owner_teacher_id=?').get(rewardId,owner) as any; if(!reward)fail('Reward not found.',404);
    const grants=tx.db.prepare("SELECT * FROM gem_ledger WHERE source_kind='RESULT_REWARD' AND source_family_id=? AND movement_kind='GRANT' ORDER BY unit_index").all(`result:reward:${rewardId}`) as any[];
    const grantIds=grants.map(g=>g.id); const fp=fingerprint({operation:'RESULT_CORRECTION',ownerTeacherId:owner,rewardId,studentId:reward.student_id,academicYearId:reward.academic_year_id,assessmentContextId:reward.assessment_context_id,priorTier:reward.tier,resultingState:'REVERSED',reason,grantMovementIds:grantIds});
    const prior=tx.db.prepare("SELECT * FROM gem_result_reward_operations WHERE reward_id=? AND operation='CORRECTION'").get(rewardId) as any; if(prior){if(prior.request_key!==requestKey||prior.request_fingerprint!==fp)fail('Reward correction is already finalized.',409);return {status:200,replay:true,rewardId,state:'REVERSED'};}
    const affected=[...new Set(grants.flatMap(grant=>(tx.db.prepare('SELECT redemption_id AS id FROM gem_spend_allocations WHERE funding_movement_id=? AND released_at IS NULL').all(grant.id) as any[]).map(row=>row.id)))]; for(const redemptionId of affected)reverseForSource(tx,redemptionId,`source-revocation:${redemptionId}`,owner);
    const operationId=randomUUID(); const ids:string[]=[]; for(const grant of grants) ids.push(movement(tx.db,{studentId:reward.student_id,academicYearId:reward.academic_year_id,currency:grant.currency,amount:-1,kind:'CORRECTION',sourceKind:'RESULT_REWARD',sourceId:`result:operation:${operationId}`,family:`result:reward:${rewardId}`,unit:grant.unit_index,correctionOf:grant.id,owner,requestKey,requestFingerprint:fp}));
    tx.db.prepare("UPDATE gem_result_rewards SET state='REVERSED' WHERE id=?").run(rewardId); tx.db.prepare('INSERT INTO gem_result_reward_operations (operation_id,reward_id,owner_teacher_id,operation,request_key,request_fingerprint,reason,prior_tier,resulting_tier,movement_ids,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(operationId,rewardId,owner,'CORRECTION',requestKey,fp,reason,reward.tier,reward.tier,JSON.stringify(ids),now()); return {status:201,replay:false,rewardId,state:'REVERSED'};
  });
}

const xpStream = 'xp-level-grant-transitions';

function xpTransitionState(db: Database.Database, transitionId: string) {
  return db.prepare(`SELECT t.id,t.sequence,t.unlock_id AS unlockId,t.kind,t.source_event_id AS sourceEventId,
      t.source_reversal_id AS sourceReversalId,u.student_id AS studentId,u.academic_year_id AS academicYearId,
      u.level,g.owner_teacher_id AS ownerTeacherId
    FROM xp_level_grant_transitions t
    JOIN xp_level_unlocks u ON u.id=t.unlock_id
    JOIN students s ON s.id=u.student_id
    JOIN groups g ON g.id=s.group_id WHERE t.id=?`).get(transitionId) as any;
}

function assertXpSource(db: Database.Database, transition: any) {
  if (!['GRANT', 'REVOKE', 'REINSTATE'].includes(transition.kind)) fail('XP transition kind is invalid.', 409);
  const event = transition.sourceEventId ? db.prepare('SELECT id,owner_teacher_id AS owner,student_id AS student,academic_year_id AS year FROM xp_evidence_events WHERE id=?').get(transition.sourceEventId) as any : null;
  const reversal = transition.sourceReversalId ? db.prepare(`SELECT r.id,r.owner_teacher_id AS owner,e.student_id AS student,e.academic_year_id AS year
    FROM xp_evidence_reversals r JOIN xp_evidence_events e ON e.id=r.target_event_id WHERE r.id=?`).get(transition.sourceReversalId) as any : null;
  if ((transition.kind === 'REVOKE') !== Boolean(reversal) || (transition.kind !== 'REVOKE') !== Boolean(event) || event && reversal ||
      (event && (event.owner !== transition.ownerTeacherId || event.student !== transition.studentId || event.year !== transition.academicYearId)) ||
      (reversal && (reversal.owner !== transition.ownerTeacherId || reversal.student !== transition.studentId || reversal.year !== transition.academicYearId))) {
    fail('XP transition source lineage is invalid.', 409);
  }
}

function xpReceiptFingerprint(input: { transitionId:string; sequence:number; unlockId:string; kind:string; sourceEventId:string|null; sourceReversalId:string|null; ownerTeacherId:string; studentId:string; academicYearId:string; level:number; ledgerSourceId:string; sourceFamilyId:string; unitIndex:number; amount:1|-1; movementKind:string; predecessorMovementId:string|null }) {
  return fingerprint({stream:xpStream,...input});
}

function assertXpReceipt(db: Database.Database, transition: any, receipt: any, movementRow: any) {
  if (!receipt || !movementRow || receipt.movement_id !== movementRow.id) fail('XP transition receipt linkage is invalid.', 409);
  const ledgerSourceId = `xp:transition:${transition.id}`;
  const expected = xpReceiptFingerprint({transitionId:transition.id,sequence:transition.sequence,unlockId:transition.unlockId,kind:transition.kind,sourceEventId:transition.sourceEventId ?? null,sourceReversalId:transition.sourceReversalId ?? null,ownerTeacherId:transition.ownerTeacherId,studentId:transition.studentId,academicYearId:transition.academicYearId,level:transition.level,ledgerSourceId,sourceFamilyId:`xp:unlock:${transition.unlockId}`,unitIndex:1,amount:transition.kind === 'GRANT' || transition.kind === 'REINSTATE' ? 1 : -1,movementKind:transition.kind,predecessorMovementId:movementRow.correction_of_id ?? null});
  if (receipt.sequence !== transition.sequence || receipt.unlock_id !== transition.unlockId || receipt.kind !== transition.kind || receipt.source_event_id !== (transition.sourceEventId ?? null) || receipt.source_reversal_id !== (transition.sourceReversalId ?? null) || receipt.fingerprint !== expected || movementRow.source_kind !== 'XP_TRANSITION' || movementRow.source_id !== ledgerSourceId || movementRow.source_family_id !== `xp:unlock:${transition.unlockId}` || movementRow.unit_index !== 1 || movementRow.amount !== (transition.kind === 'GRANT' || transition.kind === 'REINSTATE' ? 1 : -1) || movementRow.movement_kind !== transition.kind || movementRow.student_id !== transition.studentId || movementRow.academic_year_id !== transition.academicYearId || movementRow.owner_teacher_id !== transition.ownerTeacherId) fail('XP transition receipt does not match authoritative lineage.', 409);
}

function currentSource(db: Database.Database, family: string, sourceKind = 'XP_TRANSITION') {
  return db.prepare(`SELECT l.* FROM gem_ledger l WHERE l.source_kind=? AND l.source_family_id=? AND l.unit_index=1
    AND NOT EXISTS (SELECT 1 FROM gem_ledger successor WHERE successor.correction_of_id=l.id)`).get(sourceKind, family) as any;
}

function validUtc(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

type RtConsumption = null | { consumerId: string; grantId: string; consumedRevision: number };
function rtConsumption(row: any): RtConsumption {
  return row.consumer_id === null ? null : { consumerId: row.consumer_id, grantId: row.grant_id, consumedRevision: row.consumed_revision };
}

function assertRtConsumption(db: Database.Database, consumption: RtConsumption, entitlement: any, family: string, owner: string, year: string) {
  if (!consumption) return;
  if (consumption.consumedRevision < 1 || consumption.consumedRevision > entitlement.revision || !consumption.consumerId || !consumption.grantId) fail('RT consumption linkage is invalid.', 409);
  const grant = db.prepare('SELECT * FROM gem_ledger WHERE id=?').get(consumption.grantId) as any;
  if (!grant || grant.source_kind !== 'RT_REVISION' || grant.source_family_id !== family || grant.unit_index !== 1 || !['GRANT', 'REINSTATE'].includes(grant.movement_kind) || grant.amount !== 1 || grant.student_id !== entitlement.student_id || grant.academic_year_id !== year || grant.owner_teacher_id !== owner) fail('RT consumption linkage is invalid.', 409);
}

function assertRtMovement(db: Database.Database, id: string | null, expected: { kind: string; predecessor: string | null; sourceId: string; family: string; studentId: string; year: string; owner: string } | null) {
  if (!expected) { if (id !== null) fail('RT revision movement linkage is invalid.', 409); return; }
  const row = id ? db.prepare('SELECT * FROM gem_ledger WHERE id=?').get(id) as any : null;
  const amount = expected.kind === 'GRANT' || expected.kind === 'REINSTATE' ? 1 : -1;
  if (!row || row.source_kind !== 'RT_REVISION' || row.source_id !== expected.sourceId || row.source_family_id !== expected.family || row.unit_index !== 1 || row.movement_kind !== expected.kind || row.amount !== amount || row.correction_of_id !== expected.predecessor || row.student_id !== expected.studentId || row.academic_year_id !== expected.year || row.currency !== 'EMERALD' || row.owner_teacher_id !== expected.owner) fail('RT revision movement linkage is invalid.', 409);
}

function assertXpCursor(db: Database.Database, lastSequence: number) {
  const receipts = db.prepare('SELECT COUNT(*) AS count, COALESCE(MAX(sequence),0) AS maxSequence FROM gem_xp_transition_receipts').get() as {count:number;maxSequence:number};
  const transitions = db.prepare('SELECT COUNT(*) AS count FROM xp_level_grant_transitions WHERE sequence BETWEEN 1 AND ?').get(lastSequence) as {count:number};
  if (receipts.maxSequence !== lastSequence || receipts.count !== lastSequence || transitions.count !== lastSequence || db.prepare('SELECT 1 FROM gem_xp_transition_receipts WHERE sequence > ? LIMIT 1').get(lastSequence)) fail('XP reconciliation cursor is inconsistent.', 409);
}

export function applyXp(tx: GemSourceTx, transitionIds: readonly string[]) {
  assertGemSourceTransaction(tx);
  const db = tx.db;
  const cursor = db.prepare('SELECT last_sequence AS lastSequence FROM gem_reconciliation_cursors WHERE stream=?').get(xpStream) as {lastSequence:number}|undefined;
  if (!cursor || !Number.isSafeInteger(cursor.lastSequence) || cursor.lastSequence < 0) fail('XP reconciliation cursor is invalid.', 409);
  const initialCursor = cursor!.lastSequence;
  assertXpCursor(db, initialCursor);
  let last = initialCursor;
  for (const transitionId of transitionIds) {
    const transition = xpTransitionState(db, transitionId);
    if (!transition) fail('XP transition not found.', 409);
    assertXpSource(db, transition);
    const family = `xp:unlock:${transition.unlockId}`;
    const existingReceipt = db.prepare('SELECT * FROM gem_xp_transition_receipts WHERE transition_id=?').get(transition.id) as any;
    const ledgerSourceId = `xp:transition:${transition.id}`;
    const existingMovement = db.prepare(`SELECT * FROM gem_ledger WHERE source_kind='XP_TRANSITION' AND source_id=? AND unit_index=1`).get(ledgerSourceId) as any;
    if (transition.sequence <= last) {
      if (!existingReceipt || !existingMovement) fail('XP transition receipt is missing.', 409);
      assertXpReceipt(db, transition, existingReceipt, existingMovement);
      const bySequence = db.prepare('SELECT transition_id FROM gem_xp_transition_receipts WHERE sequence=?').get(transition.sequence) as any;
      if (!bySequence || bySequence.transition_id !== transition.id) fail('XP transition sequence is inconsistent.', 409);
      continue;
    }
    if (transition.sequence !== last + 1 || existingReceipt || existingMovement) fail('XP transition sequence is not contiguous.', 409);
    const predecessor = currentSource(db, family);
    if (transition.kind === 'GRANT' && predecessor) fail('XP grant already has a source lineage.', 409);
    if (transition.kind === 'REINSTATE' && (!predecessor || predecessor.movement_kind !== 'REVOKE')) fail('XP reinstatement predecessor is invalid.', 409);
    if (transition.kind === 'REVOKE' && (!predecessor || !['GRANT','REINSTATE'].includes(predecessor.movement_kind))) fail('XP revocation predecessor is invalid.', 409);
    if (transition.kind === 'REVOKE') refundSourceAllocations(tx, predecessor.id, transition.ownerTeacherId, `xp-transition:${transition.id}`);
    const amount = transition.kind === 'GRANT' || transition.kind === 'REINSTATE' ? 1 : -1;
    const movementId = movement(db, { studentId:transition.studentId, academicYearId:transition.academicYearId, currency:'EMERALD', amount, kind:transition.kind, sourceKind:'XP_TRANSITION', sourceId:ledgerSourceId, family, unit:1, correctionOf:predecessor?.id ?? null, owner:transition.ownerTeacherId });
    const receiptFp = xpReceiptFingerprint({transitionId:transition.id,sequence:transition.sequence,unlockId:transition.unlockId,kind:transition.kind,sourceEventId:transition.sourceEventId ?? null,sourceReversalId:transition.sourceReversalId ?? null,ownerTeacherId:transition.ownerTeacherId,studentId:transition.studentId,academicYearId:transition.academicYearId,level:transition.level,ledgerSourceId,sourceFamilyId:family,unitIndex:1,amount,movementKind:transition.kind,predecessorMovementId:predecessor?.id ?? null});
    db.prepare('INSERT INTO gem_xp_transition_receipts (transition_id,sequence,unlock_id,kind,source_event_id,source_reversal_id,movement_id,fingerprint,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(transition.id,transition.sequence,transition.unlockId,transition.kind,transition.sourceEventId ?? null,transition.sourceReversalId ?? null,movementId,receiptFp,now());
    last = transition.sequence;
    db.prepare('UPDATE gem_reconciliation_cursors SET last_sequence=?,updated_at=? WHERE stream=?').run(last,now(),xpStream);
  }
  assertXpCursor(db, last);
}

function refundSourceAllocations(tx: GemSourceTx, fundingMovementId: string, owner: string, operationId: string) {
  const allocations = tx.db.prepare("SELECT a.*,r.student_id AS studentId,r.academic_year_id AS academicYearId,r.assessment_context_id,r.currency,r.cost,r.state FROM gem_spend_allocations a JOIN gem_advantage_redemptions r ON r.id=a.redemption_id WHERE a.funding_movement_id=? AND a.released_at IS NULL ORDER BY r.id,a.id").all(fundingMovementId) as any[];
  for (const allocation of allocations) {
    if (allocation.state !== 'ACTIVE') fail('RT allocation state is inconsistent.', 409);
    const spend = tx.db.prepare('SELECT unit_index AS unitIndex FROM gem_ledger WHERE id=?').get(allocation.spend_movement_id) as {unitIndex:number}|undefined;
    if (!spend || spend.unitIndex < 1) fail('Redemption spend linkage is invalid.', 409);
    const reversalOperationId = `source-revocation:${allocation.redemption_id}`;
    const reversalId = movement(tx.db, { studentId: allocation.studentId, academicYearId: allocation.academicYearId, currency: allocation.currency, amount: 1, kind: 'SPEND_REVERSAL', sourceKind: 'REDEMPTION', sourceId: `redemption:reversal:${reversalOperationId}`, family: `redemption:${allocation.redemption_id}`, unit: spend!.unitIndex, correctionOf: allocation.spend_movement_id, owner });
    tx.db.prepare("UPDATE gem_spend_allocations SET spend_reversal_movement_id=?,released_at=?,release_reason='ENTITLEMENT_REVOKED' WHERE id=? AND released_at IS NULL").run(reversalId, now(), allocation.id);
    tx.db.prepare("UPDATE gem_advantage_redemptions SET state='REVERSED',reversal_operation_id=?,reversal_fingerprint=?,reversal_trigger='SOURCE_REVOKED',reversed_at=? WHERE id=? AND state='ACTIVE'").run(reversalOperationId, fingerprint({ operation:'SPEND_REVERSAL',redemptionId: allocation.redemption_id,ownerTeacherId:owner,studentId:allocation.studentId,academicYearId:allocation.academicYearId,assessmentContextId:allocation.assessment_context_id,currency:allocation.currency,cost:allocation.cost,trigger:'SOURCE_REVOKED',reason:null,allocations:[] }), now(), allocation.redemption_id);
  }
}

export function applyRtStates(tx: GemSourceTx, entitlements: readonly any[], owner: string, year: string, baseline = false) {
  assertGemSourceTransaction(tx);
  for (const entitlement of entitlements) {
    const studentId = entitlement.student_id ?? entitlement.studentId;
    const termId = entitlement.term_id ?? entitlement.termId;
    const operationId = `rt-revision:${entitlement.id}:${entitlement.revision}`;
    const existing = tx.db.prepare('SELECT * FROM gem_reconciliation_revisions WHERE receipt_operation_id=?').get(operationId) as any;
    const state = entitlement.active ? 'ACTIVE' : 'INACTIVE';
    const prior = entitlement.revision > 1 ? tx.db.prepare('SELECT * FROM gem_reconciliation_revisions WHERE entitlement_id=? AND revision=?').get(entitlement.id, entitlement.revision - 1) as any : undefined;
    const beforeConsumption = prior && entitlement.consumer_id !== null ? rtConsumption(entitlement) : null;
    const afterConsumption = rtConsumption(entitlement);
    const family = `rt:entitlement:${entitlement.id}`;
    assertRtConsumption(tx.db, rtConsumption(entitlement), entitlement, family, owner, year);
    const byRevision = tx.db.prepare('SELECT receipt_operation_id AS operationId FROM gem_reconciliation_revisions WHERE entitlement_id=? AND revision=?').get(entitlement.id, entitlement.revision) as any;
    if (byRevision && byRevision.operationId !== operationId) fail('RT revision receipt identity conflicts.', 409);
    if (existing) {
      if (existing.entitlement_id !== entitlement.id || existing.revision !== entitlement.revision || existing.state !== state || !validUtc(existing.created_at) || existing.transaction_correlation_id === '') fail('RT revision receipt conflicts with entitlement state.', 409);
      if (entitlement.consumer_id !== null && !validUtc(entitlement.consumed_at)) fail('RT consumption linkage is invalid.', 409);
      assertRtMovement(tx.db, existing.movement_id, existing.movement_id ? { kind: state === 'ACTIVE' ? (prior?.state === 'INACTIVE' ? 'REINSTATE' : 'GRANT') : 'REVOKE', predecessor: existing.movement_id ? (state === 'ACTIVE' && prior?.state === 'INACTIVE' ? prior.movement_id : state === 'INACTIVE' ? prior?.movement_id ?? null : null) : null, sourceId: operationId, family, studentId, year, owner } : null);
      const expected = fingerprint({ receiptOperationId: operationId, entitlementId: entitlement.id, sourceKey: entitlement.source_key, sourceEntryId: entitlement.source_entry_id, ownerTeacherId: owner, studentId, academicYearId: year, termId, revision: entitlement.revision, state, consumptionBefore: beforeConsumption, movementKind: existing.movement_id ? (state === 'ACTIVE' ? (prior?.state === 'INACTIVE' ? 'REINSTATE' : 'GRANT') : 'REVOKE') : null, ledgerSourceId: operationId, sourceFamilyId: family, unitIndex: 1, predecessorMovementId: existing.movement_id ? (prior?.movement_id ?? null) : null, consumptionAfter: afterConsumption });
      if (existing.revision_fingerprint !== expected) fail('RT revision receipt fingerprint conflicts with authoritative state.', 409);
      continue;
    }
    if (!prior && entitlement.consumer_id !== null) fail('RT pre-baseline consumption linkage is invalid.', 409);
    if (entitlement.revision > 1 && (!prior || prior.state === (entitlement.active ? 'ACTIVE' : 'INACTIVE')) && !(baseline && !prior && entitlement.consumer_id === null)) fail('RT revision continuity or CAS is invalid.', 409);
    let movementId: string | null = null; let movementKind: string | null = null; let predecessorMovementId: string | null = null; let consumptionBefore: RtConsumption = null; let consumptionAfter: RtConsumption = rtConsumption(entitlement);
    if (entitlement.active) {
      if (entitlement.consumer_id === null) {
        movementId = randomUUID();
        const cas = tx.db.prepare('UPDATE rt_streak_emerald_entitlements SET consumer_id=?,grant_id=?,consumed_revision=?,consumed_at=? WHERE id=? AND active=1 AND consumer_id IS NULL AND revision=?').run(operationId, movementId, entitlement.revision, now(), entitlement.id, entitlement.revision);
        if (cas.changes !== 1) fail('RT entitlement CAS failed.', 409);
        consumptionAfter = { consumerId: operationId, grantId: movementId, consumedRevision: entitlement.revision };
        movementKind = 'GRANT';
        movementId = movement(tx.db, { id: movementId, studentId, academicYearId: year, currency: 'EMERALD', amount: 1, kind: 'GRANT', sourceKind: 'RT_REVISION', sourceId: operationId, family: `rt:entitlement:${entitlement.id}`, unit: 1, owner });
      } else {
        if (!prior || prior.state !== 'INACTIVE' || !prior.movement_id) fail('RT reinstatement predecessor is invalid.', 409);
        const tip = currentSource(tx.db, family, 'RT_REVISION'); if (!tip || tip.id !== prior.movement_id || tip.movement_kind !== 'REVOKE') fail('RT reinstatement predecessor is invalid.', 409);
        predecessorMovementId = prior.movement_id; movementKind = 'REINSTATE';
        movementId = movement(tx.db, { studentId, academicYearId: year, currency: 'EMERALD', amount: 1, kind: 'REINSTATE', sourceKind: 'RT_REVISION', sourceId: operationId, family: `rt:entitlement:${entitlement.id}`, unit: 1, correctionOf: predecessorMovementId, owner });
      }
    } else if (entitlement.consumer_id !== null) {
      if (!prior?.movement_id || prior.state !== 'ACTIVE') fail('RT revocation predecessor is invalid.', 409);
      const tip = currentSource(tx.db, family, 'RT_REVISION'); if (!tip || tip.id !== prior.movement_id || !['GRANT','REINSTATE'].includes(tip.movement_kind)) fail('RT revocation predecessor is invalid.', 409);
      consumptionBefore = { consumerId: entitlement.consumer_id, grantId: entitlement.grant_id, consumedRevision: entitlement.consumed_revision };
      refundSourceAllocations(tx, prior.movement_id, owner, operationId); predecessorMovementId = prior.movement_id; movementKind = 'REVOKE';
      movementId = movement(tx.db, { studentId, academicYearId: year, currency: 'EMERALD', amount: -1, kind: 'REVOKE', sourceKind: 'RT_REVISION', sourceId: operationId, family: `rt:entitlement:${entitlement.id}`, unit: 1, correctionOf: predecessorMovementId, owner });
    }
    const revisionFingerprint = fingerprint({ receiptOperationId: operationId, entitlementId: entitlement.id, sourceKey: entitlement.source_key, sourceEntryId: entitlement.source_entry_id, ownerTeacherId: owner, studentId, academicYearId: year, termId, revision: entitlement.revision, state, consumptionBefore, movementKind, ledgerSourceId: operationId, sourceFamilyId: family, unitIndex: 1, predecessorMovementId, consumptionAfter });
    tx.db.prepare('INSERT INTO gem_reconciliation_revisions (receipt_operation_id,entitlement_id,revision,state,transaction_correlation_id,movement_id,revision_fingerprint,created_at) VALUES (?,?,?,?,?,?,?,?)').run(operationId, entitlement.id, entitlement.revision, state, tx.correlationId, movementId, revisionFingerprint, now());
  }
}

export function applyRt(tx: GemSourceTx, studentId: string, termId: string) {
  const entitlements = tx.db.prepare('SELECT * FROM rt_streak_emerald_entitlements WHERE student_id=? AND term_id=? ORDER BY id').all(studentId, termId) as any[];
  const ownerRow = tx.db.prepare('SELECT g.owner_teacher_id AS owner, g.academic_year_id AS year FROM students s JOIN groups g ON g.id=s.group_id WHERE s.id=?').get(studentId) as { owner?: unknown; year?: unknown } | undefined;
  if (typeof ownerRow?.owner !== 'string' || typeof ownerRow.year !== 'string') fail('RT entitlement owner not found.', 409);
  return applyRtStates(tx, entitlements, String(ownerRow!.owner), String(ownerRow!.year));
}
