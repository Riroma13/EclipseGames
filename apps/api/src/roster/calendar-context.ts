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
