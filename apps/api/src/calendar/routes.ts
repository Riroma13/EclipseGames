import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import { validateBody } from '../http/validation.js';
import { ApiError } from '../http/errors.js';
import { uuidSchema } from '../roster/routes.js';
import * as service from './service.js';
import { toCalendarDto, toSessionDto } from './mapper.js';

const term=z.object({code:z.enum(['T1','T2','T3']),startsOn:z.string().date(),endsOn:z.string().date()});
const calendar=z.object({timezone:z.string().min(1),terms:z.array(term).length(3),holidays:z.array(z.object({startsOn:z.string().date(),endsOn:z.string().date()})),slots:z.array(z.object({groupId:uuidSchema,weekday:z.number().int(),startsAt:z.string(),endsAt:z.string()}))});
const params=(r:FastifyRequest)=>r.params as Record<string,string>; const teacher=(r:FastifyRequest)=>(r as FastifyRequest&{teacherId:string}).teacherId;
export function registerCalendarRoutes(app:FastifyInstance,db:Database.Database){const session=requireSession(db);
 app.get('/api/v1/academic-years/:yearId/calendar',{preHandler:session},async r=>toCalendarDto(service.getCalendar(db,teacher(r),uuidSchema.parse(params(r).yearId))));
 app.put('/api/v1/academic-years/:yearId/calendar',{preHandler:[session,validateBody(calendar)]},async r=>toCalendarDto(service.replaceCalendar(db,teacher(r),uuidSchema.parse(params(r).yearId),calendar.parse(r.body))));
 app.get('/api/v1/groups/:groupId/real-class-session-status',{preHandler:session},async r=>{const q=z.object({academicYearId:uuidSchema}).parse(r.query);return service.status(db,teacher(r),q.academicYearId,uuidSchema.parse(params(r).groupId));});
 app.post('/api/v1/groups/:groupId/real-class-sessions/start',{preHandler:[session,validateBody(z.object({academicYearId:uuidSchema}))]},async(r,reply)=>{const key=r.headers['idempotency-key'];if(typeof key!=='string')throw new ApiError('VALIDATION_FAILED',422,'Idempotency-Key is required.');const value=service.start(db,teacher(r),uuidSchema.parse((r.body as any).academicYearId),uuidSchema.parse(params(r).groupId),key);return reply.code(value.status).send(toSessionDto(value.session));});
 app.post('/api/v1/real-class-sessions/:sessionId/end',{preHandler:session},async(r,reply)=>{const key=r.headers['idempotency-key'];if(typeof key!=='string')throw new ApiError('VALIDATION_FAILED',422,'Idempotency-Key is required.');const value=service.end(db,teacher(r),uuidSchema.parse(params(r).sessionId),key);return reply.code(value.status).send(toSessionDto(value.session));});
}
