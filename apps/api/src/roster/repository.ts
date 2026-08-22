import type Database from 'better-sqlite3';

export type AcademicYearRecord = { id: string; ownerTeacherId: string; label: string; startsOn: string; endsOn: string; archivedAt: string | null; createdAt: string };
export type GroupRecord = { id: string; ownerTeacherId: string; academicYearId: string; name: string; createdAt: string };
export type StudentRecord = { id: string; groupId: string; realName: string; alias: string; avatar: string; specialty: string | null; archivedAt: string | null; groupCorrectionLockedAt: string | null; createdAt: string };

const yearFields = 'id, owner_teacher_id AS ownerTeacherId, label, starts_on AS startsOn, ends_on AS endsOn, archived_at AS archivedAt, created_at AS createdAt';
const groupFields = 'id, owner_teacher_id AS ownerTeacherId, academic_year_id AS academicYearId, name, created_at AS createdAt';
const studentFields = 'id, group_id AS groupId, real_name AS realName, alias, avatar, specialty, archived_at AS archivedAt, group_correction_locked_at AS groupCorrectionLockedAt, created_at AS createdAt';

export function findYear(db: Database.Database, id: string, ownerTeacherId?: string) { return db.prepare(`SELECT ${yearFields} FROM academic_years WHERE id = ? ${ownerTeacherId ? 'AND owner_teacher_id = ?' : ''}`).get(...(ownerTeacherId ? [id, ownerTeacherId] : [id])) as AcademicYearRecord | undefined; }
export function listYears(db: Database.Database, ownerTeacherId: string, includeArchived: boolean) { return db.prepare(`SELECT ${yearFields} FROM academic_years WHERE owner_teacher_id = ? ${includeArchived ? '' : 'AND archived_at IS NULL'} ORDER BY starts_on, id`).all(ownerTeacherId) as AcademicYearRecord[]; }
export function insertYear(db: Database.Database, value: AcademicYearRecord) { db.prepare('INSERT INTO academic_years (id, owner_teacher_id, label, starts_on, ends_on, archived_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(value.id, value.ownerTeacherId, value.label, value.startsOn, value.endsOn, value.archivedAt, value.createdAt); return value; }
export function updateYear(db: Database.Database, id: string, value: Pick<AcademicYearRecord, 'label' | 'startsOn' | 'endsOn'>) { db.prepare('UPDATE academic_years SET label = ?, starts_on = ?, ends_on = ? WHERE id = ?').run(value.label, value.startsOn, value.endsOn, id); }
export function archiveYear(db: Database.Database, id: string, archivedAt: string) { db.prepare('UPDATE academic_years SET archived_at = ? WHERE id = ? AND archived_at IS NULL').run(archivedAt, id); }

export function findGroup(db: Database.Database, id: string, ownerTeacherId?: string) { return db.prepare(`SELECT ${groupFields} FROM groups WHERE id = ? ${ownerTeacherId ? 'AND owner_teacher_id = ?' : ''}`).get(...(ownerTeacherId ? [id, ownerTeacherId] : [id])) as GroupRecord | undefined; }
export function listGroups(db: Database.Database, yearId: string, ownerTeacherId: string) { return db.prepare(`SELECT ${groupFields} FROM groups WHERE academic_year_id = ? AND owner_teacher_id = ? ORDER BY name COLLATE NOCASE, id`).all(yearId, ownerTeacherId) as GroupRecord[]; }
export function insertGroup(db: Database.Database, value: GroupRecord) { db.prepare('INSERT INTO groups (id, owner_teacher_id, academic_year_id, name, created_at) VALUES (?, ?, ?, ?, ?)').run(value.id, value.ownerTeacherId, value.academicYearId, value.name, value.createdAt); return value; }
export function updateGroup(db: Database.Database, id: string, name: string) { db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name, id); }

export function findStudent(db: Database.Database, id: string) { return db.prepare(`SELECT ${studentFields} FROM students WHERE id = ?`).get(id) as StudentRecord | undefined; }
export function findOwnedStudent(db: Database.Database, id: string, ownerTeacherId: string) { return db.prepare('SELECT s.id, s.group_id AS groupId, s.real_name AS realName, s.alias, s.avatar, s.specialty, s.archived_at AS archivedAt, s.group_correction_locked_at AS groupCorrectionLockedAt, s.created_at AS createdAt FROM students s JOIN groups g ON g.id = s.group_id JOIN academic_years y ON y.id = g.academic_year_id WHERE s.id = ? AND g.owner_teacher_id = ? AND y.owner_teacher_id = ?').get(id, ownerTeacherId, ownerTeacherId) as StudentRecord | undefined; }
export function listStudents(db: Database.Database, groupId: string, includeArchived: boolean) { return db.prepare(`SELECT ${studentFields} FROM students WHERE group_id = ? ${includeArchived ? '' : 'AND archived_at IS NULL'} ORDER BY alias COLLATE NOCASE, id`).all(groupId) as StudentRecord[]; }
export function insertStudent(db: Database.Database, value: StudentRecord) { db.prepare('INSERT INTO students (id, group_id, real_name, alias, avatar, specialty, archived_at, group_correction_locked_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(value.id, value.groupId, value.realName, value.alias, value.avatar, value.specialty, value.archivedAt, value.groupCorrectionLockedAt, value.createdAt); return value; }
export function updateStudent(db: Database.Database, id: string, value: Pick<StudentRecord, 'realName' | 'alias' | 'avatar' | 'specialty'>) { db.prepare('UPDATE students SET real_name = ?, alias = ?, avatar = ?, specialty = ? WHERE id = ?').run(value.realName, value.alias, value.avatar, value.specialty, id); }
export function archiveStudent(db: Database.Database, id: string, archivedAt: string) { db.prepare('UPDATE students SET archived_at = ? WHERE id = ? AND archived_at IS NULL').run(archivedAt, id); }
export function moveStudent(db: Database.Database, id: string, groupId: string) { db.prepare('UPDATE students SET group_id = ? WHERE id = ?').run(groupId, id); }
export function lockStudent(db: Database.Database, id: string, lockedAt: string) { db.prepare('UPDATE students SET group_correction_locked_at = COALESCE(group_correction_locked_at, ?) WHERE id = ?').run(lockedAt, id); }

export function withTransaction<T>(db: Database.Database, work: () => T) { return db.transaction(work)(); }
