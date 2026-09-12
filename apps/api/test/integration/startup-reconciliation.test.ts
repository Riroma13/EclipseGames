import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../../src/server.js';
import { migrateDatabase } from '../../src/db/migrate.js';
import * as xp from '../../src/xp/service.js';

const ids = {
  teacher: '11111111-1111-4111-8111-111111111111',
  year: '22222222-2222-4222-8222-222222222222',
  group: '33333333-3333-4333-8333-333333333333',
  student: '44444444-4444-4444-8444-444444444444',
  calendar: '55555555-5555-4555-8555-555555555551',
  term: '55555555-5555-4555-8555-555555555552',
  slot: '55555555-5555-4555-8555-555555555553',
};

const entitlementIds = [
  '66666666-6666-4666-8666-666666666661',
  '66666666-6666-4666-8666-666666666662',
];

const databases: string[] = [];
afterEach(() => { for (const path of databases.splice(0)) rmSync(path, { force: true, recursive: true }); });

function fixture(path: string) {
  const db = new Database(path);
  db.pragma('foreign_keys=ON');
  migrateDatabase(db);
  const now = '2026-09-07T06:30:00.000Z';
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(ids.teacher, 'startup@example.test', 'hash', now);
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(ids.year, ids.teacher, '2026', '2026-09-01', '2027-07-01', now);
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(ids.group, ids.teacher, ids.year, 'Startup', now);
  db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(ids.student, ids.group, 'Private', 'A', 'default', now);
  db.prepare('INSERT INTO academic_calendars VALUES (?,?,?,?,?,?)').run(ids.calendar, ids.year, ids.teacher, 'Europe/Paris', now, now);
  db.prepare('INSERT INTO academic_terms VALUES (?,?,?,?,?,?,?)').run(ids.term, ids.calendar, ids.year, ids.teacher, 'T1', '2026-09-01', '2026-12-20');
  db.prepare('INSERT INTO weekly_timetable_slots VALUES (?,?,?,?,?,?,?,?)').run(ids.slot, ids.calendar, ids.year, ids.teacher, ids.group, 1, '08:00', '09:00');

  for (const [index, entitlementId] of entitlementIds.entries()) {
    const sessionId = `77777777-7777-4777-8777-77777777777${index + 1}`;
    const entryId = `88888888-8888-4888-8888-88888888888${index + 1}`;
    const date = `2026-09-0${7 + index}`;
    db.prepare('INSERT INTO real_class_sessions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(sessionId, ids.teacher, ids.year, ids.group, ids.calendar, ids.term, ids.slot, date, 'Europe/Paris', '08:00', '09:00', `${date}T06:00:00.000Z`, `${date}T07:00:00.000Z`, now);
    db.prepare('INSERT INTO real_class_session_rt_roster VALUES (?,?,?,?,?,?)').run(sessionId, ids.student, ids.teacher, ids.year, ids.group, ids.term);
    db.prepare('INSERT INTO rt_entries VALUES (?,?,?,?,?,?,?)').run(entryId, sessionId, ids.student, ids.term, '10', now, now);
    db.prepare('INSERT INTO rt_streak_emerald_entitlements (id,source_key,source_entry_id,student_id,term_id,active,revision) VALUES (?,?,?,?,?,?,?)').run(entitlementId, `RT_STREAK:${entryId}`, entryId, ids.student, ids.term, 1, 1);
  }
  for (let index = 0; index < 4; index += 1) xp.create(db, ids.teacher, ids.student, { category: 'PRECISION', baseXp: 3 }, `99999999-9999-4999-8999-99999999999${index + 1}`);
  db.prepare('DELETE FROM xp_level_grant_transitions').run();
  db.prepare('DELETE FROM xp_level_unlocks').run();
  db.close();
}

function rows(db: Database.Database, table: string) { return db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(); }

describe('startup reconciliation failure boundary', () => {
  it('rolls back XP catch-up, gem receipts/movements/cursor, RT CAS, and serves no failed-startup routes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'eclipse-startup-'));
    const path = join(directory, 'startup.sqlite');
    databases.push(path, directory);
    fixture(path);

    const before = new Database(path);
    const snapshot = {
      unlocks: rows(before, 'xp_level_unlocks'),
      transitions: rows(before, 'xp_level_grant_transitions'),
      movements: rows(before, 'gem_ledger'),
      xpReceipts: rows(before, 'gem_xp_transition_receipts'),
      rtReceipts: rows(before, 'gem_reconciliation_revisions'),
      allocations: rows(before, 'gem_spend_allocations'),
      redemptions: rows(before, 'gem_advantage_redemptions'),
      cursor: rows(before, 'gem_reconciliation_cursors'),
      entitlements: rows(before, 'rt_streak_emerald_entitlements'),
    };
    before.close();

    let receipts = 0;
    let failedApp: unknown;
    let startupError: unknown;
    try {
      failedApp = createServer(path, {
        logger: false,
        startupReconciliation: { onStep: step => { if (step === 'rt-receipt' && ++receipts === 1) throw new Error('failed baseline startup'); } },
      });
    } catch (error) {
      startupError = error;
    }
    expect(failedApp).toBeUndefined();
    if (startupError instanceof Error && startupError.message !== 'failed baseline startup') throw startupError;
    expect(startupError).toBeInstanceOf(Error);
    expect((startupError as Error).message).toBe('failed baseline startup');

    const after = new Database(path);
    expect(rows(after, 'xp_level_unlocks')).toEqual(snapshot.unlocks);
    expect(rows(after, 'xp_level_grant_transitions')).toEqual(snapshot.transitions);
    expect(rows(after, 'gem_ledger')).toEqual(snapshot.movements);
    expect(rows(after, 'gem_xp_transition_receipts')).toEqual(snapshot.xpReceipts);
    expect(rows(after, 'gem_reconciliation_revisions')).toEqual(snapshot.rtReceipts);
    expect(rows(after, 'gem_spend_allocations')).toEqual(snapshot.allocations);
    expect(rows(after, 'gem_advantage_redemptions')).toEqual(snapshot.redemptions);
    expect(rows(after, 'gem_reconciliation_cursors')).toEqual(snapshot.cursor);
    expect(rows(after, 'rt_streak_emerald_entitlements')).toEqual(snapshot.entitlements);
    after.close();

    const retry = createServer(path, { logger: false });
    await retry.ready();
    expect((await retry.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    await retry.close();
  });
});
