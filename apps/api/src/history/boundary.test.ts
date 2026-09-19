import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import { ApiError } from '../http/errors.js';
import { assertOwnedHistoryScope } from './boundary.js';

const teacher='11111111-1111-4111-8111-111111111111';
const otherTeacher='99999999-9999-4999-8999-999999999999';
const year='22222222-2222-4222-8222-222222222222';
const otherYear='88888888-8888-4888-8888-888888888888';
const group='33333333-3333-4333-8333-333333333333';
const otherGroup='77777777-7777-4777-8777-777777777777';
const student='44444444-4444-4444-8444-444444444444';
const term='55555555-5555-4555-8555-555555555555';
const otherTerm='66666666-6666-4666-8666-666666666666';

function setup() {
  const db=new Database(':memory:'); migrateDatabase(db);
  db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(teacher,'teacher@example.test','hash','now');
  db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(otherTeacher,'other@example.test','hash','now');
  for (const [id,owner] of [[year,teacher],[otherYear,teacher]] as const) db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(id,owner,id,'2026-09-01','2027-07-01','now');
  db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(group,teacher,year,'A','now');
  db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(otherGroup,otherTeacher,year,'Other','now');
  db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(student,group,'Ada','A','default','now');
  db.prepare('INSERT INTO academic_calendars (id,academic_year_id,owner_teacher_id,timezone,created_at,updated_at) VALUES (?,?,?,?,?,?)').run('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',year,teacher,'UTC','now','now');
  db.prepare('INSERT INTO academic_calendars (id,academic_year_id,owner_teacher_id,timezone,created_at,updated_at) VALUES (?,?,?,?,?,?)').run('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',otherYear,teacher,'UTC','now','now');
  db.prepare('INSERT INTO academic_terms (id,calendar_id,academic_year_id,owner_teacher_id,code,starts_on,ends_on) VALUES (?,?,?,?,?,?,?)').run(term,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',year,teacher,'T1','2026-09-01','2026-12-20');
  db.prepare('INSERT INTO academic_terms (id,calendar_id,academic_year_id,owner_teacher_id,code,starts_on,ends_on) VALUES (?,?,?,?,?,?,?)').run(otherTerm,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',otherYear,teacher,'T1','2026-09-01','2026-12-20');
  return db;
}

describe('history ownership boundary',()=>{
  const dbs:Database.Database[]=[];
  afterEach(()=>dbs.splice(0).forEach(db=>db.close()));

  it('accepts an owned term in the group academic year',()=>{
    const db=setup(); dbs.push(db);
    expect(assertOwnedHistoryScope(db,teacher,group,year,student,term).id).toBe(group);
  });

  it.each([
    ['a term outside the group year',otherTerm],
    ['an invalid term', '66666666-6666-4666-8666-666666666667'],
  ])('rejects %s with the public not-found contract',(_, termId)=>{
    const db=setup(); dbs.push(db);
    expect(()=>assertOwnedHistoryScope(db,teacher,group,year,undefined,termId)).toThrowError(new ApiError('NOT_FOUND',404,'Resource not found.'));
  });

  it('keeps group and student ownership checks before any history adapter read',()=>{
    const db=setup(); dbs.push(db); let adapterReads=0;
    expect(()=>{ assertOwnedHistoryScope(db,teacher,otherGroup,year,student,term); adapterReads+=1; }).toThrowError(ApiError);
    expect(adapterReads).toBe(0);
    expect(()=>{ assertOwnedHistoryScope(db,teacher,group,year,'66666666-6666-4666-8666-666666666666',term); adapterReads+=1; }).toThrowError(ApiError);
    expect(adapterReads).toBe(0);
    expect(()=>{ assertOwnedHistoryScope(db,teacher,group,year,student,'66666666-6666-4666-8666-666666666666'); adapterReads+=1; }).toThrowError(ApiError);
    expect(adapterReads).toBe(0);
  });
});
