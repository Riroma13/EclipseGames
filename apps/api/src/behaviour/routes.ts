import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { requireSession } from '../auth/routes.js';
import { ApiError } from '../http/errors.js';
import { uuidSchema } from '../roster/routes.js';
import * as service from './service.js';

const key = (request: FastifyRequest) => request.headers['idempotency-key'];
const ids = (request: FastifyRequest) => request.params as Record<string,string>;
const teacher = (request: FastifyRequest) => (request as FastifyRequest & { teacherId:string }).teacherId;
const requireKey = (request: FastifyRequest) => { const value=key(request); if(typeof value!=='string') throw new ApiError('VALIDATION_FAILED',422,'Idempotency-Key is required.'); return value; };
const send = (reply:any, value:{status:number;value:unknown}) => reply.code(value.status).send(value.value);

export function registerBehaviourRoutes(app:FastifyInstance, db:Database.Database) {
  const session=requireSession(db);
  app.get('/api/v1/real-class-sessions/:sessionId/behaviour',{preHandler:session},async request=>service.getState(db,teacher(request),uuidSchema.parse(ids(request).sessionId)));
  app.post('/api/v1/real-class-sessions/:sessionId/students/:studentId/loss',{preHandler:session},async(request,reply)=>send(reply,service.loseLife(db,teacher(request),uuidSchema.parse(ids(request).sessionId),uuidSchema.parse(ids(request).studentId),requireKey(request))));
  app.post('/api/v1/real-class-sessions/:sessionId/students/:studentId/restore',{preHandler:session},async(request,reply)=>send(reply,service.restoreLife(db,teacher(request),uuidSchema.parse(ids(request).sessionId),uuidSchema.parse(ids(request).studentId),requireKey(request))));
  app.post('/api/v1/behaviour/actions/:actionId/correction',{preHandler:session},async(request,reply)=>send(reply,service.correctAction(db,teacher(request),uuidSchema.parse(ids(request).actionId),requireKey(request))));
  app.post('/api/v1/behaviour/proposals/:proposalId/dismiss',{preHandler:session},async(request,reply)=>send(reply,service.dismissProposal(db,teacher(request),uuidSchema.parse(ids(request).proposalId),requireKey(request))));
}
