import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import * as repository from './repository.js';

/** Narrow calendar seam: calendar validation receives only owned roster identity. */
export function getOwnedAcademicYearGroupContext(db: Database.Database, teacherId: string, yearId: string, groupId: string) {
  const group = repository.findGroup(db, groupId, teacherId);
  if (!group) throw new ApiError('NOT_FOUND', 404, 'Group not found.');
  const year = repository.findYear(db, group.academicYearId, teacherId);
  if (!year || year.id !== yearId) throw new ApiError('NOT_FOUND', 404, 'Group not found.');
  return { year, group };
}

/** Narrow XP attribution seam owned by the calendar boundary. */
export function getActiveOwnedRealClassSession(db: Database.Database, teacherId: string, yearId: string, groupId: string) {
  const row = db.prepare(`SELECT id, owner_teacher_id AS ownerTeacherId, academic_year_id AS academicYearId,
    group_id AS groupId, term_id AS termId FROM real_class_sessions
    WHERE owner_teacher_id=? AND academic_year_id=? AND group_id=? AND ended_at IS NULL
    ORDER BY started_at DESC, id DESC LIMIT 1`).get(teacherId, yearId, groupId) as {id:string;ownerTeacherId:string;academicYearId:string;groupId:string;termId:string}|undefined;
  return row ? {...row, active:true} : null;
}
