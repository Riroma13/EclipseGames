import type Database from 'better-sqlite3';

export function ownedContext(db: Database.Database, owner: string, studentId: string, yearId: string) {
  return db.prepare(`SELECT s.id AS studentId,s.archived_at AS studentArchived,y.id AS academicYearId,y.archived_at AS yearArchived,g.id AS groupId,g.owner_teacher_id AS ownerTeacherId,s.specialty
    FROM students s JOIN groups g ON g.id=s.group_id JOIN academic_years y ON y.id=g.academic_year_id
    WHERE s.id=? AND y.id=? AND g.owner_teacher_id=? AND y.owner_teacher_id=?`).get(studentId, yearId, owner, owner) as any;
}
export function purchaseByKey(db: Database.Database, owner: string, key: string) { return db.prepare('SELECT * FROM boutique_purchase_requests WHERE owner_teacher_id=? AND idempotency_key=?').get(owner, key) as any; }
export function purchase(db: Database.Database, studentId: string, yearId: string, itemId: string) { return db.prepare('SELECT * FROM boutique_purchases WHERE student_id=? AND academic_year_id=? AND item_id=?').get(studentId, yearId, itemId) as any; }
export function purchases(db: Database.Database, studentId: string, yearId: string) { return db.prepare('SELECT item_id AS itemId FROM boutique_purchases WHERE student_id=? AND academic_year_id=?').all(studentId, yearId) as Array<{itemId:string}>; }
export function currentTerm(db: Database.Database, yearId: string, date: string) { return db.prepare('SELECT id,code FROM academic_terms WHERE academic_year_id=? AND starts_on<=? AND ends_on>=? ORDER BY code LIMIT 1').get(yearId, date, date) as {id:string;code:'T1'|'T2'|'T3'}|undefined; }
