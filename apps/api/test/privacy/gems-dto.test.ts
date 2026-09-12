import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/db/client.js';
import * as repository from '../../src/gems/repository.js';
import { apiErrorSchema } from '@eclipse/contracts';

const databases: ReturnType<typeof openDatabase>[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

describe('gem DTO allowlists', () => {
  it('returns only balance and ledger public fields', () => {
    const database=openDatabase(':memory:'); databases.push(database); const db=database.database;
    const teacher='00000000-0000-4000-8000-000000000001', year='00000000-0000-4000-8000-000000000002', group='00000000-0000-4000-8000-000000000003', student='00000000-0000-4000-8000-000000000004';
    db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(teacher,'dto@example.test','hash','now'); db.prepare('INSERT INTO academic_years VALUES (?,?,?,?,?,?,?)').run(year,teacher,'Y','2026-09-01','2027-07-01',null,'now'); db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(group,teacher,year,'G','now'); db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(student,group,'Private Name','Alias','default','now');
    db.prepare('INSERT INTO gem_ledger (id,student_id,academic_year_id,currency,amount,movement_kind,source_kind,source_id,source_family_id,unit_index,created_at,owner_teacher_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('00000000-0000-4000-8000-000000000005',student,year,'EMERALD',1,'GRANT','RESULT_REWARD','source','family',1,'2026-09-01T00:00:00.000Z',teacher);
    expect(Object.keys(repository.balances(db,student,year))).toEqual(['studentId','academicYearId','balances']);
    const page=repository.ledger(db,student,year,50,null); expect(Object.keys(page.entries[0])).toEqual(['currency','amount','kind','createdAt']);
    expect(apiErrorSchema.parse({code:'VALIDATION_FAILED',message:'Cursor is invalid.',requestId:'request-1'})).toEqual(expect.any(Object));
  });

  it('maps tuple action state without repository lineage or private fields', () => {
    const database=openDatabase(':memory:'); databases.push(database); const db=database.database;
    const teacher='00000000-0000-4000-8000-000000000011', year='00000000-0000-4000-8000-000000000012', group='00000000-0000-4000-8000-000000000013', student='00000000-0000-4000-8000-000000000014', context='00000000-0000-4000-8000-000000000015';
    db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(teacher,'action@example.test','hash','now'); db.prepare('INSERT INTO academic_years VALUES (?,?,?,?,?,?,?)').run(year,teacher,'Y','2026-09-01','2027-07-01',null,'now'); db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(group,teacher,year,'G','now'); db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(student,group,'Private Name','Alias','default','now'); db.prepare('INSERT INTO assessment_contexts (id,group_id,name,archived_at,created_at) VALUES (?,?,?,?,?)').run(context,group,'Quiz',null,'now');
    const value=repository.actionState(db,student,year,context);
    expect(value).toEqual({ studentId:student, academicYearId:year, assessmentContextId:context, resultReward:null, advantageRedemption:null });
    expect(Object.keys(value)).toEqual(['studentId','academicYearId','assessmentContextId','resultReward','advantageRedemption']);
  });
});
