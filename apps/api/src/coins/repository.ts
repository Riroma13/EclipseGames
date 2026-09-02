import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';

const now = () => new Date().toISOString();
export type CoinEntry = { id: string; amount: number; source: string; createdAt: string; correctionOfId: string | null };
export type LedgerRequestEntry = CoinEntry & { studentId: string; academicYearId: string; redemptionId: string | null; requestFingerprint: string | null };

export function fingerprint(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function balance(db: Database.Database, studentId: string, academicYearId: string) {
  return Number((db.prepare('SELECT COALESCE(SUM(amount),0) AS balance FROM coin_ledger WHERE student_id=? AND academic_year_id=?').get(studentId, academicYearId) as { balance: number }).balance);
}
export function entries(db: Database.Database, studentId: string, academicYearId: string) {
  return db.prepare('SELECT id,amount,source,created_at AS createdAt,correction_of_id AS correctionOfId FROM coin_ledger WHERE student_id=? AND academic_year_id=? ORDER BY created_at,id').all(studentId, academicYearId) as CoinEntry[];
}

export function findByRequest(db: Database.Database, ownerTeacherId: string, requestId: string) {
  return db.prepare(`SELECT id,student_id AS studentId,academic_year_id AS academicYearId,amount,source,
      created_at AS createdAt,correction_of_id AS correctionOfId,redemption_id AS redemptionId,
      request_fingerprint AS requestFingerprint
    FROM coin_ledger WHERE owner_teacher_id=? AND client_request_id=?`).get(ownerTeacherId, requestId) as LedgerRequestEntry | undefined;
}

export function findLedger(db: Database.Database, ledgerId: string, ownerTeacherId: string) {
  return db.prepare(`SELECT l.id,l.student_id AS studentId,l.academic_year_id AS academicYearId,l.amount,l.source,
      l.created_at AS createdAt,l.correction_of_id AS correctionOfId,l.redemption_id AS redemptionId,
      l.request_fingerprint AS requestFingerprint,s.archived_at AS studentArchivedAt,
      g.id AS groupId,g.owner_teacher_id AS groupOwnerTeacherId,y.archived_at AS yearArchivedAt
    FROM coin_ledger l
    JOIN students s ON s.id=l.student_id
    JOIN groups g ON g.id=s.group_id
    JOIN academic_years y ON y.id=g.academic_year_id
    WHERE l.id=? AND g.owner_teacher_id=?`).get(ledgerId, ownerTeacherId) as (LedgerRequestEntry & { studentArchivedAt: string | null; groupId: string; groupOwnerTeacherId: string; yearArchivedAt: string | null }) | undefined;
}

export function manualCorrectionForGrant(db: Database.Database, grantId: string) {
  return db.prepare(`SELECT id,student_id AS studentId,academic_year_id AS academicYearId,amount,source,
      created_at AS createdAt,correction_of_id AS correctionOfId,redemption_id AS redemptionId,
      request_fingerprint AS requestFingerprint
    FROM coin_ledger WHERE correction_of_id=? AND source='MANUAL_CORRECTION'`).get(grantId) as LedgerRequestEntry | undefined;
}
export function eligibleGrants(db: Database.Database, studentId: string, academicYearId: string, limit: number) {
  return db.prepare(`SELECT l.id,l.amount,l.source,l.created_at AS createdAt,l.correction_of_id AS correctionOfId
    FROM coin_ledger l LEFT JOIN coin_spend_allocations a ON a.grant_ledger_entry_id=l.id AND a.released_at IS NULL
    WHERE l.student_id=? AND l.academic_year_id=? AND l.amount=1 AND a.id IS NULL
      AND NOT EXISTS (SELECT 1 FROM coin_ledger correction WHERE correction.correction_of_id=l.id)
      AND l.source IN ('LEVEL_ENTITLEMENT','PERSONAL_IMPROVEMENT','EXCEPTIONAL_FRENCH','EXCEPTIONAL_COLLABORATION','SPECIAL_CHALLENGE')
    ORDER BY l.created_at,l.id LIMIT ?`).all(studentId, academicYearId, limit) as CoinEntry[];
}
export function grant(db: Database.Database, input: { studentId: string; academicYearId: string; source: string; id?: string; correctionOfId?: string | null; ownerTeacherId?: string; clientRequestId?: string; requestFingerprint?: string }) {
  const id = input.id ?? randomUUID();
  db.prepare(`INSERT INTO coin_ledger
    (id,student_id,academic_year_id,amount,source,correction_of_id,owner_teacher_id,client_request_id,request_fingerprint,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id,input.studentId,input.academicYearId,1,input.source,input.correctionOfId ?? null,input.ownerTeacherId ?? null,input.clientRequestId ?? null,input.requestFingerprint ?? null,now());
  return id;
}

export function correctManualGrant(db: Database.Database, input: { studentId: string; academicYearId: string; grantId: string; ownerTeacherId?: string; clientRequestId?: string; requestFingerprint?: string }) {
  if (balance(db, input.studentId, input.academicYearId) < 1) throw new ApiError('CONFLICT',409,'Manual coin grant correction would make the balance negative.');
  const id = randomUUID();
  db.prepare(`INSERT INTO coin_ledger
    (id,student_id,academic_year_id,amount,source,correction_of_id,owner_teacher_id,client_request_id,request_fingerprint,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id,input.studentId,input.academicYearId,-1,'MANUAL_CORRECTION',input.grantId,input.ownerTeacherId ?? null,input.clientRequestId ?? null,input.requestFingerprint ?? null,now());
  return id;
}
export function debit(db: Database.Database, input: { studentId: string; academicYearId: string; amount: number; redemptionId: string }) {
  if (balance(db,input.studentId,input.academicYearId) < input.amount) throw new ApiError('CONFLICT',409,'Insufficient coin balance.');
  const id=randomUUID(); db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,redemption_id,created_at) VALUES (?,?,?,?,?,?,?)').run(id,input.studentId,input.academicYearId,-input.amount,'REDEMPTION_DEBIT',input.redemptionId,now()); return id;
}
export function refund(db: Database.Database, input: { studentId: string; academicYearId: string; amount: number; redemptionId: string }) {
  const id=randomUUID(); db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,redemption_id,created_at) VALUES (?,?,?,?,?,?,?)').run(id,input.studentId,input.academicYearId,input.amount,'REDEMPTION_REFUND',input.redemptionId,now()); return id;
}
export function compensate(db: Database.Database, input: { studentId: string; academicYearId: string; grantId: string; source: string; sourceTransitionId?: string }) {
  const existing = db.prepare('SELECT id FROM coin_ledger WHERE correction_of_id=?').get(input.grantId) as { id:string } | undefined;
  if (existing) return existing.id;
  if (balance(db, input.studentId, input.academicYearId) < 1) throw new ApiError('INTERNAL_ERROR', 500, 'Coin entitlement reconciliation would make the balance negative.');
  const id=randomUUID(); db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,correction_of_id,source_transition_id,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id,input.studentId,input.academicYearId,-1,input.source,input.grantId,input.sourceTransitionId ?? null,now()); return id;
}
export function releaseAllocations(db: Database.Database, redemptionId: string) {
  return db.prepare("UPDATE coin_spend_allocations SET released_at=?,release_reason='REDEMPTION_REVERSED' WHERE redemption_id=? AND released_at IS NULL").run(now(), redemptionId).changes;
}
export function activeRedemptionForGrant(db: Database.Database, grantId: string) {
  return db.prepare('SELECT redemption_id AS redemptionId FROM coin_spend_allocations WHERE grant_ledger_entry_id=? AND released_at IS NULL').get(grantId) as { redemptionId:string } | undefined;
}
export function assertActiveAllocations(db: Database.Database, redemptionId: string, cost: number) {
  const count=(db.prepare('SELECT COUNT(*) AS count FROM coin_spend_allocations WHERE redemption_id=? AND released_at IS NULL').get(redemptionId) as { count:number }).count;
  if(count!==cost) throw new ApiError('INTERNAL_ERROR',500,'Coin allocation invariant failed.');
}
