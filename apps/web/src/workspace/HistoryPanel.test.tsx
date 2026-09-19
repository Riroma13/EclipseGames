// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HistoryPanel } from './HistoryPanel';
import { workspaceApi } from './workspace-api';

const year = { id:'year', label:'2026', startsOn:'2026-01-01', endsOn:'2026-12-31', archivedAt:'2027-01-01' };
const group = { id:'group', academicYearId:'year', name:'Grupo' };
const student = { id:'student', groupId:'group', realName:'Ada Lovelace', alias:'Ada', avatar:'default', specialty:null, archivedAt:null };
const item = { id:'history-1', family:'XP' as const, kind:'REGISTERED', occurredAt:'2026-09-01T10:00:00Z', student:{ id:'student', realName:'Ada Lovelace', alias:'Ada' }, termId:null, sessionId:null, title:'XP registrado', summary:'Evidencia cerrada', facts:{ value:null, amount:1, currency:null, state:null, revision:null }, correction:null };

describe('HistoryPanel', () => {
  let root: Root | undefined;
  afterEach(() => { act(() => root?.unmount()); root = undefined; vi.restoreAllMocks(); window.history.replaceState(null, '', '/#/workspace'); });
  it('loads, preserves server order, and paginates without duplicate items', async () => {
    const history = vi.spyOn(workspaceApi, 'history').mockResolvedValueOnce({ items:[item], nextCursor:'next' }).mockResolvedValueOnce({ items:[item, {...item, id:'history-2'}], nextCursor:null });
    vi.spyOn(workspaceApi, 'calendar').mockResolvedValue({ configured:false, canReplace:true });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<HistoryPanel group={group} year={year} students={[student]} onSessionExpired={vi.fn()} />); });
    expect(container.textContent).toContain('XP registrado');
    await act(async () => { (container.querySelector('button:not(.quiet-button)') as HTMLButtonElement).click(); });
    expect(container.querySelectorAll('.history-item')).toHaveLength(2);
    expect(history).toHaveBeenCalledWith('group', expect.objectContaining({ academicYearId:'year', cursor:'next' }), expect.any(AbortSignal));
  });
  it('restores URL filters and exposes a private read-only empty state', async () => {
    window.history.replaceState(null, '', '/#/workspace?historyFamily=RT&historyFrom=2026-09-01');
    vi.spyOn(workspaceApi, 'history').mockResolvedValue({ items:[], nextCursor:null });
    vi.spyOn(workspaceApi, 'calendar').mockResolvedValue({ configured:false, canReplace:true });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<HistoryPanel group={group} year={year} students={[student]} onSessionExpired={vi.fn()} />); });
    expect((container.querySelector('[aria-label="Familia"]') as HTMLSelectElement).value).toBe('RT');
    expect(container.textContent).toContain('No hay registros con estos filtros.');
    expect(container.textContent).toContain('solo lectura');
    expect(container.textContent).not.toContain('Show Student');
  });
});
