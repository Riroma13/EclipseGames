import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import { validateBody } from '../http/validation.js';
import { ApiError } from '../http/errors.js';
import { uuidSchema } from '../roster/routes.js';
import * as service from './service.js';
import { toGroupRubricDto, toRubricDto } from './mapper.js';

const ids=z.string().uuid();
const query=z.object({academicYearId:ids});
const params=(r:FastifyRequest)=>r.params as Record<string,string>;
const teacher=(r:FastifyRequest)=>(r as FastifyRequest&{teacherId:string}).teacherId;
const key=(r:FastifyRequest)=>{const value=r.headers['idempotency-key'];if(typeof value!=='string')throw new ApiError('VALIDATION_FAILED',422,'Idempotency-Key is required.');return value;};
const draft=z.object({expectedRevision:z.number().int().nonnegative(),overrides:z.object({COMMUNICATION:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]).nullable(),PRECISION:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]).nullable(),CONSISTENCY:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]).nullable(),COLLABORATION:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]).nullable()}),comment:z.string().trim().max(2000).nullable()});
const expected=z.object({expectedRevision:z.number().int().nonnegative()});
const reopen=z.object({expectedRevision:z.number().int().nonnegative(),reason:z.string().trim().min(1).max(500)});
export function registerRubricRoutes(app:FastifyInstance,db:Database.Database){const session=requireSession(db);
  app.get('/api/v1/students/:studentId/terms/:termId/observation-rubric',{preHandler:session},async r=>{const q=query.parse(r.query),p=params(r);return toRubricDto(service.read(db,teacher(r),ids.parse(p.studentId),ids.parse(p.termId),q.academicYearId));});
  app.get('/api/v1/groups/:groupId/terms/:termId/observation-rubrics',{preHandler:session},async r=>{const q=query.parse(r.query),p=params(r);return toGroupRubricDto(service.group(db,teacher(r),ids.parse(p.groupId),ids.parse(p.termId),q.academicYearId));});
  app.put('/api/v1/students/:studentId/terms/:termId/observation-rubric',{preHandler:[session,validateBody(draft)]},async r=>{const q=query.parse(r.query),p=params(r),result=service.save(db,teacher(r),ids.parse(p.studentId),ids.parse(p.termId),q.academicYearId,key(r),r.body);return toRubricDto(result.value);});
  app.post('/api/v1/students/:studentId/terms/:termId/observation-rubric/close',{preHandler:[session,validateBody(expected)]},async(r,reply)=>{const q=query.parse(r.query),p=params(r),result=service.close(db,teacher(r),ids.parse(p.studentId),ids.parse(p.termId),q.academicYearId,key(r),r.body);return reply.code(result.status).send(toRubricDto(result.value));});
  app.post('/api/v1/students/:studentId/terms/:termId/observation-rubric/reopen',{preHandler:[session,validateBody(reopen)]},async(r,reply)=>{const q=query.parse(r.query),p=params(r),result=service.reopen(db,teacher(r),ids.parse(p.studentId),ids.parse(p.termId),q.academicYearId,key(r),r.body);return reply.code(result.status).send(toRubricDto(result.value));});
}
