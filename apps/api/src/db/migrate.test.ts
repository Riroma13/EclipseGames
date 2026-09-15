import { describe, expect, it } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { migrations } from './migrations.js';
import { MigrationError, migrateDatabase } from './migrate.js';
import { createStudents } from '../roster/service.js';

function database() {
  const db = new BetterSqlite3(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
}

function roster(db: ReturnType<typeof database>, token = 'default') {
  db.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run('teacher', 'teacher@test', 'hash', 'now');
  db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('year', 'teacher', '2026', '2026-09-01', '2027-07-01', 'now');
  db.prepare('INSERT INTO groups VALUES (?, ?, ?, ?, ?)').run('group', 'teacher', 'year', 'A', 'now');
  db.prepare('INSERT INTO students (id, group_id, real_name, alias, avatar, specialty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('student', 'group', 'Ada', 'A', token, 'Leader', 'now');
}

describe('0017 avatar core migration', () => {
  it('supports fresh and populated installs, exact backfill, and inert repeat startup', () => {
    const fresh = database();
    expect(migrateDatabase(fresh).applied.at(-1)).toBe('0017_avatar_core');
    expect(fresh.prepare('SELECT COUNT(*) AS count FROM avatar_profiles').get()).toEqual({ count: 0 });
    expect(migrateDatabase(fresh).applied).toEqual([]);

    const populated = database();
    migrateDatabase(populated, migrations.slice(0, -1));
    dbTokens().forEach((token, index) => {
      if (index === 0) roster(populated, token);
      else populated.prepare('INSERT INTO students (id, group_id, real_name, alias, avatar, specialty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(`student-${index}`, 'group', `Student ${index}`, `S${index}`, token, null, 'now');
    });
    migrateDatabase(populated);
    expect(populated.prepare('SELECT profile_student_id AS id, face_id AS face, hair_id AS hair FROM avatar_profile_versions ORDER BY id').all()).toEqual([
      { id: 'student', face: 'face-human', hair: 'hair-short' },
      { id: 'student-1', face: 'face-fox', hair: 'hair-none' },
      { id: 'student-2', face: 'face-owl', hair: 'hair-none' },
      { id: 'student-3', face: 'face-cat', hair: 'hair-none' },
      { id: 'student-4', face: 'face-wolf', hair: 'hair-none' },
    ]);
    expect(migrateDatabase(populated).applied).toEqual([]);
    fresh.close(); populated.close();
  });

  it('creates the required constraints, composite head reference, and indexes', () => {
    const db = database(); migrateDatabase(db);
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_avatar_%' ORDER BY name").all();
    expect(indexes).toEqual([{ name: 'idx_avatar_profile_requests_student_created' }, { name: 'idx_avatar_profile_versions_student_created' }]);
    expect(() => db.prepare("INSERT INTO avatar_profile_versions (profile_student_id, revision, face_id, skin_tone_id, hair_id, feature_id, clothing_id, accessory_id, frame_id, background_id, operation, actor_teacher_id, created_at) VALUES ('missing', 1, 'invalid', 'skin-medium', 'hair-none', 'feature-none', 'clothing-eclipse', 'accessory-none', 'frame-none', 'background-eclipse', 'BACKFILL', 'missing', 'now')").run()).toThrow();
    db.close();
  });

  it('fails closed and rolls back all avatar objects for bad legacy data', () => {
    const db = database(); migrateDatabase(db, migrations.slice(0, -1));
    roster(db); db.pragma('ignore_check_constraints = ON'); db.prepare("UPDATE students SET avatar='bad-token'").run(); db.pragma('ignore_check_constraints = OFF');
    expect(() => migrateDatabase(db)).toThrowError(MigrationError);
    expect(db.prepare("SELECT 1 FROM sqlite_master WHERE name IN ('avatar_profiles','avatar_profile_versions','avatar_profile_requests')").get()).toBeUndefined();
    expect(db.prepare("SELECT 1 FROM schema_migrations WHERE id='0017_avatar_core'").get()).toBeUndefined();
    db.close();
  });

  it('creates a default profile and revision in the student transaction', () => {
    const db = database(); migrateDatabase(db); rosterWithoutStudent(db);
    const created = createStudents(db, 'teacher', 'group', [{ realName: 'Bea', alias: 'B', avatar: 'fox' }]);
    const student = created[0];
    expect(student.avatar).toBe('default');
    expect(db.prepare('SELECT current_revision FROM avatar_profiles WHERE student_id=?').get(student.id)).toEqual({ current_revision: 1 });
    expect(db.prepare('SELECT operation, face_id FROM avatar_profile_versions WHERE profile_student_id=?').get(student.id)).toEqual({ operation: 'CREATE', face_id: 'face-human' });
    db.close();
  });
});

function dbTokens() { return ['default', 'fox', 'owl', 'cat', 'wolf']; }
function rosterWithoutStudent(db: ReturnType<typeof database>) {
  db.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run('teacher', 'teacher@test', 'hash', 'now');
  db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('year', 'teacher', '2026', '2026-09-01', '2027-07-01', 'now');
  db.prepare('INSERT INTO groups VALUES (?, ?, ?, ?, ?)').run('group', 'teacher', 'year', 'A', 'now');
}
