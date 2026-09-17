import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import { runImmediateTransaction } from '../services/transactions.js';
import { allocateBoutiqueSpend } from '../gems/service.js';
import { balances } from '../gems/repository.js';
import { canSpendGem, derivePolicy } from '../behaviour/domain.js';
import { categoryForSpecialty, getSummary } from '../xp/service.js';
import * as roster from '../roster/service.js';
import { avatarCatalogue } from '../avatar-core/catalogue.js';
import * as repo from './repository.js';
import { itemForPurchase, mapItem, boutiqueItems, statusFor } from './domain.js';
import type { BoutiquePurchaseResponse, BoutiqueStateDto } from '@eclipse/contracts';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stamp = () => new Date().toISOString();
const fail = (code: any, status: number, message: string): never => { throw new ApiError(code, status, message); };
const fp = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function key(value: string) { if (!uuidV4.test(value)) fail('VALIDATION_FAILED', 422, 'A UUID v4 Idempotency-Key is required.'); }
function context(db: Database.Database, owner: string, studentId: string, yearId: string) { return repo.ownedContext(db, owner, studentId, yearId) ?? fail('NOT_FOUND',404,'Student not found.'); }
function localDate() { return new Date().toISOString().slice(0, 10); }
function lives(db: Database.Database, owner: string, c: any, sessionId: string|null) {
  const active = db.prepare('SELECT id FROM real_class_sessions WHERE owner_teacher_id=? AND academic_year_id=? AND group_id=? AND ended_at IS NULL').get(owner,c.academicYearId,c.groupId) as {id:string}|undefined;
  if (sessionId === null) {
    if (active) fail('BOUTIQUE_SESSION_REQUIRED',409,'An active session ID is required.');
    const state = db.prepare('SELECT current_lives AS lives FROM behaviour_student_state WHERE student_id=? AND academic_year_id=?').get(c.studentId,c.academicYearId) as {lives:number}|undefined;
    return state?.lives ?? 4;
  }
  const session = db.prepare('SELECT id FROM real_class_sessions WHERE id=? AND owner_teacher_id=? AND academic_year_id=? AND group_id=? AND ended_at IS NULL').get(sessionId,owner,c.academicYearId,c.groupId);
  if (!session || !db.prepare('SELECT 1 FROM real_class_session_behaviour_roster WHERE session_id=? AND student_id=?').get(sessionId,c.studentId)) fail('CONFLICT',409,'The active session does not include this student.');
  const start = db.prepare('SELECT lives_at_start AS lives FROM real_class_session_behaviour_roster WHERE session_id=? AND student_id=?').get(sessionId,c.studentId) as {lives:number};
  const actions = db.prepare('SELECT kind,delta FROM behaviour_actions WHERE session_id=? AND student_id=? ORDER BY created_at,id').all(sessionId,c.studentId) as Array<{kind:'LOSS'|'RESTORE'|'CORRECTION';delta:number}>;
  return actions.reduce((value, action) => value + (action.kind === 'CORRECTION' ? -action.delta : action.delta), start.lives);
}
function term(db: Database.Database, c: any) { return repo.currentTerm(db,c.academicYearId,localDate()) ?? fail('BOUTIQUE_TERM_UNAVAILABLE',409,'No canonical boutique term is currently available.'); }

export function read(db: Database.Database, owner: string, studentId: string, yearId: string): BoutiqueStateDto {
  const c=context(db,owner,studentId,yearId); const summary=getSummary(db,owner,studentId,yearId); const t=repo.currentTerm(db,yearId,localDate());
  const owned=new Set(repo.purchases(db,studentId,yearId).map(row=>row.itemId));
  const profile=db.prepare('SELECT v.* FROM avatar_profiles p JOIN avatar_profile_versions v ON v.profile_student_id=p.student_id AND v.revision=p.current_revision WHERE p.student_id=?').get(studentId) as any;
  const specialtyCategory=categoryForSpecialty(c.specialty); const profileIds=new Set([profile?.hair_id,profile?.feature_id,profile?.clothing_id,profile?.accessory_id,profile?.frame_id,profile?.background_id]);
  return { studentId, academicYearId:yearId, catalogueVersion:avatarCatalogue.version, currentTerm:t?.code ?? null, emeraldBalance:balances(db,studentId,yearId).balances.EMERALD, editable:!c.studentArchived&&!c.yearArchived, items:boutiqueItems.map(({item,category}) => { const access=item.access; if(access.kind!=='BOUTIQUE') throw new Error('Invalid catalogue'); return mapItem({itemId:item.id,category,label:item.label,cost:access.cost,minLevel:access.minLevel,requiredSpecialtyCategory:access.requiredSpecialtyCategory,availableFromTerm:access.availableFromTerm,owned:owned.has(item.id),equipped:profileIds.has(item.id),currentTerm:t?.code??null,level:summary.level,specialtyCategory}); }) };
}

export function buy(db: Database.Database, owner: string, studentId: string, yearId: string, itemId: string, sessionId: string|null, requestKey: string): { status:number; value:BoutiquePurchaseResponse } {
  key(requestKey);
  return runImmediateTransaction(db, `boutique:${owner}:${requestKey}`, tx => {
    const c=context(tx.db,owner,studentId,yearId); const item=itemForPurchase(itemId) ?? fail('VALIDATION_FAILED',422,'Unknown boutique item.'); const access=item.access;
    const fingerprint=fp({operation:'PURCHASE',ownerTeacherId:owner,studentId,academicYearId:yearId,itemId,sessionId,term:repo.currentTerm(tx.db,yearId,localDate())?.code??null});
    const prior=repo.purchaseByKey(tx.db,owner,requestKey);
    if(prior){ if(prior.fingerprint!==fingerprint) fail('IDEMPOTENCY_CONFLICT',409,'Idempotency key was already used for another request.'); const p=tx.db.prepare('SELECT * FROM boutique_purchases WHERE id=?').get(prior.purchase_id) as any; return {status:200,value:{purchaseId:p.id,studentId:p.student_id,academicYearId:p.academic_year_id,itemId:p.item_id,currency:'EMERALD',cost:p.cost,emeraldBalance:prior.resulting_emerald_balance,purchasedAt:p.purchased_at,replay:true}}; }
    if(c.studentArchived||c.yearArchived) fail('CONFLICT',409,'Archived students and academic years are read-only.');
    const t=term(tx.db,c); const summary=getSummary(tx.db,owner,studentId,yearId); const specialtyCategory=categoryForSpecialty(c.specialty); const status=statusFor(itemId,t.code,summary.level,specialtyCategory); if(status!=='AVAILABLE') fail(status==='LOCKED_TERM'?'BOUTIQUE_TERM_UNAVAILABLE':'CONFLICT',409,'Boutique item is not currently available.');
    if(repo.purchase(tx.db,studentId,yearId,itemId)) fail('DUPLICATE_PURCHASE',409,'Boutique item is already owned.');
    const currentLives=lives(tx.db,owner,c,sessionId); if(!canSpendGem(currentLives)) fail('BEHAVIOUR_RESTRICTED',409,'Gem spending is restricted by behaviour policy.');
    roster.lockStudentGroupCorrection(tx.db,owner,studentId); const purchaseId=randomUUID(); const purchasedAt=stamp();
    tx.db.prepare(`INSERT INTO boutique_purchases (id,owner_teacher_id,student_id,academic_year_id,term_id,item_id,catalogue_version,currency,cost,min_level,required_specialty_category,available_from_term,level_at_purchase,specialty_category_at_purchase,purchased_at,actor_teacher_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(purchaseId,owner,studentId,yearId,t.id,itemId,avatarCatalogue.version,'EMERALD',access.cost,access.minLevel,access.requiredSpecialtyCategory,access.availableFromTerm,summary.level,specialtyCategory,purchasedAt,owner);
    const spent=allocateBoutiqueSpend(tx,{purchaseId,ownerTeacherId:owner,studentId,academicYearId:yearId,cost:access.cost,requestKey,requestFingerprint:fingerprint});
    tx.db.prepare('INSERT INTO boutique_purchase_requests (owner_teacher_id,idempotency_key,operation,fingerprint,student_id,academic_year_id,item_id,term_id,purchase_id,resulting_emerald_balance,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(owner,requestKey,'PURCHASE',fingerprint,studentId,yearId,itemId,t.id,purchaseId,spent.emeraldBalance,purchasedAt);
    return {status:201,value:{purchaseId,studentId,academicYearId:yearId,itemId,currency:'EMERALD',cost:access.cost,emeraldBalance:spent.emeraldBalance,purchasedAt,replay:false}};
  });
}
