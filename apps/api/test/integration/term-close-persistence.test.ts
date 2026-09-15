import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';

const databases: Database.Database[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function database() {
  const value = new Database(':memory:');
  value.pragma('foreign_keys = ON');
  databases.push(value);
  migrateDatabase(value, migrations);
  return value;
}

describe('group term-close persistence foundation', () => {
  it('registers 0016 after 0015 and creates exactly the six persistence tables without backfill', () => {
    const db = database();
    expect(migrations.map(migration => migration.id).slice(-2)).toEqual([
      '0015_quarterly_observation_rubric',
      '0016_group_term_close_xlsx',
    ]);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('group_term_closures','group_term_close_snapshots','group_term_close_students','group_term_close_rt_evidence','group_term_close_lifecycle_events','group_term_close_requests') ORDER BY name").all()).toEqual([
      { name: 'group_term_close_lifecycle_events' },
      { name: 'group_term_close_requests' },
      { name: 'group_term_close_rt_evidence' },
      { name: 'group_term_close_snapshots' },
      { name: 'group_term_close_students' },
      { name: 'group_term_closures' },
    ]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM group_term_closures').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM group_term_close_snapshots').get()).toEqual({ count: 0 });
  });

  it('enforces closure lineage, state, and identity uniqueness', () => {
    const db = database();
    expect(() => db.prepare(`INSERT INTO group_term_closures
      (id,owner_teacher_id,academic_year_id,group_id,calendar_id,term_id,state,revision,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run('closure', 'missing', 'year', 'group', 'calendar', 'term', 'OPEN', 0, 'now', 'now')).toThrow();
    seedParents(db);
    insertClosure(db);
    expect(() => insertClosure(db)).toThrow();
    expect(() => db.prepare(`UPDATE group_term_closures SET state='INVALID' WHERE id='closure'`).run()).toThrow();
  });

  it('enforces immutable version ordering, student uniqueness, and value checks', () => {
    const db = database();
    seedParents(db);
    insertClosure(db);
    insertSnapshot(db, 'snapshot-1', 1, null);
    expect(() => insertSnapshot(db, 'snapshot-2', 3, 1)).toThrow();
    expect(() => db.prepare(`INSERT INTO group_term_close_students
      (id,snapshot_id,student_id,ordinal,real_name,evaluation_id,evaluation_snapshot_version,grade_milli,rt_sum,rt_evaluated_count)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run('student-row', 'snapshot-1', 'student', 0, 'Ada', 'evaluation', 1, 5000, null, 0)).toThrow();
    expect(() => db.prepare(`INSERT INTO group_term_close_rt_evidence
      (id,snapshot_id,student_id,entry_id,value) VALUES (?,?,?,?,?)`).run('rt', 'snapshot-1', 'student', 'entry', '7')).toThrow();
  });
});

function seedParents(db: Database.Database) {
  const at = '2026-09-01T00:00:00.000Z';
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run('teacher', 'teacher@example.test', 'hash', at);
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run('year', 'teacher', 'Year', '2026-09-01', '2027-07-01', at);
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run('group', 'teacher', 'year', 'Group', at);
  db.prepare('INSERT INTO academic_calendars VALUES (?,?,?,?,?,?)').run('calendar', 'year', 'teacher', 'UTC', at, at);
  db.prepare('INSERT INTO academic_terms VALUES (?,?,?,?,?,?,?)').run('term', 'calendar', 'year', 'teacher', 'T1', '2026-09-01', '2026-12-01');
  db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run('student', 'group', 'Ada', 'Ada', 'default', at);
}

function insertClosure(db: Database.Database) {
  db.prepare(`INSERT INTO group_term_closures
      (id,owner_teacher_id,academic_year_id,group_id,calendar_id,term_id,state,revision,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run('closure', 'teacher', 'year', 'group', 'calendar', 'term', 'OPEN', 0, 'now', 'now');
}

function insertSnapshot(db: Database.Database, id: string, version: number, priorVersion: number | null) {
  db.prepare(`INSERT INTO group_term_close_snapshots
    (id,closure_id,version,prior_version,cohort_count,closed_by_teacher_id,closed_at,xlsx_bytes,xlsx_sha256,xlsx_length)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, 'closure', version, priorVersion, 1, 'teacher', 'now', Buffer.from('xlsx'), 'a'.repeat(64), 4);
}
