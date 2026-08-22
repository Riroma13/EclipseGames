import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';
import { createServer } from '../../src/server.js';

const databases: Database.Database[] = [];
const apps: Awaited<ReturnType<typeof createServer>>[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
});

function database() {
  const value = new Database(':memory:');
  value.pragma('foreign_keys = ON');
  migrateDatabase(value, migrations);
  databases.push(value);
  return value;
}

function seedTeacher(db: Database.Database, id = 'teacher-1') {
  db.prepare('INSERT INTO teacher_accounts (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(id, `${id}@example.test`, 'hash', '2026-01-01T00:00:00.000Z');
}

function seedYear(db: Database.Database, id = 'year-1', owner = 'teacher-1') {
  db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, owner, '2026-2027', '2026-09-01', '2027-07-01', '2026-01-01T00:00:00.000Z');
}

function seedGroup(db: Database.Database, id = 'group-1', year = 'year-1', owner = 'teacher-1') {
  db.prepare('INSERT INTO groups (id, owner_teacher_id, academic_year_id, name, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, owner, year, 'Première', '2026-01-01T00:00:00.000Z');
}

describe('academic roster persistence', () => {
  it('requires trimmed non-empty values while preserving display casing', () => {
    const db = database();
    seedTeacher(db);
    seedYear(db);
    seedGroup(db);

    expect(db.prepare('SELECT label FROM academic_years WHERE id = ?').get('year-1')).toMatchObject({ label: '2026-2027' });
    expect(db.prepare('SELECT name FROM groups WHERE id = ?').get('group-1')).toMatchObject({ name: 'Première' });
    expect(() => db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('year-empty', 'teacher-1', '   ', '2027-09-01', '2028-07-01', '2026-01-01T00:00:00.000Z')).toThrow();
  });

  it('enforces explicit ASCII NOCASE uniqueness for years and groups', () => {
    const db = database();
    seedTeacher(db);
    seedYear(db);
    seedGroup(db);

    expect(() => db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('year-duplicate', 'teacher-1', '2026-2027', '2027-09-01', '2028-07-01', '2026-01-01T00:00:00.000Z')).toThrow();
    expect(() => db.prepare('INSERT INTO groups (id, owner_teacher_id, academic_year_id, name, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('group-duplicate', 'teacher-1', 'year-1', 'première', '2026-01-01T00:00:00.000Z')).toThrow();
  });

  it('enforces active alias uniqueness, permits archived alias reuse, and preserves casing', () => {
    const db = database();
    seedTeacher(db);
    seedYear(db);
    seedGroup(db);
    const insert = db.prepare('INSERT INTO students (id, group_id, real_name, alias, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    insert.run('student-1', 'group-1', 'Ada Lovelace', 'Ada', 'default', '2026-01-01T00:00:00.000Z');
    expect(db.prepare('SELECT alias FROM students WHERE id = ?').get('student-1')).toMatchObject({ alias: 'Ada' });
    expect(() => insert.run('student-2', 'group-1', 'Grace Hopper', 'ada', 'default', '2026-01-01T00:00:00.000Z')).toThrow();
    db.prepare("UPDATE students SET archived_at = '2026-02-01T00:00:00.000Z' WHERE id = 'student-1'").run();
    expect(() => insert.run('student-2', 'group-1', 'Grace Hopper', 'Ada', 'default', '2026-01-01T00:00:00.000Z')).not.toThrow();
  });

  it('enforces dates, foreign keys, indexes, archive state, correction lock, timestamps, and RESTRICT references', () => {
    const db = database();
    seedTeacher(db);
    expect(() => db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('bad-year', 'teacher-1', 'bad', '2027-09-01', '2027-09-01', '2026-01-01T00:00:00.000Z')).toThrow();
    expect(() => db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('orphan-year', 'missing', 'orphan', '2026-09-01', '2027-07-01', '2026-01-01T00:00:00.000Z')).toThrow();
    seedYear(db);
    seedGroup(db);
    db.prepare("UPDATE academic_years SET archived_at = '2026-02-01T00:00:00.000Z' WHERE id = 'year-1'").run();
    db.prepare("UPDATE students SET group_correction_locked_at = '2026-02-02T00:00:00.000Z' WHERE id = 'missing-student'").run();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_academic_years_owner_archive_start'").get()).toBeTruthy();
    expect(() => db.prepare('DELETE FROM teacher_accounts WHERE id = ?').run('teacher-1')).toThrow();
    expect(db.prepare('PRAGMA table_info(students)').all()).not.toContainEqual(expect.objectContaining({ name: 'updated_at' }));
  });
});

describe('academic roster API integration', () => {
  const credentials = { email: 'teacher@example.test', password: 'correct horse battery staple' };
  const origin = 'http://localhost:5173';

  async function authenticatedApp() {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: credentials });
    apps.push(app);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
    return { app, cookie: login.headers['set-cookie'] };
  }

  it('enforces exact endpoint authentication, ownership-as-404, conflict, validation, and atomic batches', async () => {
    const { app, cookie } = await authenticatedApp();
    const anonymous = await app.inject({ method: 'GET', url: '/api/v1/academic-years', headers: { origin } });
    expect(anonymous.statusCode).toBe(401);
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: { origin, cookie }, payload: { label: '2026-2027', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
    expect(year.statusCode).toBe(200);
    const duplicateYear = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: { origin, cookie }, payload: { label: ' 2026-2027 ', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
    expect(duplicateYear.statusCode).toBe(409);
    const absent = await app.inject({ method: 'GET', url: '/api/v1/academic-years/00000000-0000-4000-8000-000000000099/groups', headers: { origin, cookie } });
    expect(absent.statusCode).toBe(404);
    const invalid = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { origin, cookie }, payload: { name: '   ' } });
    expect(invalid.statusCode).toBe(422);

    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { origin, cookie }, payload: { name: 'Group A' } });
    const batch = { students: [{ realName: 'Ada Lovelace', alias: 'Ada' }] };
    const created = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers: { origin, cookie }, payload: batch });
    expect(created.statusCode).toBe(200);
    const failedBatch = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers: { origin, cookie }, payload: { students: [{ realName: 'Grace Hopper', alias: 'Grace' }, { realName: 'Alan Turing', alias: 'Ada' }] } });
    expect(failedBatch.statusCode).toBe(409);
    const roster = await app.inject({ method: 'GET', url: `/api/v1/groups/${group.json().id}/students`, headers: { origin, cookie } });
    expect(roster.statusCode).toBe(200);
    expect(roster.json()).toHaveLength(1);
    expect(roster.json()[0]).toMatchObject({ realName: 'Ada Lovelace', alias: 'Ada' });
  });

  it('archives as a terminal write boundary while preserving authorized historical reads', async () => {
    const { app, cookie } = await authenticatedApp();
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: { origin, cookie }, payload: { label: '2027-2028', startsOn: '2027-09-01', endsOn: '2028-07-01' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { origin, cookie }, payload: { name: 'Group A' } });
    const student = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers: { origin, cookie }, payload: { students: [{ realName: 'Ada Lovelace', alias: 'Ada' }] } });
    const studentId = student.json()[0].id;
    const archive = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/archive`, headers: { origin, cookie } });
    expect(archive.statusCode).toBe(204);
    expect((await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/archive`, headers: { origin, cookie } })).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${group.json().id}/students`, headers: { origin, cookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}`, headers: { origin, cookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { origin, cookie }, payload: { name: 'Group B' } })).statusCode).toBe(422);
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/students/${studentId}`, headers: { origin, cookie }, payload: { alias: 'Ada Updated' } })).statusCode).toBe(422);
  });

  it('verifies correction target failures and preserves the stable student identifier', async () => {
    const { app, cookie } = await authenticatedApp();
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: { origin, cookie }, payload: { label: '2028-2029', startsOn: '2028-09-01', endsOn: '2029-07-01' } });
    const current = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { origin, cookie }, payload: { name: 'Current' } });
    const target = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { origin, cookie }, payload: { name: 'Target' } });
    const student = await app.inject({ method: 'POST', url: `/api/v1/groups/${current.json().id}/students`, headers: { origin, cookie }, payload: { students: [{ realName: 'Ada Lovelace', alias: 'Ada' }] } });
    const originalId = student.json()[0].id;
    const corrected = await app.inject({ method: 'PATCH', url: `/api/v1/students/${originalId}/group`, headers: { origin, cookie }, payload: { groupId: target.json().id } });
    expect(corrected.statusCode).toBe(200);
    expect(corrected.json()).toMatchObject({ id: originalId, groupId: target.json().id, realName: 'Ada Lovelace' });
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/students/${originalId}/group`, headers: { origin, cookie }, payload: { groupId: target.json().id } })).statusCode).toBe(422);
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/students/${originalId}/group`, headers: { origin, cookie }, payload: { groupId: '00000000-0000-4000-8000-000000000099' } })).statusCode).toBe(404);
  });
});
