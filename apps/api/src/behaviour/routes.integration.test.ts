import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import * as calendar from '../calendar/service.js';
import { reportConfirmationRouteStatus } from './boundary.js';
import { correctAction, dismissProposal, loseLife, restoreLife, sessionStartPort } from './service.js';

const teacher = '11111111-1111-4111-8111-111111111111';
const year = '22222222-2222-4222-8222-222222222222';
const group = '33333333-3333-4333-8333-333333333333';
const student = '44444444-4444-4444-8444-444444444444';
const monday = { now: () => new Date('2026-09-07T08:30:00.000Z') };
const wednesday = { now: () => new Date('2026-09-09T08:30:00.000Z') };
const input = {
  timezone: 'UTC',
  terms: [
    { code: 'T1' as const, startsOn: '2026-09-01', endsOn: '2026-12-20' },
    { code: 'T2' as const, startsOn: '2026-12-21', endsOn: '2027-03-31' },
    { code: 'T3' as const, startsOn: '2027-04-01', endsOn: '2027-07-01' },
  ],
  holidays: [],
  slots: [
    { groupId: group, weekday: 1, startsAt: '08:00', endsAt: '09:00' },
    { groupId: group, weekday: 3, startsAt: '08:00', endsAt: '09:00' },
  ],
};

const databases: Database.Database[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

function setup() {
  const db = new Database(':memory:');
  databases.push(db);
  migrateDatabase(db, migrations);
  const stamp = new Date().toISOString();
  db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(teacher, 'behaviour@example.test', 'hash', stamp);
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,archived_at,created_at) VALUES (?,?,?,?,?,?,?)').run(year, teacher, '2026–2027', '2026-09-01', '2027-07-01', null, stamp);
  db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(group, teacher, year, 'A', stamp);
  db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,specialty,archived_at,group_correction_locked_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(student, group, 'Student', 'student', 'default', null, null, null, stamp);
  calendar.replaceCalendar(db, teacher, year, input);
  return db;
}

function start(db: Database.Database, clock: { now: () => Date }, key: string) {
  return calendar.start(db, teacher, year, group, key, clock, sessionStartPort).session;
}

function actions(db: Database.Database, sessionId: string) {
  return db.prepare('SELECT id,kind,delta FROM behaviour_actions WHERE session_id=? AND student_id=? ORDER BY created_at,id').all(sessionId, student) as Array<{ id: string; kind: string; delta: number }>;
}

describe('behaviour and calendar lifecycle integration', () => {
  it('carries lives through a closed session and an unopened calendar date', () => {
    const db = setup();
    const first = start(db, monday, '11111111-1111-4111-8111-111111111101');
    loseLife(db, teacher, first.id, student, '11111111-1111-4111-8111-111111111102');
    loseLife(db, teacher, first.id, student, '11111111-1111-4111-8111-111111111103');
    calendar.end(db, teacher, first.id, '11111111-1111-4111-8111-111111111104', monday);

    const next = start(db, wednesday, '11111111-1111-4111-8111-111111111105');
    expect(db.prepare('SELECT local_date FROM real_class_sessions WHERE id=?').get(next.id)).toMatchObject({ local_date: '2026-09-09' });
    expect(db.prepare('SELECT lives_at_start,inherited_action_id FROM real_class_session_behaviour_roster WHERE session_id=? AND student_id=?').get(next.id, student)).toMatchObject({ lives_at_start: 2 });
  });

  it('settles concurrent duplicate loss requests to one action', async () => {
    const db = setup();
    const session = start(db, monday, '11111111-1111-4111-8111-111111111106');
    const results = await Promise.all([
      Promise.resolve().then(() => loseLife(db, teacher, session.id, student, '11111111-1111-4111-8111-111111111107')),
      Promise.resolve().then(() => loseLife(db, teacher, session.id, student, '11111111-1111-4111-8111-111111111107')),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 201]);
    expect(actions(db, session.id)).toHaveLength(1);
    expect(db.prepare('SELECT current_lives FROM behaviour_student_state WHERE student_id=? AND academic_year_id=?').get(student, year)).toMatchObject({ current_lives: 3 });
  });

  it('enforces life bounds without writing an out-of-range action', () => {
    const db = setup();
    const session = start(db, monday, '11111111-1111-4111-8111-111111111108');
    for (let index = 0; index < 4; index += 1) loseLife(db, teacher, session.id, student, `11111111-1111-4111-8111-11111111110${index}`);
    expect(() => loseLife(db, teacher, session.id, student, '11111111-1111-4111-8111-111111111112')).toThrow(/outside 0 to 4/);
    expect(() => restoreLife(db, teacher, session.id, student, '11111111-1111-4111-8111-111111111113')).not.toThrow();
    expect(() => restoreLife(db, teacher, session.id, student, '11111111-1111-4111-8111-111111111114')).not.toThrow();
    expect(() => restoreLife(db, teacher, session.id, student, '11111111-1111-4111-8111-111111111115')).not.toThrow();
    expect(() => restoreLife(db, teacher, session.id, student, '11111111-1111-4111-8111-111111111116')).not.toThrow();
    expect(() => restoreLife(db, teacher, session.id, student, '11111111-1111-4111-8111-111111111117')).toThrow(/outside 0 to 4/);
    expect(actions(db, session.id)).toHaveLength(8);
  });

  it('withdraws an open zero-life proposal when a life is restored', () => {
    const db = setup();
    const session = start(db, monday, '11111111-1111-4111-8111-111111111115');
    for (let index = 0; index < 4; index += 1) loseLife(db, teacher, session.id, student, `21111111-1111-4111-8111-11111111110${index}`);
    const proposal = db.prepare("SELECT id,status FROM behaviour_proposals WHERE session_id=? AND status='OPEN'").get(session.id) as { id: string; status: string };
    expect(proposal).toMatchObject({ status: 'OPEN' });
    restoreLife(db, teacher, session.id, student, '21111111-1111-4111-8111-111111111114');
    expect(db.prepare('SELECT status FROM behaviour_proposals WHERE id=?').get(proposal.id)).toEqual({ status: 'WITHDRAWN' });
  });

  it('does not register a report or expose a report-confirmation route', () => {
    const db = setup();
    expect(reportConfirmationRouteStatus()).toEqual({ status: 404, code: 'NOT_FOUND' });
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%report%'").all()).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM behaviour_proposals').get()).toEqual({ count: 0 });
  });
});
