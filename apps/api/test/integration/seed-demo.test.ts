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

  it('creates the fixed fictional roster through the roster and XP services and replays safely', () => {
    const value = db();
    const first = seedDemo(value, 'teacher-demo');
    const counts = () => ({ years: value.prepare('SELECT COUNT(*) AS count FROM academic_years').get(), groups: value.prepare('SELECT COUNT(*) AS count FROM groups').get(), students: value.prepare('SELECT COUNT(*) AS count FROM students').get(), events: value.prepare('SELECT COUNT(*) AS count FROM xp_evidence_events').get() });
    const before = counts();
    const second = seedDemo(value, 'teacher-demo');
    expect(first.roster.year.id).toBe(DEMO_YEAR.id);
    expect(first.roster.group.id).toBe(DEMO_GROUP.id);
    expect(first.roster.students).toHaveLength(16);
    expect(new Set(first.roster.students.map((student) => student.specialty)).size).toBe(8);
    expect(second.events.every((event) => event.replay)).toBe(true);
    expect(counts()).toEqual(before);
    expect(value.prepare('SELECT COUNT(*) AS count FROM xp_badge_unlocks WHERE active=1').get()).toEqual({ count: 1 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM xp_evidence_events WHERE specialty_bonus_xp=1').get()).toEqual({ count: 23 });
  });

  it('preflights collisions before creating any missing row', () => {
    const value = db();
    value.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run('other-teacher', 'other@example.test', 'hash', '2026-01-01');
    value.prepare('INSERT INTO academic_years VALUES (?, ?, ?, ?, ?, ?, ?)').run(DEMO_YEAR.id, 'other-teacher', DEMO_YEAR.label, DEMO_YEAR.startsOn, DEMO_YEAR.endsOn, null, '2026-01-01');
    expect(() => ensureOwnedDemoRoster(value, 'teacher-demo', { year: DEMO_YEAR, group: DEMO_GROUP, students: DEMO_STUDENTS })).toThrow(/academic year owner/);
    expect(value.prepare('SELECT COUNT(*) AS count FROM groups').get()).toEqual({ count: 0 });
    expect(value.prepare('SELECT COUNT(*) AS count FROM students').get()).toEqual({ count: 0 });
  });
});
