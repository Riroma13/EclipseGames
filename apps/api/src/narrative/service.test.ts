import { describe, expect, it } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import type Database from 'better-sqlite3';
import { migrateDatabase } from '../db/migrate.js';
import { executeCommand, getState } from './service.js';

const keys = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
];

function database(): Database.Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('foreign_keys = ON');
  migrateDatabase(db);
  for (const [teacher, year, group] of [['teacher', 'year', 'group'], ['other-teacher', 'other-year', 'other-group']]) {
    db.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run(teacher, `${teacher}@test`, 'hash', 'now');
    db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(year, teacher, '2026', '2026-09-01', '2027-07-01', 'now');
    db.prepare('INSERT INTO groups VALUES (?, ?, ?, ?, ?)').run(group, teacher, year, group, 'now');
  }
  return db;
}

function countsOutsideNarrative(db: Database.Database) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'narrative_%' AND name <> 'schema_migrations' ORDER BY name").all() as Array<{ name: string }>;
  return tables.map(({ name }) => ({ name, count: (db.prepare(`SELECT COUNT(*) AS count FROM "${name}"`).get() as { count: number }).count }));
}

describe('SPEC-0042 T3 narrative service', () => {
  it('round-trips progress and isolates complete owner/group/year lineage', () => {
    const db = database();
    const initial = getState(db, 'teacher', 'group', 'year');
    expect(initial.revision).toBe(0);
    expect(initial.events[0].state).toBe('AVAILABLE');

    executeCommand(db, 'teacher', 'group', 'year', 't1_el_apagon', 'START', { expectedRevision: 0 }, keys[0]);
    executeCommand(db, 'teacher', 'group', 'year', 't1_el_apagon', 'REVEAL_NEXT_CLUE', { expectedRevision: 1 }, keys[1]);
    const state = getState(db, 'teacher', 'group', 'year');
    expect(state.revision).toBe(2);
    expect(state.events[0].startedAt).toBeTruthy();
    expect(state.events[0].clues[0].revealed).toBe(true);
    expect(() => getState(db, 'other-teacher', 'group', 'year')).toThrowError(expect.objectContaining({ code: 'NOT_FOUND' }));
    expect(() => executeCommand(db, 'teacher', 'other-group', 'other-year', 't1_el_apagon', 'START', { expectedRevision: 0 }, keys[2])).toThrowError(expect.objectContaining({ code: 'NOT_FOUND' }));
    expect(getState(db, 'other-teacher', 'other-group', 'other-year').revision).toBe(0);
    db.close();
  });

  it('permits one CAS winner and rejects the stale transition without partial writes', () => {
    const db = database();
    executeCommand(db, 'teacher', 'group', 'year', 't1_el_apagon', 'START', { expectedRevision: 0 }, keys[0]);
    expect(() => executeCommand(db, 'teacher', 'group', 'year', 't1_el_apagon', 'START', { expectedRevision: 0 }, keys[1])).toThrowError(expect.objectContaining({ code: 'CONFLICT' }));
    expect(db.prepare('SELECT revision FROM narrative_group_state').get()).toEqual({ revision: 1 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM narrative_group_events').get()).toEqual({ count: 1 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM narrative_command_requests').get()).toEqual({ count: 1 });
    db.close();
  });

  it('replays an idempotent command, rejects changed key reuse, and rejects archived writes', () => {
    const db = database();
    const first = executeCommand(db, 'teacher', 'group', 'year', 't1_el_apagon', 'START', { expectedRevision: 0 }, keys[0]);
    const replay = executeCommand(db, 'teacher', 'group', 'year', 't1_el_apagon', 'START', { expectedRevision: 0 }, keys[0]);
    expect(first.replay).toBe(false);
    expect(replay.replay).toBe(true);
    expect(replay.status).toBe(first.status);
    expect(replay.body).toEqual(first.body);
    expect(db.prepare('SELECT COUNT(*) AS count FROM narrative_group_events').get()).toEqual({ count: 1 });
    expect(() => executeCommand(db, 'teacher', 'group', 'year', 't1_el_mensaje', 'START', { expectedRevision: 0 }, keys[0])).toThrowError(expect.objectContaining({ code: 'CONFLICT' }));
    db.prepare('UPDATE academic_years SET archived_at=? WHERE id=?').run('now', 'year');
    expect(() => executeCommand(db, 'teacher', 'group', 'year', 't1_el_apagon', 'REVEAL_NEXT_CLUE', { expectedRevision: 1 }, keys[1])).toThrowError(expect.objectContaining({ code: 'CONFLICT' }));
    expect(getState(db, 'teacher', 'group', 'year').revision).toBe(1);
    db.close();
  });

  it('rolls back head, event, and receipt when response composition fails before receipt', () => {
    const db = database();
    expect(() => executeCommand(db, 'other-teacher', 'other-group', 'other-year', 't1_el_apagon', 'START', { expectedRevision: 0 }, keys[0], { failBeforeReceipt: true })).toThrow('injected pre-receipt failure');
    expect(db.prepare("SELECT COUNT(*) AS count FROM narrative_group_state WHERE group_id='other-group'").get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM narrative_group_events WHERE group_id='other-group'").get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM narrative_command_requests WHERE group_id='other-group'").get()).toEqual({ count: 0 });
    expect(executeCommand(db, 'other-teacher', 'other-group', 'other-year', 't1_el_apagon', 'START', { expectedRevision: 0 }, keys[0]).replay).toBe(false);
    db.close();
  });

  it('does not mutate academic, gamification, challenge, or minigame tables while rejecting an invalid link', () => {
    const db = database();
    executeCommand(db, 'teacher', 'group', 'year', 't1_el_apagon', 'START', { expectedRevision: 0 }, keys[0]);
    const before = countsOutsideNarrative(db);
    expect(() => executeCommand(db, 'teacher', 'group', 'year', 't1_el_apagon', 'LINK', { expectedRevision: 1, link: { kind: 'CHALLENGE', id: '00000000-0000-4000-8000-000000000099' } }, keys[1])).toThrowError(expect.objectContaining({ code: 'CONFLICT' }));
    expect(countsOutsideNarrative(db)).toEqual(before);
    expect(db.prepare('SELECT revision FROM narrative_group_state').get()).toEqual({ revision: 1 });
    db.close();
  });
});
