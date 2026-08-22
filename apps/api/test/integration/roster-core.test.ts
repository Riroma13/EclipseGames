import { afterEach, describe, expect, it } from 'vitest';
import { rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';
import { batchBodySchema, studentDraftSchema, uuidSchema, yearBodySchema } from '../../src/roster/routes.js';
import { AVATARS, correctStudentGroup, createStudents, lockStudentGroupCorrection } from '../../src/roster/service.js';
import { ApiError } from '../../src/http/errors.js';
import { createServer } from '../../src/server.js';

const databases: Database.Database[] = [];
const ids = { teacher: 'teacher-1', year: 'year-1', group: 'group-1' };
function db() { const value = new Database(':memory:'); value.pragma('foreign_keys = ON'); migrateDatabase(value, migrations); value.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run(ids.teacher, 'teacher@example.test', 'hash', '2026-01-01'); value.prepare('INSERT INTO academic_years VALUES (?, ?, ?, ?, ?, ?, ?)').run(ids.year, ids.teacher, '2026-2027', '2026-09-01', '2027-07-01', null, '2026-01-01'); value.prepare('INSERT INTO groups VALUES (?, ?, ?, ?, ?)').run(ids.group, ids.teacher, ids.year, 'Group A', '2026-01-01'); databases.push(value); return value; }
afterEach(() => { for (const value of databases.splice(0)) value.close(); });

describe('roster contracts and core boundaries', () => {
  it('trims body values and rejects invalid UUID, empty values, and enums', () => {
    expect(uuidSchema.safeParse('not-an-id').success).toBe(false);
    expect(yearBodySchema.parse({ label: '  Year  ', startsOn: '2026-09-01', endsOn: '2027-07-01' }).label).toBe('Year');
    expect(studentDraftSchema.safeParse({ realName: ' ', alias: 'A' }).success).toBe(false);
    expect(studentDraftSchema.safeParse({ realName: 'Ada', alias: 'A', avatar: 'invalid' }).success).toBe(false);
  });

  it('accepts at most 30 drafts and rolls back an atomic batch on conflict', () => {
    const value = db();
    const draft = { realName: 'Ada', alias: 'Ada' } as const;
    expect(batchBodySchema.safeParse({ students: Array.from({ length: 31 }, () => draft) }).success).toBe(false);
    createStudents(value, ids.teacher, ids.group, [draft]);
    expect(() => createStudents(value, ids.teacher, ids.group, [{ ...draft, alias: 'Grace' }, { ...draft, alias: 'Ada' }])).toThrow();
    expect(value.prepare('SELECT COUNT(*) AS count FROM students').get()).toEqual({ count: 1 });
  });

  it('locks correction idempotently at the roster boundary', () => {
    const value = db();
    createStudents(value, ids.teacher, ids.group, [{ realName: 'Ada', alias: 'Ada' }]);
    const student = value.prepare('SELECT id FROM students').get() as { id: string };
    const first = lockStudentGroupCorrection(value, ids.teacher, student.id);
    const second = lockStudentGroupCorrection(value, ids.teacher, student.id);
    expect(first.groupCorrectionLockedAt).toBeTruthy();
    expect(second.groupCorrectionLockedAt).toBe(first.groupCorrectionLockedAt);
  });

  it('rejects every correction boundary failure without changing membership', () => {
    const value = db();
    value.prepare('INSERT INTO groups VALUES (?, ?, ?, ?, ?)').run('group-2', ids.teacher, ids.year, 'Group B', '2026-01-01');
    value.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run('teacher-2', 'other@example.test', 'hash', '2026-01-01');
    value.prepare('INSERT INTO academic_years VALUES (?, ?, ?, ?, ?, ?, ?)').run('year-2', 'teacher-2', '2027-2028', '2027-09-01', '2028-07-01', null, '2026-01-01');
    value.prepare('INSERT INTO groups VALUES (?, ?, ?, ?, ?)').run('group-other', 'teacher-2', 'year-2', 'Other', '2026-01-01');
    createStudents(value, ids.teacher, ids.group, [{ realName: 'Ada', alias: 'Ada' }]);
    const student = value.prepare('SELECT id FROM students').get() as { id: string };
    const assertRejected = (target: string, code: string) => expect(() => correctStudentGroup(value, ids.teacher, student.id, target)).toThrowError(expect.objectContaining({ code }));
    assertRejected(ids.group, 'VALIDATION_FAILED');
    assertRejected('group-other', 'NOT_FOUND');
    expect(() => correctStudentGroup(value, ids.teacher, 'missing', 'group-2')).toThrowError(expect.objectContaining({ code: 'NOT_FOUND' }));
    value.prepare("UPDATE students SET group_correction_locked_at = '2026-02-01' WHERE id = ?").run(student.id);
    assertRejected('group-2', 'VALIDATION_FAILED');
    value.prepare('UPDATE students SET group_correction_locked_at = NULL WHERE id = ?').run(student.id);
    value.prepare("UPDATE academic_years SET archived_at = '2026-02-01' WHERE id = ?").run(ids.year);
    assertRejected('group-2', 'VALIDATION_FAILED');
    expect(value.prepare('SELECT group_id AS groupId FROM students WHERE id = ?').get(student.id)).toEqual({ groupId: ids.group });
  });

  it('maps SQLite uniqueness failures to CONFLICT', () => {
    const value = db();
    createStudents(value, ids.teacher, ids.group, [{ realName: 'Ada', alias: 'Ada' }]);
    try { createStudents(value, ids.teacher, ids.group, [{ realName: 'Grace', alias: 'ada' }]); } catch (error) { expect(error).toBeInstanceOf(ApiError); expect((error as ApiError).code).toBe('CONFLICT'); expect((error as ApiError).statusCode).toBe(409); }
  });

  it('runs the authenticated year, group, and batch workflow through Fastify', async () => {
    const filename = `/tmp/eclipse-roster-${randomUUID()}.sqlite`;
    const app = createServer(filename, { logger: false, bootstrapTeacher: { email: 'runtime@example.test', password: 'password' } });
    await app.ready();
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email: 'runtime@example.test', password: 'password' } });
    expect(login.statusCode).toBe(204);
    const cookie = Array.isArray(login.headers['set-cookie']) ? login.headers['set-cookie'][0] : login.headers['set-cookie'];
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: { cookie }, payload: { label: '  2027-2028  ', startsOn: '2027-09-01', endsOn: '2028-07-01' } });
    expect(year.statusCode).toBe(200);
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { cookie }, payload: { name: 'Group A' } });
    expect(group.statusCode).toBe(200);
    const students = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers: { cookie }, payload: { students: [{ realName: 'Ada Lovelace', alias: 'Ada' }] } });
    expect(students.statusCode).toBe(200);
    expect(students.json()[0]).toMatchObject({ realName: 'Ada Lovelace', alias: 'Ada', avatar: 'default' });
    await app.close();
    rmSync(filename, { force: true });
  });

  it('persists every permitted avatar through the authenticated API', async () => {
    const filename = `/tmp/eclipse-roster-avatars-${randomUUID()}.sqlite`;
    const app = createServer(filename, { logger: false, bootstrapTeacher: { email: 'avatars@example.test', password: 'password' } });
    await app.ready();
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email: 'avatars@example.test', password: 'password' } });
    expect(login.statusCode).toBe(204);
    const cookie = Array.isArray(login.headers['set-cookie']) ? login.headers['set-cookie'][0] : login.headers['set-cookie'];
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: { cookie }, payload: { label: '2028-2029', startsOn: '2028-09-01', endsOn: '2029-07-01' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { cookie }, payload: { name: 'Avatar Group' } });
    const students = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${group.json().id}/students`,
      headers: { cookie },
      payload: { students: AVATARS.map((avatar, index) => ({ realName: `Student ${index}`, alias: `Avatar ${index}`, avatar })) },
    });

    expect(students.statusCode).toBe(200);
    expect(students.json().map((student: { avatar: string }) => student.avatar)).toEqual([...AVATARS]);
    await app.close();
    rmSync(filename, { force: true });
  });
});
