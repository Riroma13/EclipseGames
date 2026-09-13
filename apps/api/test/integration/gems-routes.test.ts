import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { createServer } from '../../src/server.js';

const origin = 'http://localhost:5173';
const ownerCredentials = { email: 'gems-owner@example.test', password: 'correct horse battery staple' };
const otherCredentials = { email: 'gems-other@example.test', password: 'correct horse battery staple' };
const apps: Awaited<ReturnType<typeof createServer>>[] = [];
const databases: Database.Database[] = [];

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  for (const database of databases.splice(0)) database.close();
});

async function login(app: Awaited<ReturnType<typeof createServer>>, credentials = ownerCredentials) {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
  expect(response.statusCode).toBe(204);
  return { origin, cookie: response.headers['set-cookie'] };
}

async function classroom(app: Awaited<ReturnType<typeof createServer>>, headers: Record<string, unknown>) {
  const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Gem routes', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
  const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'Gem group' } });
  const roster = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers, payload: { students: [{ realName: 'Private Student', alias: 'Safe Alias', avatar: 'default', specialty: 'Analyst' }] } });
  return { yearId: year.json().id as string, groupId: group.json().id as string, studentId: roster.json()[0].id as string };
}

describe('gem routes preserve ownership, status, DTO, and legacy boundaries', () => {
  it('proves authenticated ownership, closed DTOs, invalid cursors, conflicts, and unchanged coin tables', async () => {
    const path = `/tmp/eclipse-gem-routes-${Date.now()}-${Math.random()}.sqlite`;
    const owner = createServer(path, { logger: false, bootstrapTeacher: ownerCredentials });
    const other = createServer(path, { logger: false, bootstrapTeacher: otherCredentials });
    apps.push(owner, other);
    const ownerHeaders = await login(owner);
    const otherHeaders = await login(other, otherCredentials);
    const { yearId, groupId, studentId } = await classroom(owner, ownerHeaders);
    const database = new Database(path);
    databases.push(database);
    const ownerId = (database.prepare('SELECT id FROM teacher_accounts WHERE email=?').get(ownerCredentials.email) as { id: string }).id;
    const beforeCoins = Object.fromEntries(['coin_ledger', 'coin_rewards', 'advantage_redemptions', 'coin_spend_allocations'].map(table => [table, database.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
    database.prepare('INSERT INTO gem_ledger (id,student_id,academic_year_id,currency,amount,movement_kind,source_kind,source_id,source_family_id,unit_index,created_at,owner_teacher_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('00000000-0000-4000-8000-000000000099', studentId, yearId, 'EMERALD', 1, 'GRANT', 'RESULT_REWARD', 'test-source', 'test-family', 1, '2026-09-01T00:00:00.000Z', ownerId);

    expect((await owner.inject({ method: 'GET', url: `/api/v1/students/${studentId}/gems?academicYearId=${yearId}` })).statusCode).toBe(401);
    const balances = await owner.inject({ method: 'GET', url: `/api/v1/students/${studentId}/gems?academicYearId=${yearId}`, headers: ownerHeaders });
    expect(balances.statusCode).toBe(200);
    expect(Object.keys(balances.json())).toEqual(['studentId', 'academicYearId', 'balances']);
    expect(balances.json().balances).toEqual({ EMERALD: 1, RUBY: 0, DIAMOND: 0 });

    expect((await other.inject({ method: 'GET', url: `/api/v1/students/${studentId}/gems?academicYearId=${yearId}`, headers: otherHeaders })).statusCode).toBe(404);
    expect((await owner.inject({ method: 'GET', url: `/api/v1/students/${studentId}/gems?academicYearId=bad`, headers: ownerHeaders })).statusCode).toBe(422);
    const ledger = await owner.inject({ method: 'GET', url: `/api/v1/students/${studentId}/gem-ledger?academicYearId=${yearId}`, headers: ownerHeaders });
    expect(ledger.statusCode).toBe(200);
    expect(Object.keys(ledger.json())).toEqual(['studentId', 'academicYearId', 'entries', 'nextCursor']);
    expect(Object.keys(ledger.json().entries[0])).toEqual(['currency', 'amount', 'kind', 'createdAt']);
    for (const cursor of ['', 'not-a-cursor']) {
      const invalid = await owner.inject({ method: 'GET', url: `/api/v1/students/${studentId}/gem-ledger?academicYearId=${yearId}&cursor=${encodeURIComponent(cursor)}`, headers: ownerHeaders });
      expect(invalid.statusCode).toBe(422);
      expect(invalid.json()).toMatchObject({ code: 'VALIDATION_FAILED', message: 'Cursor is invalid.' });
    }
    const catalogue = await owner.inject({ method: 'GET', url: '/api/v1/gem-rewards', headers: ownerHeaders });
    expect(catalogue.statusCode).toBe(200);
    expect(catalogue.json().map((item: object) => Object.keys(item))).toEqual([['id', 'currency', 'cost', 'type'], ['id', 'currency', 'cost', 'type'], ['id', 'currency', 'cost', 'type']]);

    const context = await owner.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers: ownerHeaders, payload: { groupId, name: 'Gem assessment' } });
    const insufficient = await owner.inject({ method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...ownerHeaders, 'idempotency-key': '00000000-0000-4000-8000-000000000010' }, payload: { assessmentContextId: context.json().id, rewardId: 'ruby-assessment-advantage' } });
    expect(insufficient.statusCode).toBe(409);
    expect((await owner.inject({ method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...ownerHeaders, 'idempotency-key': '00000000-0000-4000-8000-000000000011' }, payload: { assessmentContextId: context.json().id, rewardId: 'standard-assessment-advantage' } })).statusCode).toBe(404);

    const afterCoins = Object.fromEntries(['coin_ledger', 'coin_rewards', 'advantage_redemptions', 'coin_spend_allocations'].map(table => [table, database.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
    expect(afterCoins).toEqual(beforeCoins);
  });

  it('serves only the owned tuple-scoped action state, including archived reads', async () => {
    const path = `/tmp/eclipse-gem-action-state-${Date.now()}-${Math.random()}.sqlite`;
    const owner = createServer(path, { logger: false, bootstrapTeacher: ownerCredentials });
    const other = createServer(path, { logger: false, bootstrapTeacher: otherCredentials });
    apps.push(owner, other);
    const headers = await login(owner);
    const otherHeaders = await login(other, otherCredentials);
    const { yearId, groupId, studentId } = await classroom(owner, headers);
    const context = await owner.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers, payload: { groupId, name: 'Action state' } });
    const database = new Database(path);
    databases.push(database);
    const ownerId = (database.prepare('SELECT id FROM teacher_accounts WHERE email=?').get(ownerCredentials.email) as { id: string }).id;
    const rewardId = '00000000-0000-4000-8000-000000000101';
    const redemptionId = '00000000-0000-4000-8000-000000000102';
    database.prepare(`INSERT INTO gem_result_rewards (id,student_id,assessment_context_id,academic_year_id,tier,state,owner_teacher_id,created_at) VALUES (?,?,?,?,?,?,?,?)`).run(rewardId, studentId, context.json().id, yearId, 'EMERALD_1', 'ACTIVE', ownerId, '2026-09-01T00:00:00.000Z');
    database.prepare(`INSERT INTO gem_advantage_redemptions (id,student_id,assessment_context_id,academic_year_id,currency,cost,request_key,request_fingerprint,state,owner_teacher_id,created_at,reversal_operation_id,reversal_request_key,reversal_fingerprint,reversal_trigger,reversal_reason,reversed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(redemptionId, studentId, context.json().id, yearId, 'EMERALD', 2, 'request', 'fingerprint', 'REVERSED', ownerId, '2026-09-01T00:00:00.000Z', 'operation', 'reversal-request', 'reversal-fingerprint', 'MANUAL', 'reason', '2026-09-02T00:00:00.000Z');

    const url = `/api/v1/students/${studentId}/gem-action-state?academicYearId=${yearId}&assessmentContextId=${context.json().id}`;
    expect((await owner.inject({ method: 'GET', url })).statusCode).toBe(401);
    const response = await owner.inject({ method: 'GET', url, headers });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ studentId, academicYearId: yearId, assessmentContextId: context.json().id, resultReward: { id: rewardId, tier: 'EMERALD_1', state: 'ACTIVE' }, advantageRedemption: { id: redemptionId, currency: 'EMERALD', cost: 2, state: 'REVERSED' } });
    expect(Object.keys(response.json())).toEqual(['studentId', 'academicYearId', 'assessmentContextId', 'resultReward', 'advantageRedemption']);
    expect(JSON.stringify(response.json())).not.toMatch(/fingerprint|request|owner|created|reason|timestamp|score|name|ledger|operation/i);
    database.prepare('UPDATE students SET archived_at=? WHERE id=?').run('2026-10-01T00:00:00.000Z', studentId);
    expect((await owner.inject({ method: 'GET', url, headers })).statusCode).toBe(200);
    expect((await owner.inject({ method: 'GET', url: `${url}&academicYearId=bad`, headers })).statusCode).toBe(422);
    expect((await other.inject({ method: 'GET', url, headers: otherHeaders })).statusCode).toBe(404);
    expect((await owner.inject({ method: 'GET', url: `${url.slice(0, url.indexOf('?'))}?academicYearId=${yearId}&assessmentContextId=00000000-0000-4000-8000-000000000999`, headers })).statusCode).toBe(404);
  });
});
