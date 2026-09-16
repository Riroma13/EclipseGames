import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { ApiError } from '../http/errors.js';
import { requireSession } from '../auth/routes.js';
import { composeClassroomCards, createClassroomCompositionPorts } from './classroom-composer.js';
import { toShowStudentDto } from './classroom-mapper.js';
import { LeaseError, LeaseRegistry, parseShowStudentTtlSeconds } from './lease-registry.js';
import type { ShowStudentDto } from '@eclipse/contracts';

const uuid = z.string().uuid();
const cardsQuery = z.object({ academicYearId: uuid }).strict();
const showBody = z.object({ studentId: uuid }).strict();
const exchangeBody = z.union([z.object({ token: z.string().min(1) }).strict(), z.object({ code: z.string().min(1) }).strict()]);
const keyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const teacher = (r: FastifyRequest) => (r as FastifyRequest & { teacherId:string }).teacherId;
const sessionId = (r: FastifyRequest) => (r as FastifyRequest & { sessionId:string }).sessionId;
const param = (r: FastifyRequest, name: string) => uuid.parse((r.params as Record<string,string>)[name]);
const noStore = (reply: FastifyReply) => reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer');
const safeError = (error: unknown): never => { if (error instanceof LeaseError) throw new ApiError(error.statusCode === 422 ? 'VALIDATION_FAILED' : error.statusCode === 429 ? 'AUTH_RATE_LIMITED' : error.statusCode === 409 ? 'CONFLICT' : 'NOT_FOUND', error.statusCode, error.statusCode === 422 || error.statusCode === 409 || error.statusCode === 429 ? error.message : 'Show Student access is unavailable.'); throw error; };

function context(db: Database.Database, owner: string, groupId: string, academicYearId?: string) {
  const row = db.prepare(`SELECT g.id AS groupId,g.academic_year_id AS academicYearId,g.owner_teacher_id AS ownerTeacherId,y.archived_at AS yearArchivedAt
    FROM groups g JOIN academic_years y ON y.id=g.academic_year_id WHERE g.id=? AND g.owner_teacher_id=? ${academicYearId ? 'AND g.academic_year_id=?' : ''}`).get(...(academicYearId ? [groupId, owner, academicYearId] : [groupId, owner])) as any;
  if (!row) throw new ApiError('NOT_FOUND', 404, 'Group not found.');
  return row as { groupId:string; academicYearId:string; ownerTeacherId:string; yearArchivedAt:string|null };
}

async function showDto(db: Database.Database, owner: string, lease: { studentId:string; groupId:string; expiresAt:string }): Promise<ShowStudentDto> {
  const c = context(db, owner, lease.groupId); const student = db.prepare('SELECT id FROM students WHERE id=? AND group_id=? AND archived_at IS NULL').get(lease.studentId, lease.groupId);
  if (!student || c.yearArchivedAt) throw new ApiError('NOT_FOUND', 404, 'Show Student access is unavailable.');
   const ports = createClassroomCompositionPorts(db, owner);
   const card = (await composeClassroomCards({ groupId: lease.groupId, academicYearId: c.academicYearId }, ports)).find(item => item.avatar.studentId === lease.studentId);
  if (!card) throw new ApiError('NOT_FOUND', 404, 'Show Student access is unavailable.');
   const rows = await ports.behaviour!.listCurrent({ groupId: lease.groupId, academicYearId: c.academicYearId }, [lease.studentId]);
   const behaviour = rows.find(row => row.studentId === lease.studentId)?.state;
   return toShowStudentDto(lease.expiresAt, card, behaviour);
}

export function registerProjectionRoutes(app: FastifyInstance, db: Database.Database, leases = new LeaseRegistry({ ttlSeconds: parseShowStudentTtlSeconds() })) {
  const session = requireSession(db);
   app.get('/api/v1/teacher/groups/:groupId/classroom-cards', { preHandler: session }, async (r, reply) => { const groupId = param(r, 'groupId'); const academicYearId = cardsQuery.parse(r.query).academicYearId; context(db, teacher(r), groupId, academicYearId); return noStore(reply).send(await composeClassroomCards({ groupId, academicYearId }, createClassroomCompositionPorts(db, teacher(r)))); });
  app.post('/api/v1/teacher/groups/:groupId/show-student', { preHandler: [session] }, async (r, reply) => {
    noStore(reply); const groupId = param(r, 'groupId'); const body = showBody.parse(r.body); const c = context(db, teacher(r), groupId); if (c.yearArchivedAt) throw new ApiError('CONFLICT', 409, 'Archived groups cannot issue Show Student access.');
    const student = db.prepare('SELECT id FROM students WHERE id=? AND group_id=? AND archived_at IS NULL').get(body.studentId, groupId); if (!student) throw new ApiError('NOT_FOUND', 404, 'Student not found.');
    const key = r.headers['idempotency-key']; if (typeof key !== 'string' || !keyPattern.test(key)) throw new ApiError('VALIDATION_FAILED', 422, 'A UUID v4 Idempotency-Key is required.');
    try {
      const material = leases.create({ teacherId: teacher(r), teacherSessionId: sessionId(r), groupId, studentId: body.studentId, idempotencyKey: key });
      if (material.replay) return reply.code(200).send(material);
      return reply.code(201).send({ accessCode: material.accessCode, accessUrl: material.accessUrl, expiresAt: material.expiresAt, showStudent: await showDto(db, teacher(r), material) });
    } catch (e) { return safeError(e); }
  });
  app.delete('/api/v1/teacher/groups/:groupId/show-student', { preHandler: session }, async (r, reply) => { noStore(reply); const key = r.headers['idempotency-key']; if (typeof key !== 'string' || !keyPattern.test(key)) throw new ApiError('VALIDATION_FAILED', 422, 'A UUID v4 Idempotency-Key is required.'); try { leases.revokeGroup({ teacherId: teacher(r), teacherSessionId: sessionId(r), groupId: param(r, 'groupId') }); } catch (e) { return safeError(e); } return reply.code(204).send(); });
  app.post('/api/v1/show-student/exchange', async (r, reply) => { noStore(reply); try { const body = exchangeBody.parse(r.body); const result = leases.exchange({ ...body, clientId: r.ip }); reply.setCookie('show-student', result.cookie, result.cookieOptions); return reply.code(204).send(); } catch (e) { return safeError(e); } });
   app.get('/api/v1/show-student', async (r, reply) => { noStore(reply); try { const cookie = (r as any).cookies?.['show-student']; if (!cookie) throw new LeaseError(404); const lease = leases.readViewer({ cookie }); return reply.send(await showDto(db, lease.teacherId ?? '', lease)); } catch (e) { return safeError(e); } });
  return leases;
}

export { showDto };
