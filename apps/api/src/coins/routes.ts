import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { requireSession } from '../auth/routes.js';
import { validateBody } from '../http/validation.js';
import { ApiError } from '../http/errors.js';
import { manualCoinSourceSchema } from '@eclipse/contracts';
import * as service from './service.js';
import * as repository from './repository.js';

const uuid=z.string().uuid();
const idempotencyKeyPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const manualGrantBody = z.object({ academicYearId: uuid, source: manualCoinSourceSchema }).strict();
const emptyBody = z.object({}).strict().default({});
const teacher=(request: FastifyRequest)=>(request as FastifyRequest & {teacherId:string}).teacherId;
const requiredIdempotencyKey=(request: FastifyRequest)=>{const value=request.headers['idempotency-key']; if(typeof value!=='string' || !idempotencyKeyPattern.test(value)) throw new ApiError('VALIDATION_FAILED',422,'A UUID v4 Idempotency-Key header is required.'); return value;};
export function registerCoinRoutes(app: FastifyInstance, db: Database.Database) {
  const session=requireSession(db);
  app.get('/api/v1/coin-rewards',{preHandler:session},async()=>service.rewards(db));
  app.get('/api/v1/groups/:groupId/assessment-contexts',{preHandler:session},async(request)=>service.contexts(db,teacher(request),uuid.parse((request.params as any).groupId)));
  app.get('/api/v1/students/:studentId/coins',{preHandler:session},async(request)=>service.summary(db,teacher(request),uuid.parse((request.params as any).studentId)));
  app.get('/api/v1/students/:studentId/coin-ledger',{preHandler:session},async(request)=>{const params=request.params as any; const query=z.object({academicYearId:uuid}).parse(request.query); const student=service.summary(db,teacher(request),uuid.parse(params.studentId)); if(student.academicYearId!==query.academicYearId) return []; return repository.entries(db,student.studentId,query.academicYearId);});
     app.post('/api/v1/students/:studentId/coin-grants',{preHandler:[session,validateBody(manualGrantBody)]},async(request,reply)=>{const input=manualGrantBody.parse(request.body); const studentId=uuid.parse((request.params as any).studentId); const result=service.grantManual(db,teacher(request),studentId,input.academicYearId,input.source,requiredIdempotencyKey(request)); return reply.code(result.replay?200:201).send({id:result.id,...service.summary(db,teacher(request),studentId)});});
   app.post('/api/v1/assessment-contexts',{preHandler:[session,validateBody(z.object({groupId:uuid,name:z.string().trim().min(1).max(100)}))]},async(request,reply)=>{const input=request.body as any; const result=service.createContext(db,teacher(request),input.groupId,input.name); const { replay, ...dto }=result; return reply.code(replay?200:201).send(dto);});
   app.patch('/api/v1/assessment-contexts/:contextId',{preHandler:[session,validateBody(z.object({name:z.string().trim().min(1).max(100)}))]},async(request)=>{const input=request.body as any; return service.renameContext(db,teacher(request),uuid.parse((request.params as any).contextId),input.name);});
  app.post('/api/v1/students/:studentId/advantages',{preHandler:[session,validateBody(z.object({assessmentContextId:uuid,rewardId:z.string()}))]},async(request,reply)=>{const input=request.body as any; const result=service.spend(db,teacher(request),uuid.parse((request.params as any).studentId),input.assessmentContextId,input.rewardId,request.headers['idempotency-key'] as string); return reply.code(result.replay?200:201).send(result);});
   app.post('/api/v1/advantage-redemptions/:redemptionId/reversal',{preHandler:session},async(request)=>service.reverse(db,teacher(request),uuid.parse((request.params as any).redemptionId)));
    app.post('/api/v1/coin-grants/:grantId/reversal',{preHandler:[session,validateBody(emptyBody)]},async(request,reply)=>{const result=service.reverseManualGrant(db,teacher(request),uuid.parse((request.params as any).grantId),requiredIdempotencyKey(request)); return reply.code(result.replay?200:201).send(result);});
}
