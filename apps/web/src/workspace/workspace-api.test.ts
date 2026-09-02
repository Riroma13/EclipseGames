import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeAssessmentContexts, mapXpEvidence, workspaceApi } from './workspace-api';

afterEach(() => vi.restoreAllMocks());

describe('workspace XP idempotency', () => {
  it('reuses the supplied create key on timeout replay', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ event: { id: 'event', baseXp: 1, specialtyBonusXp: 0, effectiveXp: 1 }, summary: {} }), { status: 200, headers: { 'content-type': 'application/json' } }));
    await workspaceApi.registerXp('student', { category: 'PRECISION', baseXp: 1 }, undefined, '00000000-0000-4000-8000-000000000001');
    await workspaceApi.registerXp('student', { category: 'PRECISION', baseXp: 1 }, undefined, '00000000-0000-4000-8000-000000000001');
    expect(fetchMock.mock.calls.map(call => (call[1] as RequestInit).headers)).toEqual([
      { 'content-type': 'application/json', 'Idempotency-Key': '00000000-0000-4000-8000-000000000001' },
      { 'content-type': 'application/json', 'Idempotency-Key': '00000000-0000-4000-8000-000000000001' },
    ]);
  });

  it('keeps the same idempotency key for a coin redemption retry', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: 'redemption' }), { status: 201, headers: { 'content-type': 'application/json' } }));
    await workspaceApi.redeemAdvantage('student', 'context', 'standard-assessment-advantage', undefined, '00000000-0000-4000-8000-000000000009');
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toEqual({ 'content-type': 'application/json', 'Idempotency-Key': '00000000-0000-4000-8000-000000000009' });
  });

  it('targets manual point grant and correction routes with idempotency keys', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: 'entry', studentId: 'student', academicYearId: 'year', balance: 1, grantId: 'grant', source: 'MANUAL_CORRECTION', amount: -1, replay: false }), { status: 201, headers: { 'content-type': 'application/json' } }));
    await workspaceApi.grantManualCoin('student', 'year', 'PERSONAL_IMPROVEMENT', undefined, '00000000-0000-4000-8000-000000000010');
    await workspaceApi.reverseManualCoin('grant', undefined, '00000000-0000-4000-8000-000000000011');
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['/api/v1/students/student/coin-grants', '/api/v1/coin-grants/grant/reversal']);
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toEqual({ 'content-type': 'application/json', 'Idempotency-Key': '00000000-0000-4000-8000-000000000011' });
  });
});

describe('assessment context workspace contract', () => {
  it('creates or reuses a trimmed assessment context and reports replay status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: 'context', groupId: 'group', name: 'Quiz', archivedAt: null }), { status: 200, headers: { 'content-type': 'application/json' } }));
    await expect(workspaceApi.createAssessmentContext('group', '  Quiz  ')).resolves.toEqual({ value: { id: 'context', groupId: 'group', name: 'Quiz', archivedAt: null }, replayed: true });
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ groupId: 'group', name: '  Quiz  ' });
  });

  it('keeps only active assessment contexts for the inline selector', () => {
    expect(activeAssessmentContexts([
      { id: 'active', groupId: 'group', name: 'Quiz', archivedAt: null },
      { id: 'archived', groupId: 'group', name: 'Old quiz', archivedAt: '2026-01-01' },
    ])).toEqual([{ id: 'active', groupId: 'group', name: 'Quiz', archivedAt: null }]);
  });
});

describe('classroom setup workspace contract', () => {
  it('uses the existing year, group, and one atomic student batch endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => new Response(JSON.stringify(input.toString().includes('/students') ? [{ id: 'student' }] : { id: 'resource' }), { status: 201, headers: { 'content-type': 'application/json' } }));
    await workspaceApi.createYear({ label: '2026–2027', startsOn: '2026-09-01', endsOn: '2027-07-01' });
    await workspaceApi.createGroup('year', 'Group A');
    await workspaceApi.createStudents('group', [{ realName: 'Ada Lovelace', alias: 'Ada' }]);
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['/api/v1/academic-years', '/api/v1/academic-years/year/groups', '/api/v1/groups/group/students']);
    expect(JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string)).toEqual({ students: [{ realName: 'Ada Lovelace', alias: 'Ada' }] });
  });
});

describe('workspace XP evidence contract', () => {
  it('loads exactly three factual fields from the owned evidence endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ items: [{ id: 'event', category: 'PRECISION', baseXp: 2, specialtyBonusXp: 1, effectiveXp: 3, comment: 'private note', createdAt: '2026-09-01T10:00:00Z', reversedAt: null }], nextCursor: null }), { status: 200 }));

    await expect(workspaceApi.xpEvidence('student', 'year', 3)).resolves.toEqual({ items: [{ id: 'event', category: 'PRECISION', baseXp: 2, bonusXp: 1, effectiveXp: 3, reversedAt: null, createdAt: '2026-09-01T10:00:00Z' }], nextCursor: null });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/students/student/xp-evidence?academicYearId=year&limit=3');
    expect(mapXpEvidence({ id: 'event', category: 'PRECISION', baseXp: 2, specialtyBonusXp: 1, effectiveXp: 3, createdAt: '2026-09-01T10:00:00Z', reversedAt: null })).not.toHaveProperty('comment');
  });
});
