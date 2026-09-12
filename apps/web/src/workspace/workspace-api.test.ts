import { afterEach, describe, expect, it, vi } from 'vitest';
import { assessmentContextsForSelector, mapXpEvidence, workspaceApi } from './workspace-api';
import { isAmbiguousGemMutationFailure } from './StudentPanel';
import { isSelectedYearHistorical, requestedYearNeedsAuthoritativeLookup, requestedYearRequiresArchivedLookup, selectRequestedStudent, selectRequestedYear } from './WorkspaceApp';

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

  it('keeps the same idempotency key for a gem redemption retry', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: 'redemption' }), { status: 201, headers: { 'content-type': 'application/json' } }));
    await workspaceApi.redeemGem('student', 'context', 'emerald-assessment-advantage', undefined, '00000000-0000-4000-8000-000000000009');
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toEqual({ 'content-type': 'application/json', 'Idempotency-Key': '00000000-0000-4000-8000-000000000009' });
  });

  it('reads the tuple-scoped action state with both ownership selectors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ studentId: 'student', academicYearId: 'year', assessmentContextId: 'context', resultReward: null, advantageRedemption: null }), { status: 200 }));
    await expect(workspaceApi.gemActionState('student', 'year', 'context')).resolves.toMatchObject({ assessmentContextId: 'context' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/students/student/gem-action-state?academicYearId=year&assessmentContextId=context');
  });

  it('loads year metadata without browser caching so reload preserves server authority', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));
    await workspaceApi.years(true);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/api\/v1\/academic-years\?includeArchived=true&reload=/);
  });

  it('retains one supplied key across an ambiguous result-reward retry', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: 'reward', tier: 'EMERALD_1', state: 'ACTIVE' }), { status: 201 }));
    const key = '00000000-0000-4000-8000-000000000010';
    await workspaceApi.grantResultReward('student', 'context', '8', undefined, key);
    await workspaceApi.grantResultReward('student', 'context', '8', undefined, key);
    expect(fetchMock.mock.calls.map(call => (call[1] as RequestInit).headers)).toEqual([
      { 'content-type': 'application/json', 'Idempotency-Key': key },
      { 'content-type': 'application/json', 'Idempotency-Key': key },
    ]);
  });

});

describe('SPEC-0027 Build correction boundaries', () => {
  it('keeps an active year active after reload selection', () => {
    const active = [{ id: 'active', label: 'Current', startsOn: '', endsOn: '', archivedAt: null }];
    expect(requestedYearRequiresArchivedLookup('active', active)).toBe(false);
    expect(requestedYearNeedsAuthoritativeLookup('active')).toBe(true);
    expect(selectRequestedYear('active', active)).toEqual({ id: 'active', historical: false });
    expect(isSelectedYearHistorical('active', active)).toBe(false);
  });

  it('rehydrates an archived year as historical after reload even when active years exist', () => {
    const active = [{ id: 'active', label: 'Current', startsOn: '', endsOn: '', archivedAt: null }];
    const archived = { id: 'archived', label: 'Old', startsOn: '', endsOn: '', archivedAt: '2026-01-01' };
    expect(requestedYearRequiresArchivedLookup('archived', active)).toBe(true);
    expect(requestedYearNeedsAuthoritativeLookup('archived')).toBe(true);
    expect(selectRequestedYear('archived', [active[0], archived])).toEqual({ id: 'archived', historical: true });
    expect(isSelectedYearHistorical('archived', [active[0], archived])).toBe(true);
    expect(selectRequestedYear('active', [active[0], archived])).toEqual({ id: 'active', historical: false });
    expect(isSelectedYearHistorical('active', [active[0], archived])).toBe(false);
  });

  it('revalidates a stale selected year after it is archived live', () => {
    const staleActiveList = [{ id: 'archived', label: 'Old', startsOn: '', endsOn: '', archivedAt: null }];
    const authoritativeList = [{ id: 'active', label: 'Current', startsOn: '', endsOn: '', archivedAt: null }, { id: 'archived', label: 'Old', startsOn: '', endsOn: '', archivedAt: '2026-01-01' }];
    expect(selectRequestedYear('archived', staleActiveList)).toEqual({ id: 'archived', historical: false });
    expect(requestedYearNeedsAuthoritativeLookup('archived')).toBe(true);
    expect(selectRequestedYear('archived', authoritativeList)).toEqual({ id: 'archived', historical: true });
    expect(isSelectedYearHistorical('archived', authoritativeList)).toBe(true);
  });

  it('restores a valid archived student and clears an invalid selection', () => {
    const students = [{ id: 'student', groupId: 'group', realName: 'Ada', alias: 'Ada', avatar: '', specialty: null, archivedAt: '2026-01-01' }];
    expect(selectRequestedStudent('student', students)).toBe('student');
    expect(selectRequestedStudent('missing', students)).toBeNull();
  });

  it('retains a gem key only for ambiguous failures', () => {
    expect(isAmbiguousGemMutationFailure(new Error('network timeout'))).toBe(true);
    expect(isAmbiguousGemMutationFailure(Object.assign(new Error('conflict'), { status: 409 }))).toBe(false);
    expect(isAmbiguousGemMutationFailure(Object.assign(new Error('bad request'), { status: 422 }))).toBe(false);
  });
});

describe('assessment context workspace contract', () => {
  it('creates or reuses a trimmed assessment context and reports replay status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: 'context', groupId: 'group', name: 'Quiz', archivedAt: null }), { status: 200, headers: { 'content-type': 'application/json' } }));
    await expect(workspaceApi.createAssessmentContext('group', '  Quiz  ')).resolves.toEqual({ value: { id: 'context', groupId: 'group', name: 'Quiz', archivedAt: null }, replayed: true });
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ groupId: 'group', name: '  Quiz  ' });
  });

  it('keeps owned archived assessment contexts readable for the selector', () => {
    expect(assessmentContextsForSelector([
      { id: 'active', groupId: 'group', name: 'Quiz', archivedAt: null },
      { id: 'archived', groupId: 'group', name: 'Old quiz', archivedAt: '2026-01-01' },
    ])).toHaveLength(2);
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
