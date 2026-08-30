import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { migrateDatabase } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';
import { DEMO_GROUP, DEMO_STUDENTS, DEMO_YEAR, seedDemo } from '../../src/demo/seed-service.js';
import { ensureOwnedDemoRoster } from '../../src/roster/service.js';

const databases: Database.Database[] = [];
function db() { const value = new Database(':memory:'); value.pragma('foreign_keys = ON'); migrateDatabase(value, migrations); value.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run('teacher-demo', 'teacher@example.test', 'hash', '2026-01-01'); databases.push(value); return value; }
afterEach(() => { for (const value of databases.splice(0)) value.close(); });

describe('service-owned demo seed', () => {
  it('refuses production before opening the configured database', () => {
    const filename = `/tmp/eclipse-demo-production-${randomUUID()}.sqlite`;
    const result = spawnSync('pnpm', ['seed:demo'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: filename }, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain('Demo seed refused in production.');
    expect(existsSync(filename)).toBe(false);
  }, 15_000);

  it('creates the fixed fictional roster and points through owned services and replays safely', () => {
    const value = db();
    const first = seedDemo(value, 'teacher-demo');
    const counts = () => ({ years: value.prepare('SELECT COUNT(*) AS count FROM academic_years').get(), groups: value.prepare('SELECT COUNT(*) AS count FROM groups').get(), students: value.prepare('SELECT COUNT(*) AS count FROM students').get(), events: value.prepare('SELECT COUNT(*) AS count FROM xp_evidence_events').get() });
    const before = counts();
    const second = seedDemo(value, 'teacher-demo');
    expect(first.roster.year.id).toBe(DEMO_YEAR.id);
    expect(first.roster.group.id).toBe(DEMO_GROUP.id);
    expect(first.roster.students).toHaveLength(16);
    expect(new Set(first.roster.students.map((student) => student.specialty)).size).toBe(8);
    expect(first.events).toHaveLength(64);
    expect(second.events.every((event) => event.replay)).toBe(true);
    expect(second.coinGrants.every((grant) => grant.replay)).toBe(true);
    expect(counts()).toEqual(before);
    expect(value.prepare('SELECT COUNT(*) AS count FROM coin_rewards').get()).toEqual({ count: 2 });
    expect(value.prepare('SELECT SUM(amount) AS balance FROM coin_ledger WHERE student_id=? AND academic_year_id=?').get(DEMO_STUDENTS[0].id, DEMO_YEAR.id)).toEqual({ balance: 2 });
    const expectedTotals = [9, 12, 28, 6, 6, 12, 2, 12, 5, 24, 28, 10, 9, 24, 4, 21];
    const expectedBadges = [1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1];
    const expectedBalances = [2, 0, 1, 3, 0, 1, 0, 3, 0, 1, 2, 0, 1, 0, 3, 0];
    DEMO_STUDENTS.forEach((student, index) => {
      expect(value.prepare('SELECT COALESCE(SUM(effective_xp),0) AS total FROM xp_evidence_events WHERE student_id=? AND academic_year_id=?').get(student.id, DEMO_YEAR.id)).toEqual({ total: expectedTotals[index] });
      expect(value.prepare('SELECT COUNT(*) AS count FROM xp_badge_unlocks WHERE student_id=? AND academic_year_id=? AND active=1').get(student.id, DEMO_YEAR.id)).toEqual({ count: expectedBadges[index] });
      expect(value.prepare('SELECT COALESCE(SUM(amount),0) AS balance FROM coin_ledger WHERE student_id=? AND academic_year_id=?').get(student.id, DEMO_YEAR.id)).toEqual({ balance: expectedBalances[index] });
    });
    expect(value.prepare('SELECT COUNT(*) AS count FROM xp_evidence_events WHERE specialty_bonus_xp=1').get()).toEqual({ count: 64 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM coin_rewards').get()).toEqual({ count: 2 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM coin_ledger').get()).toEqual({ count: 17 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM xp_level_unlocks WHERE active=1 AND level=3').get()).toEqual({ count: 2 });
    expect(value.prepare('SELECT id,source FROM coin_ledger ORDER BY id').all()).toEqual(expect.arrayContaining([
      { id: '7c2f1a90-5d44-4c61-8f20-202620270001', source: 'PERSONAL_IMPROVEMENT' },
      { id: '7c2f1a90-5d44-4c61-8f20-202620270002', source: 'EXCEPTIONAL_FRENCH' },
      { id: '7c2f1a90-5d44-4c61-8f20-202620270003', source: 'EXCEPTIONAL_COLLABORATION' },
    ]));
  });

  it('preflights collisions before creating any missing row', () => {
    const value = db();
    value.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run('other-teacher', 'other@example.test', 'hash', '2026-01-01');
    value.prepare('INSERT INTO academic_years VALUES (?, ?, ?, ?, ?, ?, ?)').run(DEMO_YEAR.id, 'other-teacher', DEMO_YEAR.label, DEMO_YEAR.startsOn, DEMO_YEAR.endsOn, null, '2026-01-01');
    expect(() => ensureOwnedDemoRoster(value, 'teacher-demo', { year: DEMO_YEAR, group: DEMO_GROUP, students: DEMO_STUDENTS })).toThrow(/academic year owner/);
    expect(value.prepare('SELECT COUNT(*) AS count FROM groups').get()).toEqual({ count: 0 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM students').get()).toEqual({ count: 0 });
  });

  it('fails closed when a fixed points grant identity is occupied', () => {
    const value = db();
    value.prepare('INSERT INTO academic_years VALUES (?, ?, ?, ?, ?, ?, ?)').run(DEMO_YEAR.id, 'teacher-demo', DEMO_YEAR.label, DEMO_YEAR.startsOn, DEMO_YEAR.endsOn, null, '2026-01-01');
    value.prepare('INSERT INTO groups VALUES (?, ?, ?, ?, ?)').run(DEMO_GROUP.id, 'teacher-demo', DEMO_YEAR.id, DEMO_GROUP.name, '2026-01-01');
    value.prepare('INSERT INTO students VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(DEMO_STUDENTS[0].id, DEMO_GROUP.id, DEMO_STUDENTS[0].realName, DEMO_STUDENTS[0].alias, DEMO_STUDENTS[0].avatar, DEMO_STUDENTS[0].specialty, null, null, '2026-01-01');
    value.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,created_at) VALUES (?,?,?,?,?,?)').run('7c2f1a90-5d44-4c61-8f20-202620270001', DEMO_STUDENTS[0].id, DEMO_YEAR.id, 1, 'SPECIAL_CHALLENGE', '2026-01-01');
    expect(() => seedDemo(value, 'teacher-demo')).toThrow(/Demo coin collision/);
    expect(value.prepare('SELECT COUNT(*) AS count FROM academic_years').get()).toEqual({ count: 1 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM coin_ledger').get()).toEqual({ count: 1 });
  });

  it('does not mutate unrelated existing data when the fixed plan collides', () => {
    const value = db();
    value.prepare('INSERT INTO academic_years VALUES (?, ?, ?, ?, ?, ?, ?)').run('unrelated-year', 'teacher-demo', 'Unrelated', '2025-09-01', '2026-07-01', null, '2026-01-01');
    value.prepare('INSERT INTO groups VALUES (?, ?, ?, ?, ?)').run('unrelated-group', 'teacher-demo', 'unrelated-year', 'Unrelated group', '2026-01-01');
    value.prepare('INSERT INTO students VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('unrelated-student', 'unrelated-group', 'Unrelated Student', 'Unrelated', 'default', 'Leader', null, null, '2026-01-01');
    expect(() => seedDemo(value, 'teacher-demo')).not.toThrow();
    expect(value.prepare('SELECT real_name AS realName, alias FROM students WHERE id=?').get('unrelated-student')).toEqual({ realName: 'Unrelated Student', alias: 'Unrelated' });
  });

  it('rolls back the complete seed transaction when a later fixed write fails', () => {
    const value = db();
    value.prepare(`CREATE TRIGGER fail_demo_coin_insert BEFORE INSERT ON coin_ledger WHEN NEW.id='7c2f1a90-5d44-4c61-8f20-202620270003' BEGIN SELECT RAISE(ABORT, 'synthetic seed failure'); END`).run();
    expect(() => seedDemo(value, 'teacher-demo')).toThrow('synthetic seed failure');
    expect(value.prepare('SELECT COUNT(*) AS count FROM academic_years').get()).toEqual({ count: 0 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM groups').get()).toEqual({ count: 0 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM students').get()).toEqual({ count: 0 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM xp_evidence_events').get()).toEqual({ count: 0 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM coin_ledger').get()).toEqual({ count: 0 });
  });
});
