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
   app.post('/api/v1/assessment-contexts',{preHandler:[session,validateBody(z.object({groupId:uuid,name:z.string().trim().min(1).max(100)}))]},async(request,reply)=>{const input=request.body as any; const result=service.createContext(db,teacher(request),input.groupId,input.name); const { replay, ...dto }=result; return reply.code(replay?200:201).send(dto);});
   app.patch('/api/v1/assessment-contexts/:contextId',{preHandler:[session,validateBody(z.object({name:z.string().trim().min(1).max(100)}))]},async(request)=>{const input=request.body as any; return service.renameContext(db,teacher(request),uuid.parse((request.params as any).contextId),input.name);});
}
