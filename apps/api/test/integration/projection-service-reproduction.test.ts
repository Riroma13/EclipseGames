import { describe, expect, it } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import type Database from 'better-sqlite3';
import { migrateDatabase } from '../../src/db/migrate.js';
import { projectionDisplay } from '../../src/game/service.js';

function database(): Database.Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('foreign_keys = ON');
  migrateDatabase(db);

  db.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run('teacher', 'teacher@example.test', 'hash', 'now');
  db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('year', 'teacher', '2026', '2026-09-01', '2027-07-01', 'now');
  db.prepare('INSERT INTO groups VALUES (?, ?, ?, ?, ?)').run('group', 'teacher', 'year', 'Classroom', 'now');
  db.prepare('INSERT INTO narrative_group_state (group_id, academic_year_id, owner_teacher_id, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('group', 'year', 'teacher', 0, 'now', 'now');
  db.prepare('INSERT INTO classroom_challenges (id, owner_teacher_id, group_id, title, description, target, progress, status, show_on_projection, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('challenge', 'teacher', 'group', 'Completed challenge', '', 1, 1, 'COMPLETED', 0, 'now', 'now', 'now');
  return db;
}

describe('SPEC-0042 direct Projection service reproduction', () => {
  it('composes the available narrative when a completed hidden challenge is persisted', async () => {
    const db = database();
    try {
      const display = await projectionDisplay(db, 'teacher', 'group', null);

      expect(display.activeChallenge).toBeNull();
      expect(display.narrative?.title).toBe('El apagón');
      expect(display.scene).toBe('NARRATIVE');
    } finally {
      db.close();
    }
  });
});
