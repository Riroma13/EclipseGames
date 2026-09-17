import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { avatarProfileSchema } from '@eclipse/contracts';
import { requireSession } from '../auth/routes.js';
import { validateBody } from '../http/validation.js';
import * as avatar from './service.js';
import { avatarCatalogue } from './domain.js';
import { toAvatarHistory, toTeacherAvatar } from './mapper.js';
import { getSummary } from '../xp/service.js';

const uuid = z.string().uuid();
const querySchema = z.object({ academicYearId: uuid });
const updateSchema = z.object({ expectedRevision: z.number().int().positive(), profile: avatarProfileSchema }).strict();
const revertSchema = z.object({ expectedRevision: z.number().int().positive(), targetRevision: z.number().int().positive(), reason: z.string().trim().min(1).max(500) }).strict();
const studentId = (request: FastifyRequest) => uuid.parse((request.params as { studentId: string }).studentId);
const teacherId = (request: FastifyRequest) => (request as FastifyRequest & { teacherId: string }).teacherId;
const academicYearId = (request: FastifyRequest) => querySchema.parse(request.query).academicYearId;
const key = (request: FastifyRequest) => request.headers['idempotency-key'] as string;

function teacherDto(db: Database.Database, request: FastifyRequest, value: ReturnType<typeof avatar.getAvatar>) {
  const xp = getSummary(db, teacherId(request), value.studentId, value.academicYearId);
  return toTeacherAvatar(value, { annualEffectiveXp: xp.annualEffectiveXp, level: xp.level, progress: xp.progress, badges: xp.badges });
}

export function registerAvatarRoutes(app: FastifyInstance, db: Database.Database) {
  const session = requireSession(db);
  app.get('/api/v1/avatar-catalog', { preHandler: session }, async () => avatarCatalogue);
  app.get('/api/v1/students/:studentId/avatar', { preHandler: session }, async (request) => teacherDto(db, request, avatar.getAvatar(db, teacherId(request), studentId(request), academicYearId(request))));
  app.get('/api/v1/students/:studentId/avatar/history', { preHandler: session }, async (request) => avatar.getHistory(db, teacherId(request), studentId(request)).map(toAvatarHistory));
  app.put('/api/v1/students/:studentId/avatar', { preHandler: [session, validateBody(updateSchema)] }, async (request) => {
    const body = updateSchema.parse(request.body);
     const value = await avatar.updateAvatar(db, { ownerTeacherId: teacherId(request), studentId: studentId(request), academicYearId: academicYearId(request), expectedRevision: body.expectedRevision, idempotencyKey: key(request), profile: body.profile, availability: avatar.createContextualAvailability(db, teacherId(request)) });
    return teacherDto(db, request, value);
  });
  app.post('/api/v1/students/:studentId/avatar/revert', { preHandler: [session, validateBody(revertSchema)] }, async (request) => {
    const body = revertSchema.parse(request.body);
     const value = avatar.revertAvatar(db, { ownerTeacherId: teacherId(request), studentId: studentId(request), academicYearId: academicYearId(request), expectedRevision: body.expectedRevision, targetRevision: body.targetRevision, reason: body.reason, idempotencyKey: key(request), availability: avatar.createContextualAvailability(db, teacherId(request)) });
    return teacherDto(db, request, value as ReturnType<typeof avatar.getAvatar>);
  });
}
