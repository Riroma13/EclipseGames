import type Database from 'better-sqlite3';

export type CoinEntry = { id:string; amount:number; source:string; createdAt:string; correctionOfId:string|null };
export function balance(db: Database.Database, studentId:string, academicYearId:string) { return Number((db.prepare('SELECT COALESCE(SUM(amount),0) AS balance FROM coin_ledger WHERE student_id=? AND academic_year_id=?').get(studentId,academicYearId) as {balance:number}).balance); }
export function entries(db: Database.Database, studentId:string, academicYearId:string) { return db.prepare('SELECT id,amount,source,created_at AS createdAt,correction_of_id AS correctionOfId FROM coin_ledger WHERE student_id=? AND academic_year_id=? ORDER BY created_at,id').all(studentId,academicYearId) as CoinEntry[]; }
