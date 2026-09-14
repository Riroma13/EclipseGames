import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';

const dbs: Database.Database[] = [];
afterEach(() => dbs.splice(0).forEach(db => db.close()));

describe('quarterly rubric schema', () => {
  it('registers the forward migration and keeps legacy XP attribution nullable', () => {
    const db = new Database(':memory:'); dbs.push(db); db.pragma('foreign_keys = ON');
    migrateDatabase(db, migrations);
    expect(db.prepare("SELECT id FROM schema_migrations WHERE id='0015_quarterly_observation_rubric'").get()).toBeTruthy();
    expect(db.prepare('PRAGMA table_info(xp_evidence_events)').all()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'real_class_session_id' }),
      expect.objectContaining({ name: 'term_id' }),
    ]));
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observation_rubric_snapshots'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_xp_events_term_category_active'").get()).toBeTruthy();
  });

  it('enforces nullable XP attribution and all rubric lineage composites', () => {
    const db = new Database(':memory:'); dbs.push(db); db.pragma('foreign_keys = ON');
    migrateDatabase(db, migrations);
    const t = 'teacher', y = 'year', g = 'group', g2 = 'other-group', s = 'student', s2 = 'other-student', c = 'calendar', term = 'term', slot = 'slot', session = 'session';
    const at = '2026-09-01T09:00:00.000Z';
    db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(t, 'schema@example.test', 'hash', at);
    db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(y, t, 'Year', '2026-09-01', '2027-07-01', at);
    for (const [id, owner, year, name] of [[g, t, y, 'Group'], [g2, t, y, 'Other']] as const) db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(id, owner, year, name, at);
    for (const [id, group, name] of [[s, g, 'Student'], [s2, g2, 'Other student']] as const) db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(id, group, name, name, 'default', at);
    db.prepare('INSERT INTO academic_calendars (id,academic_year_id,owner_teacher_id,timezone,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(c, y, t, 'UTC', at, at);
    db.prepare('INSERT INTO academic_terms (id,calendar_id,academic_year_id,owner_teacher_id,code,starts_on,ends_on) VALUES (?,?,?,?,?,?,?)').run(term, c, y, t, 'T1', '2026-09-01', '2026-12-31');
    db.prepare('INSERT INTO weekly_timetable_slots (id,calendar_id,academic_year_id,owner_teacher_id,group_id,weekday,starts_at,ends_at) VALUES (?,?,?,?,?,?,?,?)').run(slot, c, y, t, g, 1, '09:00', '10:00');
    db.prepare('INSERT INTO real_class_sessions (id,owner_teacher_id,academic_year_id,group_id,calendar_id,term_id,slot_id,local_date,timezone,slot_starts_at,slot_ends_at,started_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(session, t, y, g, c, term, slot, '2026-09-01', 'UTC', '09:00', '10:00', at, at);
    const xp = (id: string, owner: string | null, year: string | null, termId: string | null) => db.prepare(`INSERT INTO xp_evidence_events (id,owner_teacher_id,student_id,academic_year_id,category,base_xp,real_class_session_id,term_id,specialty_at_award,specialty_category_at_award,bonus_eligible_at_award,specialty_bonus_xp,effective_xp,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, owner ?? t, s, year ?? y, 'PRECISION', 1, owner === null ? null : session, termId, null, null, 0, 0, 1, at, t, id, id);
    xp('legacy', null, null, null);
    expect(() => xp('bad-owner', 'wrong-owner', y, term)).toThrow();
    expect(() => xp('bad-year', t, 'wrong-year', term)).toThrow();
    expect(() => xp('bad-term', t, y, 'wrong-term')).toThrow();
    xp('attributed', t, y, term);

    const evaluation = `INSERT INTO observation_rubric_evaluations (id,student_id,term_id,calendar_id,owner_teacher_id,academic_year_id,group_id,state,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'OPEN',0,?,?)`;
    db.prepare(evaluation).run('valid', s, term, c, t, y, g, at, at);
    expect(() => db.prepare(evaluation).run('bad-student-group', s2, term, c, t, y, g, at, at)).toThrow();
    expect(() => db.prepare(evaluation).run('bad-group-lineage', s, term, c, t, 'wrong-year', g, at, at)).toThrow();
    expect(() => db.prepare(evaluation).run('bad-owner-lineage', s, term, c, 'wrong-owner', y, g, at, at)).toThrow();
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
});
