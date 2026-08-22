import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { ApiError } from '../http/errors.js';
import { requireSession } from '../auth/routes.js';
import { findStudent, findStudents } from './repository.js';
import { toProjectionStudentDto, toTeacherStudentDto } from './mapper.js';

const idSchema = z.string().uuid();

function validId(value: string, label: string) {
  if (!idSchema.safeParse(value).success) throw new ApiError('VALIDATION_FAILED', 400, `Invalid ${label}.`);
  return value;
}

function teacherRecords(database: Database.Database, teacherId: string, groupId: string) {
  const records = findStudents(database, groupId);
  if (records.length === 0) throw new ApiError('NOT_FOUND', 404, 'Group not found.');
  if (records.some((record) => record.ownerTeacherId !== teacherId)) throw new ApiError('FORBIDDEN', 403, 'Access denied.');
  return records;
}

export function registerProjectionRoutes(app: FastifyInstance, database: Database.Database) {
  const session = requireSession(database);

  app.get('/api/v1/teacher/groups/:groupId/students', { preHandler: session }, async (request) => {
    const groupId = validId((request.params as { groupId: string }).groupId, 'group identifier');
    const teacherId = (request as typeof request & { teacherId: string }).teacherId;
    return teacherRecords(database, teacherId, groupId).map(toTeacherStudentDto);
  });

  app.get('/api/v1/projection/groups/:groupId/students', { preHandler: session }, async (request) => {
    const groupId = validId((request.params as { groupId: string }).groupId, 'group identifier');
    const teacherId = (request as typeof request & { teacherId: string }).teacherId;
    const records = teacherRecords(database, teacherId, groupId);
    return records.map((record) => toProjectionStudentDto(record));
  });

  app.get('/api/v1/projection/groups/:groupId/students/:studentId', { preHandler: session }, async (request) => {
    const params = request.params as { groupId: string; studentId: string };
    const groupId = validId(params.groupId, 'group identifier');
    const studentId = validId(params.studentId, 'student identifier');
    const teacherId = (request as typeof request & { teacherId: string }).teacherId;
    const records = teacherRecords(database, teacherId, groupId);
    const record = findStudent(database, groupId, studentId);
    if (!record || !records.some((candidate) => candidate.id === record.id)) throw new ApiError('NOT_FOUND', 404, 'Student not found.');
    const query = request.query as { showStudent?: string };
    return toProjectionStudentDto(record, query.showStudent === 'true');
  });
}
