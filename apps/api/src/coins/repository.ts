import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';

const now = () => new Date().toISOString();
export type CoinEntry = { id: string; amount: number; source: string; createdAt: string; correctionOfId: string | null };

export function balance(db: Database.Database, studentId: string, academicYearId: string) {
  return Number((db.prepare('SELECT COALESCE(SUM(amount),0) AS balance FROM coin_ledger WHERE student_id=? AND academic_year_id=?').get(studentId, academicYearId) as { balance: number }).balance);
}
export function entries(db: Database.Database, studentId: string, academicYearId: string) {
  return db.prepare('SELECT id,amount,source,created_at AS createdAt,correction_of_id AS correctionOfId FROM coin_ledger WHERE student_id=? AND academic_year_id=? ORDER BY created_at,id').all(studentId, academicYearId) as CoinEntry[];
}
export function eligibleGrants(db: Database.Database, studentId: string, academicYearId: string, limit: number) {
  return db.prepare(`SELECT l.id,l.amount,l.source,l.created_at AS createdAt,l.correction_of_id AS correctionOfId
    FROM coin_ledger l LEFT JOIN coin_spend_allocations a ON a.grant_ledger_entry_id=l.id AND a.released_at IS NULL
    WHERE l.student_id=? AND l.academic_year_id=? AND l.amount=1 AND a.id IS NULL
      AND l.source IN ('LEVEL_ENTITLEMENT','PERSONAL_IMPROVEMENT','EXCEPTIONAL_FRENCH','EXCEPTIONAL_COLLABORATION','SPECIAL_CHALLENGE')
    ORDER BY l.created_at,l.id LIMIT ?`).all(studentId, academicYearId, limit) as CoinEntry[];
}
export function grant(db: Database.Database, input: { studentId: string; academicYearId: string; source: string; id?: string; correctionOfId?: string | null }) {
  const id = input.id ?? randomUUID();
  db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,correction_of_id,created_at) VALUES (?,?,?,?,?,?,?)').run(id,input.studentId,input.academicYearId,1,input.source,input.correctionOfId ?? null,now());
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
