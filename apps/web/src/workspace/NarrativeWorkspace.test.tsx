// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NarrativeWorkspace } from './NarrativeWorkspace';
import { workspaceApi, type NarrativeStateDto } from './workspace-api';

const state: NarrativeStateDto = { revision: 0, currentTerm: 'T1', completedCount: 0, archived: false, events: Array.from({ length: 9 }, (_, index) => ({ key: `event-${index + 1}`, ordinal: index + 1, title: `Escena ${index + 1}`, term: index < 3 ? 'T1' as const : index < 6 ? 'T2' as const : 'T3' as const, state: index === 0 ? 'AVAILABLE' as const : 'BLOCKED' as const, startedAt: null, mechanicKind: index === 0 ? 'CHALLENGE' as const : null, mechanicId: null, clues: [{ ordinal: 1, text: 'Pista privada', revealed: false }] })) };

describe('NarrativeWorkspace T6', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.restoreAllMocks(); });
  async function render(historical = false, dto: NarrativeStateDto = state) {
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    vi.spyOn(workspaceApi, 'narrative').mockResolvedValue({ ...dto, events: dto.events.map(event => ({ ...event })) });
    await act(async () => { root?.render(<NarrativeWorkspace groupId="group" academicYearId="year" historical={historical} />); await Promise.resolve(); });
  }

  it('loads on initial mount', async () => {
    const requests: Array<(value: NarrativeStateDto) => void> = [];
    const narrative = vi.spyOn(workspaceApi, 'narrative').mockImplementation(() => new Promise(resolve => requests.push(resolve)));
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<NarrativeWorkspace groupId="group" academicYearId="year" />); });
    expect(narrative).toHaveBeenCalledTimes(1);
    await act(async () => { requests[0](state); await Promise.resolve(); });
    expect(container?.textContent).toContain('0 de 9 escenas completadas');
  });

  it('ignores a stale response after a context change', async () => {
    const requests: Array<(value: NarrativeStateDto) => void> = [];
    vi.spyOn(workspaceApi, 'narrative').mockImplementation(() => new Promise(resolve => requests.push(resolve)));
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<NarrativeWorkspace groupId="group" academicYearId="year" />); });
    await act(async () => { root?.render(<NarrativeWorkspace groupId="other-group" academicYearId="year" />); });
    await act(async () => { requests[1]({ ...state, completedCount: 9, events: state.events.map(event => ({ ...event, state: 'COMPLETED' as const })) }); await Promise.resolve(); });
    await act(async () => { requests[0]({ ...state, completedCount: 0, events: state.events.map(event => ({ ...event })) }); await Promise.resolve(); });
    expect(container?.textContent).toContain('9 de 9 escenas completadas · controles privados del docente');
    expect(container?.textContent).not.toContain('0 de 9 escenas completadas');
  });

  it('presents the nine-event Spanish timeline and keeps clues teacher-private', async () => {
    await render();
    expect(container?.querySelectorAll('.narrative-event')).toHaveLength(9);
    expect(container?.textContent).toContain('Secuencia de nueve escenas');
    expect(container?.textContent).toContain('Disponible');
    expect(container?.textContent).not.toContain('Pista privada');
  });

  it('disables every narrative mutation in an archived context', async () => {
    await render(true);
    expect(Array.from(container?.querySelectorAll('button') ?? []).every(button => button.disabled)).toBe(true);
    expect(container?.textContent).toContain('solo lectura');
  });

  it('renders an archived DTO as read-only when the view is not historical', async () => {
    await render(false, { ...state, archived: true });
    expect(container?.querySelector('.read-only-note')?.textContent).toBe('Año archivado — la narrativa es de solo lectura.');
    expect(Array.from(container?.querySelectorAll('button') ?? []).every(button => button.disabled)).toBe(true);
  });

  it('retains one idempotency key when an action has an unknown outcome', async () => {
    await render();
    const command = vi.spyOn(workspaceApi, 'narrativeCommand').mockRejectedValue(new Error('network timeout'));
    await act(async () => { container?.querySelector<HTMLButtonElement>('button')?.click(); await Promise.resolve(); });
    await act(async () => { container?.querySelector<HTMLButtonElement>('button')?.click(); await Promise.resolve(); });
    expect(command).toHaveBeenCalledTimes(2);
    expect(command.mock.calls[0][5]).toBe(command.mock.calls[1][5]);
    expect(container?.textContent).toContain('misma clave');
  });
});
