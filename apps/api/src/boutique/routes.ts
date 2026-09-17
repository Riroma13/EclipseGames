import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import * as service from './service.js';
import { ApiError } from '../http/errors.js';

const uuid=z.string().uuid();
const teacher=(r:FastifyRequest)=>(r as FastifyRequest & {teacherId:string}).teacherId;
export function registerBoutiqueRoutes(app: FastifyInstance, db: Database.Database) {
  const session=requireSession(db);
  app.get('/api/v1/students/:studentId/boutique',{preHandler:session},async request=>{const p=request.params as {studentId:string};const q=z.object({academicYearId:uuid}).parse(request.query);return service.read(db,teacher(request),uuid.parse(p.studentId),q.academicYearId);});
  app.post('/api/v1/students/:studentId/boutique-purchases',{preHandler:session},async(request,reply)=>{const p=request.params as {studentId:string};const q=z.object({academicYearId:uuid}).parse(request.query);const body=z.object({itemId:z.string().min(1),sessionId:uuid.nullable()}).strict().parse(request.body);const key=request.headers['idempotency-key'];if(typeof key!=='string')throw new ApiError('VALIDATION_FAILED',422,'A UUID v4 Idempotency-Key is required.');const result=service.buy(db,teacher(request),uuid.parse(p.studentId),q.academicYearId,body.itemId,body.sessionId,key);return reply.code(result.status).send(result.value);});
}
