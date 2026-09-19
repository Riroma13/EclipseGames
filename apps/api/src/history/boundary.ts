import type Database from 'better-sqlite3';
import { findGroup } from '../roster/repository.js';
import { ApiError } from '../http/errors.js';
export function assertOwnedHistoryScope(db:Database.Database, ownerTeacherId:string, groupId:string, academicYearId:string, studentId?:string, termId?:string) {
  const group=findGroup(db,groupId,ownerTeacherId);
  if(!group || group.academicYearId!==academicYearId) throw new ApiError('NOT_FOUND',404,'Resource not found.');
  if(studentId && !db.prepare('SELECT s.id FROM students s WHERE s.id = ? AND s.group_id = ?').get(studentId,groupId)) throw new ApiError('NOT_FOUND',404,'Resource not found.');
  if(termId && !db.prepare('SELECT id FROM academic_terms WHERE id = ? AND academic_year_id = ? AND owner_teacher_id = ?').get(termId,group.academicYearId,ownerTeacherId)) throw new ApiError('NOT_FOUND',404,'Resource not found.');
  return group;
}
