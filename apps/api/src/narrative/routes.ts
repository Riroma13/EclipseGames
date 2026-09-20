import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import { validateBody } from '../http/validation.js';
import * as service from './service.js';

const uuid = z.string().uuid();
const query = z.object({ academicYearId: uuid }).strict();
const expectedRevisionBody = z.object({ expectedRevision: z.number().int().nonnegative() }).strict();
const linkBody = expectedRevisionBody.extend({
  link: z.object({ kind: z.enum(['CHALLENGE', 'MINIGAME']), id: uuid }).strict(),
}).strict();

const teacher = (request: FastifyRequest) => (request as FastifyRequest & { teacherId: string }).teacherId;
const params = (request: FastifyRequest) => request.params as Record<string, string>;
const target = (request: FastifyRequest) => ({ groupId: uuid.parse(params(request).groupId), academicYearId: query.parse(request.query).academicYearId });
const eventKey = (request: FastifyRequest) => z.string().min(1).max(100).parse(params(request).eventKey);
const noStore = (reply: FastifyReply) => reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer');

function idempotencyKey(request: FastifyRequest) {
  const value = request.headers['idempotency-key'];
  return typeof value === 'string' ? value : '';
}

export function registerNarrativeRoutes(app: FastifyInstance, db: Database.Database) {
  const session = requireSession(db);
  app.get('/api/v1/groups/:groupId/narrative', { preHandler: session }, async (request, reply) => {
    const { groupId, academicYearId } = target(request);
    noStore(reply);
    return reply.send(service.getState(db, teacher(request), groupId, academicYearId));
  });

  const registerCommand = (path: string, command: 'START' | 'REVEAL_NEXT_CLUE' | 'LINK' | 'COMPLETE', schema: z.ZodTypeAny) => {
    app.post(path, { preHandler: [session, validateBody(schema)] }, async (request, reply) => {
      const { groupId, academicYearId } = target(request);
      const event = eventKey(request);
      const input = schema.parse(request.body) as { expectedRevision: number; link?: { kind: 'CHALLENGE' | 'MINIGAME'; id: string } };
      const result = service.executeCommand(db, teacher(request), groupId, academicYearId, event, command, input, idempotencyKey(request));
      noStore(reply);
      return reply.code(result.status).send(result.body);
    });
  };

  registerCommand('/api/v1/groups/:groupId/narrative/events/:eventKey/start', 'START', expectedRevisionBody);
  registerCommand('/api/v1/groups/:groupId/narrative/events/:eventKey/reveal-next-clue', 'REVEAL_NEXT_CLUE', expectedRevisionBody);
  registerCommand('/api/v1/groups/:groupId/narrative/events/:eventKey/link', 'LINK', linkBody);
  registerCommand('/api/v1/groups/:groupId/narrative/events/:eventKey/complete', 'COMPLETE', expectedRevisionBody);
}
