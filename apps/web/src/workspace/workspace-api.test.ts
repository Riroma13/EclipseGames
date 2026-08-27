import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeAssessmentContexts, workspaceApi } from './workspace-api';

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
