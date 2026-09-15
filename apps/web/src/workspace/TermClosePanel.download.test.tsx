// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TermClosePanel } from './TermClosePanel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('term-close browser download', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the filename supplied by the server', async () => {
    const filename = 'term-close_2026_Grupo-T1_v2.xlsx';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).includes('/calendar')) return new Response(JSON.stringify({ configured: true, terms: [{ id: 'term', code: 'T1', startsOn: '2026-01-01', endsOn: '2026-04-01' }] }), { status: 200 });
      if (init?.method === 'POST') return new Response(JSON.stringify({ revision: 1, version: 1 }), { status: 201 });
      return new Response(JSON.stringify({ state: 'CLOSED', revision: 1, currentSnapshotVersion: 2, activeCount: 1, readyCount: 1, ready: true, students: [], blockers: [], staleReasons: [], b01Count: 0, b01Warning: null }), { status: 200 });
    });
    const download = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    const click = vi.fn(); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click);
    const createElement = vi.spyOn(document, 'createElement');
    // Replace only the export response after the panel has loaded.
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ configured: true, terms: [{ id: 'term', code: 'T1', startsOn: '2026-01-01', endsOn: '2026-04-01' }] }), { status: 200 }));
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ state: 'CLOSED', revision: 1, currentSnapshotVersion: 2, activeCount: 1, readyCount: 1, ready: true, students: [], blockers: [], staleReasons: [], b01Count: 0, b01Warning: null }), { status: 200 }));
    fetchMock.mockImplementationOnce(async () => new Response(new Blob(['xlsx']), { status: 200, headers: { 'Content-Disposition': `attachment; filename="${filename}"` } }));
    const container = document.createElement('div'); const root = createRoot(container);
    await act(async () => { root.render(<TermClosePanel context={{ academicYearId: 'year', groupId: 'group', readOnly: false }} onSelectStudent={vi.fn()} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    await act(async () => { (container.querySelector('button') as HTMLButtonElement)?.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(download).toHaveBeenCalled(); expect(click).toHaveBeenCalled();
    const anchor = createElement.mock.results.map(result => result.value).find(value => value instanceof HTMLAnchorElement) as HTMLAnchorElement;
    expect(anchor.download).toBe(filename);
    root.unmount();
  });
});
