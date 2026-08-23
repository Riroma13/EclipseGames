import { afterEach, describe, expect, it, vi } from 'vitest';
import { workspaceApi } from './workspace-api';

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
});
