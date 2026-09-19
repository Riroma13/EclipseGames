import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import { adapters, composeHistory } from './adapters.js';

const teacher='10000000-0000-4000-8000-000000000001';
const year='20000000-0000-4000-8000-000000000001';
const group='30000000-0000-4000-8000-000000000001';
const student='40000000-0000-4000-8000-000000000001';
const query:any={academicYearId:year,limit:25};
function seed(db:Database.Database) {
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(teacher,'t@example.test','hash','2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO academic_years VALUES (?,?,?,?,?,?,?)').run(year,teacher,'2026','2026-01-01','2026-12-31',null,'2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(group,teacher,year,'Group','2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO students VALUES (?,?,?,?,?,?,?,?,?)').run(student,group,'Student','S','default',null,null,null,'2026-01-01T00:00:00.000Z');
}
describe('history source adapters',()=>{
  let db:Database.Database;
  beforeEach(()=>{db=new Database(':memory:');migrateDatabase(db);seed(db);});
  it('uses the badge current-state timestamp and replaces the observation after revoke',()=>{
    db.prepare('INSERT INTO xp_badge_unlocks (id,student_id,academic_year_id,category,badge_label,active,first_unlocked_at,last_activated_at,last_revoked_at,source_event_id) VALUES (?,?,?,?,?,?,?,?,?,?)').run('50000000-0000-4000-8000-000000000001',student,year,'COMMUNICATION','Badge',1,'2026-02-01T00:00:00.000Z','2026-02-03T00:00:00.000Z',null,null);
    const context:any={ownerTeacherId:teacher,groupId:group,academicYearId:year,query};
    expect(adapters.XP(db,context,10).find(r=>r.sourceId.startsWith('500'))?.occurredAt).toBe('2026-02-03T00:00:00.000Z');
    db.prepare('UPDATE xp_badge_unlocks SET active=0,last_revoked_at=? WHERE id=?').run('2026-02-05T00:00:00.000Z','50000000-0000-4000-8000-000000000001');
    const current=adapters.XP(db,context,10).find(r=>r.sourceId.startsWith('500'))!;
    expect(current.occurredAt).toBe('2026-02-05T00:00:00.000Z');
    expect(current.dto.kind).toBe('BADGE_REVOKED');
  });
  it('excludes annual-only XP and mutable group records from student/term filters',()=>{
    db.prepare('INSERT INTO xp_evidence_events (id,owner_teacher_id,student_id,academic_year_id,category,base_xp,specialty_at_award,specialty_category_at_award,bonus_eligible_at_award,specialty_bonus_xp,effective_xp,comment,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('60000000-0000-4000-8000-000000000001',teacher,student,year,'COMMUNICATION',1,null,null,1,0,1,null,'2026-02-02T00:00:00.000Z',teacher,'request','fingerprint');
    const context:any={ownerTeacherId:teacher,groupId:group,academicYearId:year,query:{...query,termId:'70000000-0000-4000-8000-000000000001'}};
    expect(adapters.XP(db,context,10)).toHaveLength(0);
    expect(adapters.CLASSROOM_EVENT(db,{...context,query},10)).toHaveLength(0);
    expect(adapters.CHALLENGE(db,{...context,query},10)).toHaveLength(0);
  });
  it('maps Classroom Events without challenge-only progress columns',()=>{
    db.prepare('INSERT INTO classroom_events (id,owner_teacher_id,group_id,title,description,status,show_on_projection,theme,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('80000000-0000-4000-8000-000000000001',teacher,group,'Event','Description','ACTIVE',0,'MISSION','2026-02-01T00:00:00.000Z','2026-02-03T00:00:00.000Z');
    const context:any={ownerTeacherId:teacher,groupId:group,academicYearId:year,query};
    const item=adapters.CLASSROOM_EVENT(db,context,10)[0];
    expect(item.occurredAt).toBe('2026-02-03T00:00:00.000Z');
    expect(item.dto.facts.value).toBeNull();
  });
  it('maps challenge progress only from the challenge source',()=>{
    db.prepare('INSERT INTO classroom_challenges (id,owner_teacher_id,group_id,title,description,target,progress,status,show_on_projection,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('90000000-0000-4000-8000-000000000001',teacher,group,'Challenge','Description',5,2,'ACTIVE',0,'2026-02-01T00:00:00.000Z','2026-02-04T00:00:00.000Z');
    const context:any={ownerTeacherId:teacher,groupId:group,academicYearId:year,query};
    expect(adapters.CHALLENGE(db,context,10)[0].dto.facts.value).toBe('2/5');
  });
});
