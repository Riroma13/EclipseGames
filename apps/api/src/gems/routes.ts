import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import { ApiError } from '../http/errors.js';
import * as repository from './repository.js';
import * as service from './service.js';
import { InvalidGemCursorError, type createCursorCodec } from './cursor.js';

const uuid = z.string().uuid();
const teacher = (r: FastifyRequest) => (r as FastifyRequest & { teacherId:string }).teacherId;
function owned(db: Database.Database, owner: string, studentId: string, yearId: string) {
  const row = db.prepare(`SELECT s.id FROM students s JOIN groups g ON g.id=s.group_id WHERE s.id=? AND g.owner_teacher_id=? AND g.academic_year_id=?`).get(studentId, owner, yearId);
  if (!row) throw new ApiError('NOT_FOUND', 404, 'Student not found.');
}
function ownedActionScope(db: Database.Database, owner: string, studentId: string, yearId: string, assessmentContextId: string) {
  const row = db.prepare(`SELECT s.id FROM students s
    JOIN groups g ON g.id=s.group_id
    JOIN academic_years y ON y.id=g.academic_year_id
    JOIN assessment_contexts ac ON ac.id=? AND ac.group_id=g.id
    WHERE s.id=? AND y.id=? AND g.owner_teacher_id=? AND y.owner_teacher_id=?`).get(assessmentContextId, studentId, yearId, owner, owner);
  if (!row) throw new ApiError('NOT_FOUND', 404, 'Student not found.');
}
function mapActionState(value: ReturnType<typeof repository.actionState>) {
  return {
    studentId: value.studentId,
    academicYearId: value.academicYearId,
    assessmentContextId: value.assessmentContextId,
    resultReward: value.resultReward ? { id: value.resultReward.id, tier: value.resultReward.tier, state: value.resultReward.state } : null,
    advantageRedemption: value.advantageRedemption ? { id: value.advantageRedemption.id, currency: value.advantageRedemption.currency, cost: value.advantageRedemption.cost, state: value.advantageRedemption.state } : null,
  };
}
export function registerGemRoutes(app: FastifyInstance, db: Database.Database, codec: ReturnType<typeof createCursorCodec>) {
  const session = requireSession(db);
  app.get('/api/v1/students/:studentId/gems', { preHandler: session }, async request => { const params = request.params as any; const query = z.object({ academicYearId: uuid }).parse(request.query); owned(db, teacher(request), uuid.parse(params.studentId), query.academicYearId); return repository.balances(db, params.studentId, query.academicYearId); });
  app.get('/api/v1/students/:studentId/gem-ledger', { preHandler: session }, async request => { const params = request.params as any; const query = z.object({ academicYearId: uuid, cursor: z.string().max(1024).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(request.query); const studentId = uuid.parse(params.studentId); const ownerId=teacher(request); owned(db, ownerId, studentId, query.academicYearId); const scope={ownerTeacherId:ownerId,studentId,academicYearId:query.academicYearId}; let decoded=null; try { if(query.cursor === '') throw new InvalidGemCursorError(); decoded=query.cursor ? codec.decode(query.cursor,scope) : null; } catch(error) { if(error instanceof InvalidGemCursorError) throw new ApiError('VALIDATION_FAILED',422,'Cursor is invalid.'); throw error; } const page = repository.ledger(db, studentId, query.academicYearId, query.limit, decoded); return { studentId, academicYearId: query.academicYearId, entries: page.entries, nextCursor: page.next ? codec.encode({...page.next,...scope}) : null }; });
  app.get('/api/v1/gem-rewards', { preHandler: session }, async () => db.prepare(`SELECT id,currency,cost,'ASSESSMENT_ADVANTAGE' AS type FROM gem_reward_catalogue ORDER BY CASE currency WHEN 'EMERALD' THEN 1 WHEN 'RUBY' THEN 2 ELSE 3 END`).all());
  app.get('/api/v1/students/:studentId/gem-action-state', { preHandler: session }, async request => {
    const params = request.params as { studentId: string };
    const query = z.object({ academicYearId: uuid, assessmentContextId: uuid }).parse(request.query);
    const studentId = uuid.parse(params.studentId);
    ownedActionScope(db, teacher(request), studentId, query.academicYearId, query.assessmentContextId);
    return mapActionState(repository.actionState(db, studentId, query.academicYearId, query.assessmentContextId));
  });
  app.post('/api/v1/students/:studentId/gem-result-rewards', { preHandler: session }, async (request, reply) => { const params=request.params as any; const body=z.object({ assessmentContextId:uuid, score:z.string() }).strict().parse(request.body); const idempotency=request.headers['idempotency-key']; if(typeof idempotency!=='string') throw new ApiError('VALIDATION_FAILED',422,'A UUID v4 Idempotency-Key is required.'); const result=service.resultReward(db,teacher(request),uuid.parse(params.studentId),body.assessmentContextId,body.score,idempotency); return reply.code(result.status).send({id:result.id,tier:result.tier,state:result.state}); });
  app.post('/api/v1/students/:studentId/advantages', { preHandler: session }, async (request, reply) => { const params=request.params as any; const body=z.object({assessmentContextId:uuid,rewardId:z.string()}).strict().parse(request.body); const idempotency=request.headers['idempotency-key']; if(typeof idempotency!=='string') throw new ApiError('VALIDATION_FAILED',422,'A UUID v4 Idempotency-Key is required.'); const result=service.spend(db,teacher(request),uuid.parse(params.studentId),body.assessmentContextId,body.rewardId,idempotency); return reply.code(result.status).send({id:result.id,currency:result.currency,cost:result.cost,state:result.state}); });
  app.post('/api/v1/advantage-redemptions/:redemptionId/reversal', { preHandler: session }, async (request, reply) => { const params=request.params as any; const body=z.object({reason:z.string().trim().min(1).max(500)}).strict().parse(request.body); const idempotency=request.headers['idempotency-key']; if(typeof idempotency!=='string') throw new ApiError('VALIDATION_FAILED',422,'A UUID v4 Idempotency-Key is required.'); const result=service.reverseSpend(db,teacher(request),uuid.parse(params.redemptionId),body.reason,idempotency); return reply.code(result.status).send({redemptionId:result.redemptionId,state:result.state}); });
  app.post('/api/v1/gem-result-rewards/:rewardId/correction', { preHandler: session }, async (request, reply) => { const params=request.params as any; const body=z.object({reason:z.string().trim().min(1).max(500)}).strict().parse(request.body); const idempotency=request.headers['idempotency-key']; if(typeof idempotency!=='string') throw new ApiError('VALIDATION_FAILED',422,'A UUID v4 Idempotency-Key is required.'); const result=service.correctResultReward(db,teacher(request),uuid.parse(params.rewardId),body.reason,idempotency); return reply.code(result.status).send({rewardId:result.rewardId,state:result.state}); });
}
