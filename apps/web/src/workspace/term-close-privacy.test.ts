// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { workspaceApi } from './workspace-api';

afterEach(() => vi.restoreAllMocks());

describe('term-close browser privacy boundary', () => {
  it('uses opaque URL identities, no-store export requests, and no browser storage', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['private xlsx']), { status: 200 }));
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    await workspaceApi.downloadTermClose('group-id', 'term-id', 'year-id', 2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/v1/groups/group-id/terms/term-id/term-close/exports/2.xlsx?academicYearId=year-id');
    expect((init as RequestInit).cache).toBe('no-store');
    expect(storage).not.toHaveBeenCalled();
    expect(String(url)).not.toMatch(/PRIVATE NAME|PRIVATE FILE|PRIVATE SOURCE|9\.125|8\.5/i);
  });
});
