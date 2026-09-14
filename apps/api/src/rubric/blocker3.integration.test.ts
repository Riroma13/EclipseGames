import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import * as rubric from './service.js';
import * as xp from '../xp/service.js';
import { summary } from '../xp/repository.js';

const dbs: Database.Database[] = [];
const key = () => randomUUID();

function fixture() {
  const db = new Database(':memory:'); db.pragma('foreign_keys = ON'); migrateDatabase(db, migrations); dbs.push(db);
  const t='teacher', y='year', g='group', s='student', c='calendar', term='term', slot='slot', session='session', now='2026-09-01T09:00:00.000Z';
  db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(t,'blocker3@example.test','hash',now);
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(y,t,'Year','2026-09-01','2027-07-01',now);
  db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(g,t,y,'Group',now);
  db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(s,g,'Student','Student','default',now);
  db.prepare('INSERT INTO academic_calendars (id,academic_year_id,owner_teacher_id,timezone,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(c,y,t,'UTC',now,now);
  db.prepare('INSERT INTO academic_terms (id,calendar_id,academic_year_id,owner_teacher_id,code,starts_on,ends_on) VALUES (?,?,?,?,?,?,?)').run(term,c,y,t,'T1','2026-09-01','2026-12-31');
  db.prepare('INSERT INTO weekly_timetable_slots (id,calendar_id,academic_year_id,owner_teacher_id,group_id,weekday,starts_at,ends_at) VALUES (?,?,?,?,?,?,?,?)').run(slot,c,y,t,g,1,'09:00','10:00');
  db.prepare('INSERT INTO real_class_sessions (id,owner_teacher_id,academic_year_id,group_id,calendar_id,term_id,slot_id,local_date,timezone,slot_starts_at,slot_ends_at,started_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(session,t,y,g,c,term,slot,'2026-09-01','UTC','09:00','10:00',now,now);
  return {db,t,y,g,s,c,term,session,now};
}

function event(f: ReturnType<typeof fixture>, id=randomUUID(), base=3) {
  f.db.prepare(`INSERT INTO xp_evidence_events (id,owner_teacher_id,student_id,academic_year_id,category,base_xp,real_class_session_id,term_id,specialty_at_award,specialty_category_at_award,bonus_eligible_at_award,specialty_bonus_xp,effective_xp,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,f.t,f.s,f.y,'COMMUNICATION',base,f.session,f.term,null,null,0,1,base+1,f.now,f.t,id,id);
  return id;
}

const read = (f: ReturnType<typeof fixture>) => rubric.read(f.db,f.t,f.s,f.term,f.y);

afterEach(() => dbs.splice(0).forEach(db => db.close()));

describe('SPEC-0036 Verify blocker #3 runtime evidence', () => {
  it('serializes competing close/reopen operations and preserves version lineage', () => {
    const f=fixture(); const saved=rubric.save(f.db,f.t,f.s,f.term,f.y,key(),{expectedRevision:0,overrides:{COMMUNICATION:null,PRECISION:null,CONSISTENCY:null,COLLABORATION:null},comment:'draft'});
    const close = (k:string) => rubric.close(f.db,f.t,f.s,f.term,f.y,k,{expectedRevision:1});
    const results = [key(),key()].map(k => { try { return {ok:true,value:close(k)}; } catch (error) { return {ok:false,error}; } });
    expect(results.filter(r=>r.ok)).toHaveLength(1); expect(results.filter(r=>!r.ok)[0].error).toMatchObject({statusCode:409});
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM observation_rubric_snapshots').get()).toEqual({n:1});
    expect(read(f)).toMatchObject({state:'CLOSED',revision:2,snapshot:{version:1}});
    const reopens = [key(),key()].map(k => { try { return {ok:true,value:rubric.reopen(f.db,f.t,f.s,f.term,f.y,k,{expectedRevision:2,reason:'corrected'})}; } catch (error) { return {ok:false,error}; } });
    expect(reopens.filter(r=>r.ok)).toHaveLength(1); expect(reopens.filter(r=>!r.ok)[0].error).toMatchObject({statusCode:409});
    expect(read(f)).toMatchObject({state:'REOPENED',revision:3,snapshot:{version:1}});
    expect(saved.value).toBeTruthy();
  });

  it('rolls back a failed close without evaluation, snapshot, request, lifecycle, or evidence residue', () => {
    const f=fixture(); event(f);
    f.db.exec("CREATE TRIGGER blocker3_fail_snapshot BEFORE INSERT ON observation_rubric_snapshot_evidence BEGIN SELECT RAISE(ABORT, 'injected close failure'); END");
    expect(() => rubric.close(f.db,f.t,f.s,f.term,f.y,key(),{expectedRevision:0})).toThrow('injected close failure');
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM observation_rubric_evaluations').get()).toEqual({n:0});
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM observation_rubric_snapshots').get()).toEqual({n:0});
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM observation_rubric_snapshot_evidence').get()).toEqual({n:0});
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM observation_rubric_requests').get()).toEqual({n:0});
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM observation_rubric_lifecycle_events').get()).toEqual({n:0});
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM xp_level_grant_transitions').get()).toEqual({n:0});
  });

  it('keeps closed evidence immutable, reports reversal staleness, and creates version two after explicit reopen', () => {
    const f=fixture(); const eventId=event(f,randomUUID(),3); const saved=rubric.save(f.db,f.t,f.s,f.term,f.y,key(),{expectedRevision:0,overrides:{COMMUNICATION:4,PRECISION:null,CONSISTENCY:null,COLLABORATION:null},comment:'official'});
    const closed=rubric.close(f.db,f.t,f.s,f.term,f.y,key(),{expectedRevision:1}); const first=read(f);
    expect(first).toMatchObject({state:'CLOSED',stale:false,snapshot:{version:1,gradeDecimal:'4.375'}});
    const annualBefore=summary(f.db,f.s,f.y).annualEffectiveXp;
    xp.reverse(f.db,f.t,eventId,{reason:'correction'},key());
    expect(summary(f.db,f.s,f.y).annualEffectiveXp).toBe(0);
    expect(read(f)).toMatchObject({state:'CLOSED',stale:true,snapshot:{version:1,gradeDecimal:'4.375'}});
    expect(annualBefore).toBe(4);
    rubric.reopen(f.db,f.t,f.s,f.term,f.y,key(),{expectedRevision:closed.value.revision,reason:'corrected evidence'});
     const reopened=read(f); expect(reopened).toMatchObject({state:'REOPENED',revision:3,categories:[{category:'COMMUNICATION',baseXp:0},{category:'PRECISION',baseXp:0},{category:'CONSISTENCY',baseXp:0},{category:'COLLABORATION',baseXp:0}]});
    rubric.close(f.db,f.t,f.s,f.term,f.y,key(),{expectedRevision:3});
     expect(read(f)).toMatchObject({state:'CLOSED',revision:4,snapshot:{version:2,priorVersion:1,gradeDecimal:'4.375'}});
     expect(f.db.prepare('SELECT version,communication_base_xp,grade_milli FROM observation_rubric_snapshots ORDER BY version').all()).toEqual([{version:1,communication_base_xp:3,grade_milli:4375},{version:2,communication_base_xp:0,grade_milli:4375}]);
  });
});
