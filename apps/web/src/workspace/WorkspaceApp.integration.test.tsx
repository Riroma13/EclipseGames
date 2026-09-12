// @vitest-environment happy-dom
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceApp } from './WorkspaceApp';

const yearId = '00000000-0000-4000-8000-000000000001';
const groupId = '00000000-0000-4000-8000-000000000002';
const studentId = '00000000-0000-4000-8000-000000000003';
const activeYearId = '00000000-0000-4000-8000-000000000011';
const activeGroupId = '00000000-0000-4000-8000-000000000012';
const activeStudentId = '00000000-0000-4000-8000-000000000013';

const activeYear = { id: yearId, label: '2026–2027', startsOn: '2026-09-01', endsOn: '2027-07-01', archivedAt: null };
const archivedYear = { ...activeYear, archivedAt: '2026-09-12T12:00:00.000Z' };
const group = { id: groupId, academicYearId: yearId, name: 'Groupe principal' };
const student = { id: studentId, groupId, realName: 'Ada Lovelace', alias: 'Ada', avatar: 'default', specialty: null, archivedAt: null };
const secondYear = { ...activeYear, id: activeYearId, label: '2027–2028' };
const secondGroup = { id: activeGroupId, academicYearId: activeYearId, name: 'Groupe avancé' };
const secondStudent = { ...student, id: activeStudentId, groupId: activeGroupId, realName: 'Grace Hopper', alias: 'Grace' };

function json(value: unknown) {
  return Promise.resolve(new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } }));
}

function responseFor(url: string) {
  if (url.includes('/academic-years?')) return json([archivedYear]);
  if (url.includes(`/academic-years/${yearId}/groups`)) return json([group]);
  if (url.includes(`/groups/${groupId}/students`)) return json([student]);
  if (url.includes('/xp-summaries')) return json({ groupId, academicYearId: yearId, summaries: [] });
  if (url.includes('/xp-evidence')) return json({ items: [], nextCursor: null });
  if (url.includes('/assessment-contexts')) return json([]);
  if (url.includes('/gems')) return json({ studentId, academicYearId: yearId, balances: { EMERALD: 0, RUBY: 0, DIAMOND: 0 } });
  if (url.includes('/gem-rewards')) return json([]);
  if (url.includes('/coins')) return json({ studentId, academicYearId: yearId, balance: 0 });
  if (url.includes('/coin-rewards')) return json([]);
  if (url.includes('/coin-ledger')) return json([]);
  if (url.includes('/calendar')) return json({ configured: false, canReplace: true });
  if (url.includes('/real-class-session-status')) return json({ configured: false, canReplace: true, eligible: false, reason: 'UNCONFIGURED', startTiming: null, message: '', currentClass: null, nextClass: null, activeForSelectedGroup: false, active: null });
  if (url.includes('/projection-control')) return json(null);
  return json([]);
}

async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
  });
}

describe('WorkspaceApp mounted production path', () => {
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    vi.restoreAllMocks();
  });

  it('keeps the authoritative archived year from the initial URL through StrictMode effect rehydration', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', `/#/workspace?year=${yearId}&group=${groupId}&student=${studentId}`);
    const yearRequests: Array<(response: Response) => void> = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/academic-years?')) return new Promise<Response>(resolve => yearRequests.push(resolve));
      return responseFor(url) as Promise<Response>;
    });
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<StrictMode><HashRouter><WorkspaceApp /></HashRouter></StrictMode>);
    });
    expect(yearRequests.length).toBeGreaterThanOrEqual(2);
    await act(async () => {
      const archived = new Response(JSON.stringify([archivedYear]), { status: 200, headers: { 'content-type': 'application/json' } });
      const active = () => new Response(JSON.stringify([activeYear]), { status: 200, headers: { 'content-type': 'application/json' } });
      yearRequests.at(-1)?.(archived);
      for (const resolve of yearRequests.slice(0, -1)) resolve(active());
    });
    await settle();

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`includeArchived=true`), expect.objectContaining({ cache: 'no-store' }));
    expect(document.body.textContent).toContain('Historical year — records are read-only.');
    expect(document.querySelector('select[aria-label="Academic year"]')?.getAttribute('value')).toBeNull();
    expect((document.querySelector('select[aria-label="Academic year"]') as HTMLSelectElement).value).toBe(yearId);
    expect(document.body.textContent).toContain('Ada Lovelace');
    expect(container.isConnected).toBe(true);
  });

  it('rehydrates invalid students, preserves active navigation, and transitions from archived to active', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', `/#/workspace?year=${yearId}&group=${groupId}&student=${studentId}`);
    let yearsPayload = [archivedYear, secondYear];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/academic-years?')) return json(yearsPayload);
      if (url.includes(`/academic-years/${activeYearId}/groups`)) return json([secondGroup]);
      if (url.includes(`/groups/${activeGroupId}/students`)) return json([secondStudent]);
      return responseFor(url);
    });
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<StrictMode><HashRouter><WorkspaceApp /></HashRouter></StrictMode>);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    await settle();
    expect(document.body.textContent).toContain('Historical year — records are read-only.');
    expect(document.body.textContent).toContain('Ada Lovelace');
    await act(async () => {
      root?.unmount();
      root = createRoot(container);
      root.render(<StrictMode><HashRouter><WorkspaceApp /></HashRouter></StrictMode>);
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(document.body.textContent).toContain('Historical year — records are read-only.');

    yearsPayload = [activeYear, secondYear];
    await act(async () => {
      window.location.hash = `#/workspace?year=${activeYearId}&group=${activeGroupId}&student=${activeStudentId}`;
      window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(document.body.textContent).not.toContain('Historical year — records are read-only.');
    expect(document.body.textContent).toContain('2027–2028');
    expect(document.body.textContent).toContain('Grace Hopper');

    await act(async () => {
      window.location.hash = `#/workspace?year=${activeYearId}&group=${activeGroupId}&student=${studentId}`;
      window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(document.querySelector('.student-panel.panel-empty')).not.toBeNull();
    expect(document.querySelectorAll('.roster-grid button[aria-pressed="true"]')).toHaveLength(0);
  });

  it('keeps the archived DTO after an active list was already loaded and reload responses race', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', `/#/workspace?year=${yearId}&group=${groupId}&student=${studentId}`);
    let archived = false;
    const pendingYears: Array<(response: Response) => void> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/academic-years?')) {
        if (!archived) return json([activeYear]);
        return new Promise<Response>(resolve => pendingYears.push(resolve));
      }
      return responseFor(url);
    });
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<StrictMode><HashRouter><WorkspaceApp /></HashRouter></StrictMode>);
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(document.body.textContent).not.toContain('Historical year — records are read-only.');

    archived = true;
    await act(async () => {
      root?.unmount();
      root = createRoot(container);
      root.render(<StrictMode><HashRouter><WorkspaceApp /></HashRouter></StrictMode>);
    });
    await settle();
    expect(pendingYears.length).toBeGreaterThanOrEqual(2);
    await act(async () => {
      const authoritative = new Response(JSON.stringify([archivedYear]), { status: 200, headers: { 'content-type': 'application/json' } });
      const stale = () => new Response(JSON.stringify([activeYear]), { status: 200, headers: { 'content-type': 'application/json' } });
      pendingYears.at(-1)?.(authoritative);
      for (const resolve of pendingYears.slice(0, -1)) resolve(stale());
    });
    await settle();
    expect(document.body.textContent).toContain('Historical year — records are read-only.');
    expect((document.querySelector('select[aria-label="Academic year"]') as HTMLSelectElement).value).toBe(yearId);
  });
});
