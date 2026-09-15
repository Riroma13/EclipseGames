import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import { ApiError } from '../http/errors.js';
import { validateBody } from '../http/validation.js';
import * as service from './service.js';
import * as repo from './repository.js';
import { toTermCloseDto, toTermCloseMutationDto } from './mapper.js';
import { safeFilename, xlsxContentType } from './xlsx.js';

const ids = z.string().uuid();
const query = z.object({ academicYearId: ids });
const expected = z.object({ expectedRevision: z.number().int().nonnegative() });
const reopen = expected.extend({ reason: z.string().trim().min(1).max(500) });
const params = (request: FastifyRequest) => request.params as Record<string, string>;
const teacher = (request: FastifyRequest) => (request as FastifyRequest & { teacherId: string }).teacherId;
const key = (request: FastifyRequest) => { const value = request.headers['idempotency-key']; if (typeof value !== 'string') throw new ApiError('VALIDATION_FAILED', 422, 'Idempotency-Key is required.'); return value; };

export function registerTermCloseRoutes(app: FastifyInstance, db: Database.Database) {
  const session = requireSession(db);
  app.get('/api/v1/groups/:groupId/terms/:termId/term-close', { preHandler: session }, async (request) => {
    const p = params(request); const q = query.parse(request.query);
    return toTermCloseDto(service.readiness(db, teacher(request), q.academicYearId, ids.parse(p.groupId), ids.parse(p.termId)));
  });
  app.post('/api/v1/groups/:groupId/terms/:termId/term-close/close', { preHandler: [session, validateBody(expected)] }, async (request, reply) => {
    const p = params(request); const q = query.parse(request.query); const result = await service.close(db, teacher(request), q.academicYearId, ids.parse(p.groupId), ids.parse(p.termId), key(request), request.body as z.infer<typeof expected>);
    return reply.code(result.status).send(toTermCloseMutationDto(result));
  });
  app.post('/api/v1/groups/:groupId/terms/:termId/term-close/reopen', { preHandler: [session, validateBody(reopen)] }, async (request, reply) => {
    const p = params(request); const q = query.parse(request.query); const result = service.reopen(db, teacher(request), q.academicYearId, ids.parse(p.groupId), ids.parse(p.termId), key(request), request.body as z.infer<typeof reopen>);
    return reply.code(result.status).send(toTermCloseMutationDto(result));
  });
  app.get('/api/v1/groups/:groupId/terms/:termId/term-close/exports/:version.xlsx', { preHandler: session }, async (request, reply) => {
    const p = params(request); const q = query.parse(request.query); const version = Number(p.version); if (!Number.isInteger(version) || version < 1) throw new ApiError('VALIDATION_FAILED', 422, 'Invalid export version.');
    const exportFile = repo.snapshotForDownload(db, teacher(request), q.academicYearId, ids.parse(p.groupId), ids.parse(p.termId), version);
    if (!exportFile) throw new ApiError('NOT_FOUND', 404, 'Term-close export not found.');
    return reply.code(200).header('Content-Type', xlsxContentType).header('Content-Length', exportFile.xlsxLength).header('Content-Disposition', `attachment; filename="${safeFilename(exportFile.yearLabel, exportFile.groupName, exportFile.termCode, version)}"`).header('X-Content-Type-Options', 'nosniff').header('Cache-Control', 'private, no-store').header('ETag', `"${exportFile.xlsxSha256}"`).send(exportFile.xlsxBytes);
  });
}
