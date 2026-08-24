import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { requireSession } from '../auth/routes.js';
import { validateBody } from '../http/validation.js';
import * as service from './service.js';
import * as repository from './repository.js';

const uuid=z.string().uuid();
const teacher=(request: FastifyRequest)=>(request as FastifyRequest & {teacherId:string}).teacherId;
export function registerCoinRoutes(app: FastifyInstance, db: Database.Database) {
  const session=requireSession(db);
  app.get('/api/v1/coin-rewards',{preHandler:session},async()=>service.rewards(db));
  app.get('/api/v1/groups/:groupId/assessment-contexts',{preHandler:session},async(request)=>service.contexts(db,teacher(request),uuid.parse((request.params as any).groupId)));
  app.get('/api/v1/students/:studentId/coins',{preHandler:session},async(request)=>service.summary(db,teacher(request),uuid.parse((request.params as any).studentId)));
  app.get('/api/v1/students/:studentId/coin-ledger',{preHandler:session},async(request)=>{const params=request.params as any; const query=z.object({academicYearId:uuid}).parse(request.query); const student=service.summary(db,teacher(request),uuid.parse(params.studentId)); if(student.academicYearId!==query.academicYearId) return []; return repository.entries(db,student.studentId,query.academicYearId);});
   app.post('/api/v1/students/:studentId/coin-grants',{preHandler:[session,validateBody(z.object({academicYearId:uuid,source:z.enum(['PERSONAL_IMPROVEMENT','EXCEPTIONAL_FRENCH','EXCEPTIONAL_COLLABORATION','SPECIAL_CHALLENGE'])}))]},async(request,reply)=>{const input=request.body as any; const student=service.summary(db,teacher(request),uuid.parse((request.params as any).studentId)); const id=service.grantManual(db,teacher(request),student.studentId,input.academicYearId,input.source); return reply.code(201).send({id,...service.summary(db,teacher(request),student.studentId)});});
   app.post('/api/v1/assessment-contexts',{preHandler:[session,validateBody(z.object({groupId:uuid,name:z.string().trim().min(1).max(100)}))]},async(request,reply)=>{const input=request.body as any; return reply.code(201).send(service.createContext(db,teacher(request),input.groupId,input.name));});
  app.post('/api/v1/students/:studentId/advantages',{preHandler:[session,validateBody(z.object({assessmentContextId:uuid,rewardId:z.string()}))]},async(request,reply)=>{const input=request.body as any; const result=service.spend(db,teacher(request),uuid.parse((request.params as any).studentId),input.assessmentContextId,input.rewardId,request.headers['idempotency-key'] as string); return reply.code(result.replay?200:201).send(result);});
  app.post('/api/v1/advantage-redemptions/:redemptionId/reversal',{preHandler:session},async(request)=>service.reverse(db,teacher(request),uuid.parse((request.params as any).redemptionId)));
}
