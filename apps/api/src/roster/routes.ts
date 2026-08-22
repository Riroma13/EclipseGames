import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { requireSession } from '../auth/routes.js';
import { validateBody } from '../http/validation.js';
import * as service from './service.js';
import { toAcademicYearDto, toGroupDto, toTeacherStudentDto } from './mapper.js';

export const uuidSchema = z.string().uuid();
export const yearBodySchema = z.object({ label: z.string().trim().min(1), startsOn: z.string().date(), endsOn: z.string().date() });
const yearPatch = yearBodySchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
export const groupBodySchema = z.object({ name: z.string().trim().min(1) });
export const studentDraftSchema = z.object({ realName: z.string().trim().min(1), alias: z.string().trim().min(1), avatar: z.enum(service.AVATARS).default('default'), specialty: z.enum(service.SPECIALTIES).nullable().optional() });
export const batchBodySchema = z.object({ students: z.array(studentDraftSchema).min(1).max(30) });
const studentPatch = studentDraftSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
const correctionBody = z.object({ groupId: uuidSchema });
const params = (request: FastifyRequest) => request.params as Record<string, string>;
const resourceId = (request: FastifyRequest, key = 'id') => uuidSchema.parse(params(request)[key]);
const teacher = (request: FastifyRequest) => (request as FastifyRequest & { teacherId: string }).teacherId;
const includeArchived = (request: FastifyRequest) => z.object({ includeArchived: z.enum(['true', 'false']).default('false') }).parse(request.query).includeArchived === 'true';

export function registerRosterRoutes(app: FastifyInstance, db: Database.Database) {
  const session = requireSession(db);
  app.post('/api/v1/academic-years', { preHandler: [session, validateBody(yearBodySchema)] }, async (request) => toAcademicYearDto(service.createYear(db, teacher(request), yearBodySchema.parse(request.body))));
  app.get('/api/v1/academic-years', { preHandler: session }, async (request) => service.listAcademicYears(db, teacher(request), includeArchived(request)).map(toAcademicYearDto));
  app.patch('/api/v1/academic-years/:id', { preHandler: [session, validateBody(yearPatch)] }, async (request) => { const id = resourceId(request); const value = yearPatch.parse(request.body); const current = service.getYearForPatch(db, teacher(request), id); return toAcademicYearDto(service.updateYear(db, teacher(request), id, { label: value.label ?? current.label, startsOn: value.startsOn ?? current.startsOn, endsOn: value.endsOn ?? current.endsOn })); });
  app.post('/api/v1/academic-years/:id/archive', { preHandler: session }, async (request, reply) => { service.archiveAcademicYear(db, teacher(request), resourceId(request)); return reply.code(204).send(); });
  app.post('/api/v1/academic-years/:id/groups', { preHandler: [session, validateBody(groupBodySchema)] }, async (request) => toGroupDto(service.createGroup(db, teacher(request), resourceId(request), groupBodySchema.parse(request.body).name)));
  app.get('/api/v1/academic-years/:id/groups', { preHandler: session }, async (request) => service.listAcademicGroups(db, teacher(request), resourceId(request)).map(toGroupDto));
  app.patch('/api/v1/groups/:id', { preHandler: [session, validateBody(groupBodySchema)] }, async (request) => toGroupDto(service.updateGroup(db, teacher(request), resourceId(request), groupBodySchema.parse(request.body).name)));
  app.post('/api/v1/groups/:id/students', { preHandler: [session, validateBody(batchBodySchema)] }, async (request) => (service.createStudents(db, teacher(request), resourceId(request), batchBodySchema.parse(request.body).students)).map(toTeacherStudentDto));
  app.get('/api/v1/groups/:id/students', { preHandler: session }, async (request) => service.listGroupStudents(db, teacher(request), resourceId(request), includeArchived(request)).map(toTeacherStudentDto));
  app.get('/api/v1/students/:id', { preHandler: session }, async (request) => toTeacherStudentDto(service.getStudent(db, teacher(request), resourceId(request))));
  app.patch('/api/v1/students/:id', { preHandler: [session, validateBody(studentPatch)] }, async (request) => { const id = resourceId(request); const value = studentPatch.parse(request.body); const current = service.getStudent(db, teacher(request), id); return toTeacherStudentDto(service.updateStudent(db, teacher(request), id, { realName: value.realName ?? current.realName, alias: value.alias ?? current.alias, avatar: value.avatar ?? current.avatar as typeof service.AVATARS[number], specialty: value.specialty === undefined ? current.specialty as typeof service.SPECIALTIES[number] | null : value.specialty })); });
  app.post('/api/v1/students/:id/archive', { preHandler: session }, async (request, reply) => { service.archiveStudentRecord(db, teacher(request), resourceId(request)); return reply.code(204).send(); });
  app.patch('/api/v1/students/:id/group', { preHandler: [session, validateBody(correctionBody)] }, async (request) => toTeacherStudentDto(service.correctStudentGroup(db, teacher(request), resourceId(request), correctionBody.parse(request.body).groupId)));
}
