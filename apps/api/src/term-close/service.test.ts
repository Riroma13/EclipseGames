import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import { close, readiness, reopen } from './service.js';

const dbs: Database.Database[] = [];
const tempDirs: string[] = [];
afterEach(() => {
  for (const db of dbs.splice(0)) db.close();
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});
const uuid = () => randomUUID();

function setup(databasePath: string) {
  const db = new Database(databasePath); db.pragma('foreign_keys = ON'); migrateDatabase(db, migrations); dbs.push(db);
  const at = '2026-01-01T00:00:00.000Z'; const ids = { teacher: uuid(), year: uuid(), group: uuid(), calendar: uuid(), term: uuid(), slot: uuid() };
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(ids.teacher, 'teacher@test', 'hash', at);
  db.prepare('INSERT INTO academic_years VALUES (?,?,?,?,?,?,?)').run(ids.year, ids.teacher, '2026', '2026-01-01', '2026-12-31', null, at);
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(ids.group, ids.teacher, ids.year, 'Group', at);
  db.prepare('INSERT INTO academic_calendars VALUES (?,?,?,?,?,?)').run(ids.calendar, ids.year, ids.teacher, 'UTC', at, at);
  db.prepare('INSERT INTO academic_terms VALUES (?,?,?,?,?,?,?)').run(ids.term, ids.calendar, ids.year, ids.teacher, 'T1', '2026-01-01', '2026-04-01');
  db.prepare('INSERT INTO weekly_timetable_slots VALUES (?,?,?,?,?,?,?,?)').run(ids.slot, ids.calendar, ids.year, ids.teacher, ids.group, 1, '09:00', '10:00');
  return { db, ids, at };
}
function student(db: Database.Database, ids: any, at: string, name: string) {
  const id = uuid(); db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(id, ids.group, name, `${name}-${id}`, 'default', at);
  const evaluation = uuid(); const snapshot = uuid(); db.prepare('INSERT INTO observation_rubric_evaluations (id,student_id,term_id,calendar_id,owner_teacher_id,academic_year_id,group_id,state,revision,current_snapshot_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,\'CLOSED\',1,1,?,?)').run(evaluation, id, ids.term, ids.calendar, ids.teacher, ids.year, ids.group, at, at);
  db.prepare(`INSERT INTO observation_rubric_snapshots (id,evaluation_id,version,communication_suggested,precision_suggested,consistency_suggested,collaboration_suggested,communication_final,precision_final,consistency_final,collaboration_final,communication_base_xp,precision_base_xp,consistency_base_xp,collaboration_base_xp,communication_event_count,precision_event_count,consistency_event_count,collaboration_event_count,has_low_evidence,level_sum,grade_milli,closed_at,closed_by_teacher_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(snapshot, evaluation, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 2500, at, ids.teacher);
  return id;
}

describe('term-close service', () => {
  it('closes the active cohort atomically, keeps lineage, and supports reopen/reclose', async () => {
    const { db, ids, at } = setup(':memory:'); const ada = student(db, ids, at, 'Ada'); const bob = student(db, ids, at, 'Zoe');
    const session = uuid(); db.prepare('INSERT INTO real_class_sessions (id,owner_teacher_id,academic_year_id,group_id,calendar_id,term_id,slot_id,local_date,timezone,slot_starts_at,slot_ends_at,started_at,ended_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(session, ids.teacher, ids.year, ids.group, ids.calendar, ids.term, ids.slot, '2026-01-05', 'UTC', '09:00', '10:00', at, at, at);
    db.prepare('INSERT INTO real_class_session_rt_roster VALUES (?,?,?,?,?,?)').run(session, ada, ids.teacher, ids.year, ids.group, ids.term);
    db.prepare('INSERT INTO rt_entries VALUES (?,?,?,?,?,?,?)').run(uuid(), session, ada, ids.term, '10', at, at);
    const session2 = uuid(); db.prepare('INSERT INTO real_class_sessions (id,owner_teacher_id,academic_year_id,group_id,calendar_id,term_id,slot_id,local_date,timezone,slot_starts_at,slot_ends_at,started_at,ended_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(session2, ids.teacher, ids.year, ids.group, ids.calendar, ids.term, ids.slot, '2026-01-06', 'UTC', '09:00', '10:00', '2026-01-02T00:00:00.000Z', at, at);
    db.prepare('INSERT INTO real_class_session_rt_roster VALUES (?,?,?,?,?,?)').run(session2, ada, ids.teacher, ids.year, ids.group, ids.term);
    db.prepare('INSERT INTO rt_entries VALUES (?,?,?,?,?,?,?)').run(uuid(), session2, ada, ids.term, 'ABSENT', at, at);
    const key = uuid(); expect(readiness(db, ids.teacher, ids.year, ids.group, ids.term)).toMatchObject({ activeCount: 2, ready: true });
    const first = await close(db, ids.teacher, ids.year, ids.group, ids.term, key, { expectedRevision: 0 }); expect(first).toMatchObject({ status: 201, revision: 1, version: 1 });
    expect(db.prepare('SELECT student_id studentId,ordinal,rt_sum rtSum,rt_evaluated_count rtCount FROM group_term_close_students ORDER BY ordinal').all()).toEqual([{ studentId: ada, ordinal: 1, rtSum: 10, rtCount: 1 }, { studentId: bob, ordinal: 2, rtSum: null, rtCount: 0 }]);
    expect(await close(db, ids.teacher, ids.year, ids.group, ids.term, key, { expectedRevision: 0 })).toMatchObject({ status: 200, version: 1 });
    await expect(close(db, ids.teacher, ids.year, ids.group, ids.term, key, { expectedRevision: 1 })).rejects.toMatchObject({ statusCode: 409 });
    const stored = db.prepare('SELECT xlsx_length length,xlsx_sha256 hash FROM group_term_close_snapshots WHERE version=1').get() as { length: number; hash: string };
    expect(stored.length).toBeGreaterThan(0); expect(stored.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(reopen(db, ids.teacher, ids.year, ids.group, ids.term, uuid(), { expectedRevision: 1, reason: 'Correction' })).toMatchObject({ status: 201, revision: 2 });
    expect(await close(db, ids.teacher, ids.year, ids.group, ids.term, uuid(), { expectedRevision: 2 })).toMatchObject({ status: 201, version: 2 });
    expect(db.prepare('SELECT version,prior_version priorVersion FROM group_term_close_snapshots ORDER BY version').all()).toEqual([{ version: 1, priorVersion: null }, { version: 2, priorVersion: 1 }]);
  });

  it('rolls back the snapshot and closure when persistence fails after workbook generation', async () => {
    const { db, ids } = setup(':memory:');
    student(db, ids, '2026-01-01T00:00:00.000Z', 'Ada');
    db.exec(`CREATE TRIGGER injected_term_close_failure
      BEFORE INSERT ON group_term_close_lifecycle_events
      BEGIN SELECT RAISE(ABORT, 'injected term-close failure'); END`);

    await expect(close(db, ids.teacher, ids.year, ids.group, ids.term, uuid(), { expectedRevision: 0 })).rejects.toThrow('injected term-close failure');
    expect(db.prepare('SELECT COUNT(*) AS count FROM group_term_closures').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM group_term_close_snapshots').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM group_term_close_students').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM group_term_close_requests').get()).toEqual({ count: 0 });
  });

  it('allows one concurrent writer to close and rejects the competing stale revision', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'eclipse-term-close-')); tempDirs.push(directory);
    const path = join(directory, 'term-close.sqlite');
    const first = setup(path);
    student(first.db, first.ids, first.at, 'Ada');
    const second = new Database(path); second.pragma('foreign_keys = ON'); second.pragma('busy_timeout = 5000'); migrateDatabase(second, migrations); dbs.push(second);
    first.db.pragma('busy_timeout = 5000');

    let eventLoopTicked = false;
    const eventLoopTick = new Promise<void>((resolve) => setImmediate(() => { eventLoopTicked = true; resolve(); }));
    const resultsPromise = Promise.allSettled([
      close(first.db, first.ids.teacher, first.ids.year, first.ids.group, first.ids.term, uuid(), { expectedRevision: 0 }),
      close(second, first.ids.teacher, first.ids.year, first.ids.group, first.ids.term, uuid(), { expectedRevision: 0 }),
    ]);
    await eventLoopTick;
    expect(eventLoopTicked).toBe(true);
    const results = await resultsPromise;
    expect(results.filter(result => result.status === 'fulfilled').map(result => result.value.status)).toEqual([201]);
    const rejected = results.find(result => result.status === 'rejected');
    expect(rejected).toBeDefined();
    expect((rejected as PromiseRejectedResult).reason).toMatchObject({ statusCode: 409 });
    expect(first.db.prepare('SELECT state,revision,current_snapshot_version AS version FROM group_term_closures').get()).toEqual({ state: 'CLOSED', revision: 1, version: 1 });
    expect(first.db.prepare('SELECT COUNT(*) AS count FROM group_term_close_snapshots').get()).toEqual({ count: 1 });
    expect(first.db.prepare('SELECT COUNT(*) AS count FROM group_term_close_students').get()).toEqual({ count: 1 });
    expect(first.db.prepare('SELECT COUNT(*) AS count FROM group_term_close_lifecycle_events').get()).toEqual({ count: 1 });
    expect(first.db.prepare('SELECT COUNT(*) AS count FROM group_term_close_requests').get()).toEqual({ count: 1 });
    expect(first.db.prepare('SELECT version,xlsx_length AS length FROM group_term_close_snapshots').get()).toMatchObject({ version: 1, length: expect.any(Number) });
  });
});
