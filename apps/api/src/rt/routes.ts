import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import { validateBody } from '../http/validation.js';
import { ApiError } from '../http/errors.js';
import { uuidSchema } from '../roster/routes.js';
import * as service from './service.js';
import type { GemSourceOrchestrator } from '../gems/source-orchestrator.js';
const value = z.union([z.literal(10), z.literal(5), z.literal(0), z.literal('ABSENT')]);
const body = z.object({ entries: z.array(z.object({ studentId: uuidSchema, value })) });
const params = (request: FastifyRequest) => request.params as Record<string, string>;
const teacher = (request: FastifyRequest) => (request as FastifyRequest & { teacherId: string }).teacherId;
export function registerRtRoutes(app: FastifyInstance, db: Database.Database, coordinator: GemSourceOrchestrator) {
  const session = requireSession(db);
  app.get('/api/v1/real-class-sessions/:sessionId/rt-entries', { preHandler: session }, async request => service.listEntries(db, teacher(request), uuidSchema.parse(params(request).sessionId)));
  app.post('/api/v1/real-class-sessions/:sessionId/rt-entries', { preHandler: [session, validateBody(body)] }, async (request, reply) => {
    const key = request.headers['idempotency-key'];
    if (typeof key !== 'string') throw new ApiError('VALIDATION_FAILED', 422, 'Idempotency-Key is required.');
    const result = service.upsertEntries(db, teacher(request), uuidSchema.parse(params(request).sessionId), body.parse(request.body).entries, key, coordinator);
    return reply.code(result.status).send(result);
  });
  app.get('/api/v1/groups/:groupId/rt-summaries', { preHandler: session }, async request => {
    const query = z.object({ academicYearId: uuidSchema, termId: uuidSchema }).parse(request.query);
    return service.summaries(db, teacher(request), uuidSchema.parse(params(request).groupId), query.academicYearId, query.termId);
  });
}
