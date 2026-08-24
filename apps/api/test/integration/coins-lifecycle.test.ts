import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../../src/server.js';
import { openDatabase } from '../../src/db/client.js';

const apps: Awaited<ReturnType<typeof createServer>>[] = [];
const inspectors: ReturnType<typeof openDatabase>[] = [];
const databasePaths: string[] = [];
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  for (const inspector of inspectors.splice(0)) inspector.close();
  for (const path of databasePaths.splice(0)) rmSync(path, { force: true });
});

function ordered<T extends Record<string, unknown>>(rows: T[]) {
  return rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function authoritativeSnapshot(db: ReturnType<typeof openDatabase>['database'], studentId: string, academicYearId: string) {
  const redemptions = db.prepare(`
    SELECT r.id,r.student_id AS studentId,r.assessment_context_id AS assessmentContextId,
      r.reward_id AS rewardId,r.cost,r.debit_ledger_id AS debitLedgerId,
      r.reversal_ledger_id AS reversalLedgerId,r.created_at AS createdAt,r.reversed_at AS reversedAt
    FROM advantage_redemptions r
    JOIN students s ON s.id=r.student_id
    JOIN groups g ON g.id=s.group_id
    WHERE r.student_id=? AND g.academic_year_id=?
  `).all(studentId, academicYearId) as Record<string, unknown>[];
  const redemptionIds = redemptions.map((row) => row.id);
  const allocations = redemptionIds.length === 0 ? [] : db.prepare(`
    SELECT a.id,a.redemption_id AS redemptionId,a.grant_ledger_entry_id AS grantLedgerEntryId,
      a.created_at AS createdAt,a.released_at AS releasedAt,a.release_reason AS releaseReason
    FROM coin_spend_allocations a
    WHERE a.redemption_id IN (${redemptionIds.map(() => '?').join(',')})
  `).all(...redemptionIds) as Record<string, unknown>[];
  const contexts = db.prepare(`
    SELECT c.id,c.group_id AS groupId,c.name,c.created_at AS createdAt,c.archived_at AS archivedAt
    FROM assessment_contexts c
    JOIN groups g ON g.id=c.group_id
    WHERE g.academic_year_id=?
  `).all(academicYearId) as Record<string, unknown>[];
  const ledger = db.prepare(`
    SELECT id,student_id AS studentId,academic_year_id AS academicYearId,amount,source,
      correction_of_id AS correctionOfId,redemption_id AS redemptionId,
      source_transition_id AS sourceTransitionId,created_at AS createdAt
    FROM coin_ledger WHERE student_id=? AND academic_year_id=?
  `).all(studentId, academicYearId) as Record<string, unknown>[];
  const transitions = db.prepare(`
    SELECT t.id,t.sequence,t.unlock_id AS unlockId,t.kind,t.source_event_id AS sourceEventId,
      t.source_reversal_id AS sourceReversalId,t.occurred_at AS occurredAt
    FROM xp_level_grant_transitions t
    JOIN xp_level_unlocks u ON u.id=t.unlock_id
    WHERE u.student_id=? AND u.academic_year_id=?
  `).all(studentId, academicYearId) as Record<string, unknown>[];
  return {
    ledger: { rows: ordered(ledger), count: ledger.length },
    redemptions: { rows: ordered(redemptions), count: redemptions.length },
    allocations: { rows: ordered(allocations), count: allocations.length },
    contexts: { rows: ordered(contexts), count: contexts.length },
    entitlementTransitions: { rows: ordered(transitions), count: transitions.length },
    balance: (db.prepare('SELECT COALESCE(SUM(amount),0) AS balance FROM coin_ledger WHERE student_id=? AND academic_year_id=?').get(studentId, academicYearId) as { balance: number }).balance,
  };
}

describe('coin allocation lifecycle', () => {
  it('allocates exactly cost grants, reverses once, and reuses released grants', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'teacher@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const headers = { origin: 'http://localhost:5173' };
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers, payload: { email: 'teacher@example.test', password: 'correct horse battery staple' } });
    const cookie = login.headers['set-cookie'];
    const auth = { ...headers, cookie };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: auth, payload: { label: 'Coins', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
    const yearId = year.json().id;
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers: auth, payload: { name: 'A' } });
    const groupId = group.json().id;
    const student = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/students`, headers: auth, payload: { students: [{ realName: 'Ada', alias: 'A' }] } });
    const studentId = student.json()[0].id;
    const context = await app.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers: auth, payload: { groupId, name: 'Quiz' } });
    const contextId = context.json().id;
    for (const source of ['PERSONAL_IMPROVEMENT', 'EXCEPTIONAL_FRENCH', 'SPECIAL_CHALLENGE']) {
      expect((await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers: auth, payload: { academicYearId: yearId, source } })).statusCode).toBe(201);
    }
    const key = '00000000-0000-4000-8000-000000000004';
    const first = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...auth, 'idempotency-key': key }, payload: { assessmentContextId: contextId, rewardId: 'standard-assessment-advantage' } });
    expect(first.statusCode).toBe(201);
    const replay = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...auth, 'idempotency-key': key }, payload: { assessmentContextId: contextId, rewardId: 'standard-assessment-advantage' } });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(first.json().id);
    expect((await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...auth, 'idempotency-key': key }, payload: { assessmentContextId: contextId, rewardId: 'exceptional-assessment-advantage' } })).statusCode).toBe(409);
    const ledgerBefore = await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/coin-ledger?academicYearId=${yearId}`, headers: auth });
    expect(ledgerBefore.json().filter((entry: { source: string }) => entry.source === 'REDEMPTION_DEBIT')).toHaveLength(1);
    const reversal = await app.inject({ method: 'POST', url: `/api/v1/advantage-redemptions/${first.json().id}/reversal`, headers: auth, payload: {} });
    expect(reversal.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/v1/advantage-redemptions/${first.json().id}/reversal`, headers: auth, payload: {} })).statusCode).toBe(409);
    const secondContext = await app.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers: auth, payload: { groupId, name: 'Exam' } });
    const second = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000005' }, payload: { assessmentContextId: secondContext.json().id, rewardId: 'exceptional-assessment-advantage' } });
    expect(second.statusCode).toBe(201);
    const ledger = await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/coin-ledger?academicYearId=${yearId}`, headers: auth });
    expect(ledger.json().filter((entry: { source: string }) => entry.source === 'REDEMPTION_DEBIT')).toHaveLength(2);
    expect(ledger.json().filter((entry: { source: string }) => entry.source === 'REDEMPTION_REFUND')).toHaveLength(1);
  });

  it('rejects changed idempotency payloads and never exposes generic negative writes', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'teacher@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const response = await app.inject({ method: 'POST', url: '/api/v1/students/00000000-0000-4000-8000-000000000001/coin-grants', headers: { origin: 'http://localhost:5173' }, payload: { academicYearId: '00000000-0000-4000-8000-000000000002', source: 'INVALID' } });
    expect(response.statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/v1/students/00000000-0000-4000-8000-000000000001/coin-adjustments', headers: { origin: 'http://localhost:5173' }, payload: { amount: -1 } })).statusCode).toBe(404);
  });

  it('returns typed failures and blocks archived coin writes without mutation', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'teacher@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const headers = { origin: 'http://localhost:5173' };
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers, payload: { email: 'teacher@example.test', password: 'correct horse battery staple' } });
    const auth = { ...headers, cookie: login.headers['set-cookie'] };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: auth, payload: { label: 'Guarded', startsOn: '2026-09-01', endsOn: '2027-07-01' } }); const yearId=year.json().id;
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers: auth, payload: { name: 'Guarded group' } }); const groupId=group.json().id;
    const student = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/students`, headers: auth, payload: { students: [{ realName: 'Guarded student', alias: 'Guarded' }] } }); const studentId=student.json()[0].id;
    const invalid = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: auth, payload: { assessmentContextId: '00000000-0000-4000-8000-000000000099', rewardId: 'standard-assessment-advantage' } });
    expect(invalid.statusCode).toBe(404);
    expect(invalid.json()).toMatchObject({ code: 'NOT_FOUND', requestId: expect.any(String) });
    expect((await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/archive`, headers: auth })).statusCode).toBe(204);
    const grant = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers: auth, payload: { academicYearId: yearId, source: 'PERSONAL_IMPROVEMENT' } });
    expect(grant.statusCode).toBe(422);
    const context = await app.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers: auth, payload: { groupId, name: 'Blocked context' } });
    expect(context.statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/archive`, headers: auth })).statusCode).toBe(204);
    const archivedContext = await app.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers: auth, payload: { groupId, name: 'Blocked year context' } });
    expect(archivedContext.statusCode).toBe(422);
    const ledger = await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/coin-ledger?academicYearId=${yearId}`, headers: auth });
    expect(ledger.statusCode).toBe(200);
    expect(ledger.json()).toEqual([]);
  });

  it('proves failed redemption mutations are zero-mutation at the API boundary', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'teacher@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const headers = { origin: 'http://localhost:5173' };
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers, payload: { email: 'teacher@example.test', password: 'correct horse battery staple' } });
    const auth = { ...headers, cookie: login.headers['set-cookie'] };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: auth, payload: { label: 'Failure evidence', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
    const yearId = year.json().id;
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers: auth, payload: { name: 'Failure group' } });
    const groupId = group.json().id;
    const students = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/students`, headers: auth, payload: { students: [{ realName: 'Failure student', alias: 'Failure' }] } });
    const studentId = students.json()[0].id;
    const context = await app.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers: auth, payload: { groupId, name: 'Failure assessment' } });
    const contextId = context.json().id;
    const secondGroup = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers: auth, payload: { name: 'Other group' } });
    const secondGroupId = secondGroup.json().id;
    const secondStudent = await app.inject({ method: 'POST', url: `/api/v1/groups/${secondGroupId}/students`, headers: auth, payload: { students: [{ realName: 'Other student', alias: 'Other' }] } });
    const secondStudentId = secondStudent.json()[0].id;
    const secondContext = await app.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers: auth, payload: { groupId: secondGroupId, name: 'Other assessment' } });
    const secondContextId = secondContext.json().id;
    const state = async (id: string) => {
      const [coins, ledger] = await Promise.all([
        app.inject({ method: 'GET', url: `/api/v1/students/${id}/coins`, headers: auth }),
        app.inject({ method: 'GET', url: `/api/v1/students/${id}/coin-ledger?academicYearId=${yearId}`, headers: auth }),
      ]);
      return { balance: coins.json().balance, ledger: ledger.json() };
    };
    const assertZeroMutation = async (id: string, request: Parameters<typeof app.inject>[0], expectedStatus: number, expectedCode: string) => {
      const before = await state(id);
      const response = await app.inject(request);
      expect(response.statusCode).toBe(expectedStatus);
      expect(response.json()).toMatchObject({ code: expectedCode, requestId: expect.any(String) });
      expect(await state(id)).toEqual(before);
      return response;
    };

    await assertZeroMutation(studentId, { method: 'POST', url: `/api/v1/students/00000000-0000-4000-8000-000000000099/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000091' }, payload: { assessmentContextId: contextId, rewardId: 'standard-assessment-advantage' } }, 404, 'NOT_FOUND');
    await assertZeroMutation(studentId, { method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: auth, payload: { assessmentContextId: 'not-a-uuid', rewardId: 'standard-assessment-advantage' } }, 422, 'VALIDATION_FAILED');
    await assertZeroMutation(studentId, { method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000092' }, payload: { assessmentContextId: contextId, rewardId: 'standard-assessment-advantage' } }, 409, 'CONFLICT');
    await assertZeroMutation(studentId, { method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000093' }, payload: { assessmentContextId: secondContextId, rewardId: 'standard-assessment-advantage' } }, 404, 'NOT_FOUND');
    expect((await state(secondStudentId)).ledger).toEqual([]);
  });

  it('proves every required failed API case preserves the complete authoritative snapshot', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'eclipsegames-coins-')), 'api.sqlite');
    databasePaths.push(path);
    const app = createServer(path, { logger: false, bootstrapTeacher: { email: 'teacher@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const inspector = openDatabase(path); inspectors.push(inspector);
    const headers = { origin: 'http://localhost:5173' };
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers, payload: { email: 'teacher@example.test', password: 'correct horse battery staple' } });
    const auth = { ...headers, cookie: login.headers['set-cookie'] };
    const makeYear = async (label: string) => (await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: auth, payload: { label, startsOn: '2026-09-01', endsOn: '2027-07-01' } })).json().id as string;
    const makeGroup = async (academicYearId: string, name: string) => (await app.inject({ method: 'POST', url: `/api/v1/academic-years/${academicYearId}/groups`, headers: auth, payload: { name } })).json().id as string;
    const makeStudent = async (groupId: string, alias: string) => (await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/students`, headers: auth, payload: { students: [{ realName: alias, alias }] } })).json()[0].id as string;
    const makeContext = async (groupId: string, name: string) => (await app.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers: auth, payload: { groupId, name } })).json().id as string;
    const year = await makeYear('API evidence');
    const group = await makeGroup(year, 'Primary');
    const student = await makeStudent(group, 'Primary student');
    const context = await makeContext(group, 'Primary assessment');
    const otherGroup = await makeGroup(year, 'Other');
    const otherStudent = await makeStudent(otherGroup, 'Other student');
    const mismatchedContext = await makeContext(otherGroup, 'Mismatched assessment');
    const secondYear = await makeYear('Archived evidence');
    const secondGroup = await makeGroup(secondYear, 'Archived');
    const secondStudent = await makeStudent(secondGroup, 'Archived student');
    const archivedContext = await makeContext(secondGroup, 'Archived assessment');
    for (const source of ['PERSONAL_IMPROVEMENT', 'EXCEPTIONAL_FRENCH', 'SPECIAL_CHALLENGE']) {
      expect((await app.inject({ method: 'POST', url: `/api/v1/students/${student}/coin-grants`, headers: auth, payload: { academicYearId: year, source } })).statusCode).toBe(201);
    }

    const assertUnchanged = async (studentId: string, yearId: string, request: Parameters<typeof app.inject>[0], status: number, code: string) => {
      const before = authoritativeSnapshot(inspector.database, studentId, yearId);
      const response = await app.inject(request);
      expect(response.statusCode).toBe(status);
      expect(response.json()).toMatchObject({ code, requestId: expect.any(String) });
      const after = authoritativeSnapshot(inspector.database, studentId, yearId);
      expect(after).toEqual(before);
    };

    await assertUnchanged(student, year, { method: 'POST', url: `/api/v1/students/00000000-0000-4000-8000-000000000099/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000091' }, payload: { assessmentContextId: context, rewardId: 'standard-assessment-advantage' } }, 404, 'NOT_FOUND');
    await assertUnchanged(student, year, { method: 'POST', url: `/api/v1/students/${student}/advantages`, headers: auth, payload: { assessmentContextId: 'not-a-uuid', rewardId: 'standard-assessment-advantage' } }, 422, 'VALIDATION_FAILED');
    await assertUnchanged(otherStudent, year, { method: 'POST', url: `/api/v1/students/${otherStudent}/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000092' }, payload: { assessmentContextId: mismatchedContext, rewardId: 'standard-assessment-advantage' } }, 409, 'CONFLICT');
    await assertUnchanged(student, year, { method: 'POST', url: `/api/v1/students/${student}/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000093' }, payload: { assessmentContextId: mismatchedContext, rewardId: 'standard-assessment-advantage' } }, 404, 'NOT_FOUND');

    const originalKey = '00000000-0000-4000-8000-000000000094';
    const original = await app.inject({ method: 'POST', url: `/api/v1/students/${student}/advantages`, headers: { ...auth, 'idempotency-key': originalKey }, payload: { assessmentContextId: context, rewardId: 'standard-assessment-advantage' } });
    expect(original.statusCode).toBe(201);
    await assertUnchanged(student, year, { method: 'POST', url: `/api/v1/students/${student}/advantages`, headers: { ...auth, 'idempotency-key': originalKey }, payload: { assessmentContextId: context, rewardId: 'exceptional-assessment-advantage' } }, 409, 'CONFLICT');
    await assertUnchanged(student, year, { method: 'POST', url: `/api/v1/students/${student}/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000095' }, payload: { assessmentContextId: context, rewardId: 'exceptional-assessment-advantage' } }, 409, 'CONFLICT');
    await assertUnchanged(secondStudent, secondYear, { method: 'POST', url: `/api/v1/students/${secondStudent}/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000096' }, payload: { assessmentContextId: archivedContext, rewardId: 'standard-assessment-advantage' } }, 409, 'CONFLICT');

    expect((await app.inject({ method: 'POST', url: `/api/v1/students/${student}/archive`, headers: auth })).statusCode).toBe(204);
    await assertUnchanged(student, year, { method: 'POST', url: `/api/v1/students/${student}/coin-grants`, headers: auth, payload: { academicYearId: year, source: 'PERSONAL_IMPROVEMENT' } }, 422, 'VALIDATION_FAILED');
    expect((await app.inject({ method: 'POST', url: `/api/v1/academic-years/${secondYear}/archive`, headers: auth })).statusCode).toBe(204);
    await assertUnchanged(secondStudent, secondYear, { method: 'POST', url: `/api/v1/students/${secondStudent}/coin-grants`, headers: auth, payload: { academicYearId: secondYear, source: 'PERSONAL_IMPROVEMENT' } }, 422, 'VALIDATION_FAILED');
    inspector.database.prepare('UPDATE assessment_contexts SET archived_at=? WHERE id=?').run('2026-09-02T00:00:00.000Z', archivedContext);
    await assertUnchanged(secondStudent, secondYear, { method: 'POST', url: `/api/v1/students/${secondStudent}/advantages`, headers: { ...auth, 'idempotency-key': '00000000-0000-4000-8000-000000000097' }, payload: { assessmentContextId: archivedContext, rewardId: 'standard-assessment-advantage' } }, 422, 'VALIDATION_FAILED');
  });
});
