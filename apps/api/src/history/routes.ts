import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import { ApiError } from '../http/errors.js';
import { historyQuerySchema } from './contracts.js';
import { assertOwnedHistoryScope } from './boundary.js';
import { createHistoryCursorCodec, InvalidHistoryCursorError } from './cursor.js';
import { readHistory } from './service.js';
export function registerHistoryRoutes(app:FastifyInstance, db:Database.Database, codec:ReturnType<typeof createHistoryCursorCodec>) { app.get('/api/v1/groups/:groupId/history',{preHandler:requireSession(db)},async(request,reply)=>{ try { const groupId=z.string().uuid().parse((request.params as {groupId:string}).groupId); const query=historyQuerySchema.parse(request.query); const owner=(request as FastifyRequest & {teacherId:string}).teacherId; assertOwnedHistoryScope(db,owner,groupId,query.academicYearId,query.studentId,query.termId); const scope={ownerTeacherId:owner,groupId,academicYearId:query.academicYearId,filterFingerprint:JSON.stringify({...query,cursor:undefined})}; const after=query.cursor ? codec.decode(query.cursor,scope) : undefined; return reply.header('Cache-Control','no-store').send(readHistory(db,{ownerTeacherId:owner,groupId,academicYearId:query.academicYearId,query,after},codec)); } catch(error) { if(error instanceof ApiError) throw error; if(error instanceof z.ZodError || error instanceof InvalidHistoryCursorError) throw new ApiError('VALIDATION_FAILED',422,'Request validation failed.'); throw new ApiError('INTERNAL_ERROR',503,'An unexpected error occurred.'); } }); }
