import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import BetterSqlite3 from 'better-sqlite3';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import { createStudents } from '../roster/service.js';
import { getAvatar, getHistory, revertAvatar, updateAvatar } from './service.js';
import { availability } from './domain.js';

const dbs: BetterSqlite3.Database[] = [];
const tempDirs: string[] = [];
afterEach(() => { dbs.splice(0).forEach((db) => db.close()); tempDirs.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })); vi.restoreAllMocks(); });

const profile = { faceId: 'face-fox', skinToneId: 'skin-medium', hairId: 'hair-none', featureId: 'feature-none', clothingId: 'clothing-eclipse', accessoryId: 'accessory-none', frameId: 'frame-none', backgroundId: 'background-eclipse' } as const;
function setup(databasePath = ':memory:') {
  const db = new BetterSqlite3(databasePath); dbs.push(db); db.pragma('foreign_keys = ON'); migrateDatabase(db);
  db.prepare('INSERT INTO teacher_accounts VALUES (?, ?, ?, ?)').run('teacher', 'teacher@test', 'hash', 'now');
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run('year', 'teacher', '2026', '2026-09-01', '2027-07-01', 'now');
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run('group', 'teacher', 'year', 'A', 'now');
  const student = createStudents(db, 'teacher', 'group', [{ realName: 'Ada', alias: 'A' }])[0];
  return { db, studentId: student.id };
}
const input = (studentId: string, key: string, expectedRevision = 1) => ({ ownerTeacherId: 'teacher', studentId, academicYearId: 'year', expectedRevision, idempotencyKey: key, profile });

describe('avatar persistence and service', () => {
  it('appends updates, returns exact replays, and rejects conflicting key reuse', async () => {
    const { db, studentId } = setup();
    const first = await updateAvatar(db, input(studentId, '00000000-0000-4000-8000-000000000001'));
    expect(first.revision).toBe(2);
    expect(await updateAvatar(db, input(studentId, '00000000-0000-4000-8000-000000000001'))).toMatchObject({ revision: 2, replay: true, profile });
    await expect(updateAvatar(db, { ...input(studentId, '00000000-0000-4000-8000-000000000001'), profile: { ...profile, faceId: 'face-owl' } })).rejects.toThrow(/Idempotency/);
    expect(getHistory(db, 'teacher', studentId, 'year')).toHaveLength(2);
  });

  it('rejects stale writes without creating a revision and appends a revert snapshot', async () => {
    const { db, studentId } = setup();
    await updateAvatar(db, input(studentId, '00000000-0000-4000-8000-000000000002'));
    await expect(updateAvatar(db, input(studentId, '00000000-0000-4000-8000-000000000003'))).rejects.toThrow(/stale/i);
    const reverted = revertAvatar(db, { ...input(studentId, '00000000-0000-4000-8000-000000000004', 2), targetRevision: 1, reason: 'Restaurar la versión inicial' });
    expect(reverted).toMatchObject({ revision: 3, profile: { faceId: 'face-human' } });
    expect(getHistory(db, 'teacher', studentId, 'year')[0]).toMatchObject({ revision: 3, operation: 'REVERT', revertedFromRevision: 1 });
    expect(getAvatar(db, 'teacher', studentId, 'year')).toMatchObject({ revision: 3, profile: { faceId: 'face-human' } });
  });

  it('hides ownership and makes archived profiles read-only', async () => {
    const { db, studentId } = setup();
    expect(() => getAvatar(db, 'other-teacher', studentId, 'year')).toThrow(/not found/i);
    db.prepare('UPDATE students SET archived_at=? WHERE id=?').run('archived', studentId);
    expect(getAvatar(db, 'teacher', studentId, 'year')).toMatchObject({ revision: 1 });
    await expect(updateAvatar(db, input(studentId, '00000000-0000-4000-8000-000000000005'))).rejects.toThrow(/read-only/i);
  });

  it('requires UUID-v4 keys and rejects invalid catalogue profiles', async () => {
    const { db, studentId } = setup();
    await expect(updateAvatar(db, input(studentId, 'not-a-uuid'))).rejects.toThrow(/UUID-v4/);
    await expect(updateAvatar(db, { ...input(studentId, '00000000-0000-4000-8000-000000000006'), profile: { ...profile, faceId: 'face-invalid' } })).rejects.toThrow(/catalogue/i);
  });

  it('forwards the real student ID to avatar availability checks and awaits delayed decisions', async () => {
    const { db, studentId } = setup();
    const allows = vi.spyOn(availability, 'allows').mockImplementation(async (_checkedStudentId, itemId) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return itemId !== 'face-invalid';
    });

    await updateAvatar(db, input(studentId, '00000000-0000-4000-8000-000000000007'));

    expect(allows).toHaveBeenCalledTimes(8);
    expect(allows.mock.calls.map(([checkedStudentId]) => checkedStudentId)).toEqual(Array(8).fill(studentId));
  });

  it('rejects a profile when async availability denies an item', async () => {
    const { db, studentId } = setup();
    vi.spyOn(availability, 'allows').mockResolvedValue(false);

    await expect(updateAvatar(db, input(studentId, '00000000-0000-4000-8000-000000000008'))).rejects.toThrow(/catalogue/i);
    expect(getHistory(db, 'teacher', studentId, 'year')).toHaveLength(1);
  });

  it('serializes same-start writes with one success and one typed stale conflict', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'eclipse-avatar-')); tempDirs.push(directory);
    const first = setup(join(directory, 'avatar.sqlite'));
    const second = new BetterSqlite3(join(directory, 'avatar.sqlite'));
    second.pragma('foreign_keys = ON'); second.pragma('busy_timeout = 5000'); migrateDatabase(second, migrations); dbs.push(second);
    first.db.pragma('busy_timeout = 5000');
    expect(second.prepare('SELECT COUNT(*) AS count FROM students WHERE id=?').get(first.studentId)).toEqual({ count: 1 });
    expect(second.prepare('SELECT COUNT(*) AS count FROM avatar_profiles WHERE student_id=?').get(first.studentId)).toEqual({ count: 1 });

    const results = await Promise.allSettled([
      updateAvatar(first.db, { ...input(first.studentId, randomUUID()), profile }),
      updateAvatar(second, { ...input(first.studentId, randomUUID()), profile: { ...profile, faceId: 'face-owl' } }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled').map((result) => result.value.revision)).toEqual([2]);
    const loser = results.find((result) => result.status === 'rejected');
    expect(loser).toMatchObject({ status: 'rejected', reason: { statusCode: 409 } });
    expect(first.db.prepare('SELECT current_revision AS revision FROM avatar_profiles WHERE student_id=?').get(first.studentId)).toEqual({ revision: 2 });
    expect(first.db.prepare('SELECT revision,face_id AS faceId,operation,actor_teacher_id AS actor FROM avatar_profile_versions WHERE profile_student_id=? ORDER BY revision').all(first.studentId)).toHaveLength(2);
    expect(first.db.prepare('SELECT COUNT(*) AS count FROM avatar_profile_requests WHERE student_id=?').get(first.studentId)).toEqual({ count: 1 });
    expect(first.db.prepare('SELECT face_id AS faceId,operation,actor_teacher_id AS actor FROM avatar_profile_versions WHERE profile_student_id=? AND revision=2').get(first.studentId)).toMatchObject({ faceId: expect.stringMatching(/^face-(fox|owl)$/), operation: 'UPDATE', actor: 'teacher' });
  });
});
