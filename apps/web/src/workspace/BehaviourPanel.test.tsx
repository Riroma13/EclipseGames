// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BehaviourPanel } from './BehaviourPanel';
import { workspaceApi } from './workspace-api';

const context = { academicYearId:'year', groupId:'group', studentId:'student', realName:'Ada', alias:'Ada', readOnly:false };
const student = { id:'student', groupId:'group', realName:'Ada Lovelace', alias:'Ada', avatar:'', specialty:null, archivedAt:null };
const session = { id:'session', academicYearId:'year', groupId:'group', localDate:'2026-09-13', timezone:'UTC', slotStartsAt:'08:00', slotEndsAt:'09:00', startedAt:'2026-09-13T08:00:00Z', endedAt:null, createdAt:'2026-09-13T08:00:00Z' };
const state = { sessionId:'session', studentId:'student', lives:2, state:'ALERT' as const, restrictions:{ bonusAllowed:false, receiveGemAllowed:false, spendGemAllowed:false, specialActivityAllowed:true }, lastActionId:'action', incidentStatus:'ACTIVE' as const, proposal:{ id:'proposal', status:'OPEN' as const } };
function render() { const container=document.createElement('div'); document.body.append(container); const root=createRoot(container); act(() => root.render(<BehaviourPanel student={student} context={context} session={session} readOnly={false} onFeedback={vi.fn()} />)); return {container,root}; }
async function settle() { await act(async () => { await Promise.resolve(); }); }

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML=''; });

describe('private teacher behaviour controls', () => {
  it('shows Spanish lives/state and supports loss, restore, undo, and proposal dismissal', async () => {
    vi.spyOn(workspaceApi, 'behaviour').mockResolvedValue({ sessionId:'session', students:[state] });
    vi.spyOn(workspaceApi, 'loseLife').mockResolvedValue({ value:{...state, lives:1, state:'RED_CODE', proposal:null}, replayed:false });
    vi.spyOn(workspaceApi, 'restoreLife').mockResolvedValue({ value:state, replayed:false });
    vi.spyOn(workspaceApi, 'correctBehaviourAction').mockResolvedValue({ value:state, replayed:false });
    vi.spyOn(workspaceApi, 'dismissBehaviourProposal').mockResolvedValue({ value:{id:'proposal',sessionId:'session',studentId:'student',status:'DISMISSED'}, replayed:false });
    const {container}=render(); await settle();
    expect(container.textContent).toContain('Vidas'); expect(container.textContent).toContain('Alerta'); expect(container.textContent).toContain('Quitar vida');
    await act(async () => { (container.querySelector('button') as HTMLButtonElement).click(); });
    expect(workspaceApi.loseLife).toHaveBeenCalled();
    await act(async () => { [...container.querySelectorAll('button')].find(button => button.textContent === 'Restaurar vida')?.click(); });
    expect(workspaceApi.restoreLife).toHaveBeenCalled();
    await act(async () => { [...container.querySelectorAll('button')].find(button => button.textContent === 'Deshacer')?.click(); });
    expect(workspaceApi.correctBehaviourAction).toHaveBeenCalledWith('action', expect.any(String));
    await act(async () => { [...container.querySelectorAll('button')].find(button => button.textContent === 'Descartar propuesta')?.click(); });
    expect(workspaceApi.dismissBehaviourProposal).toHaveBeenCalledWith('proposal');
  });

  it('handles no active session, read-only, loading, and retry states', async () => {
    const {container,root}=render();
    expect(container.textContent).toContain('Cargando');
    await act(async () => root.render(<BehaviourPanel student={student} context={context} session={null} readOnly={true} onFeedback={vi.fn()} />));
    expect(container.textContent).toContain('No hay una clase activa');
  });

  it('offers retry after a load error and disables private actions in read-only context', async () => {
    const load = vi.spyOn(workspaceApi, 'behaviour').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ sessionId:'session', students:[state] });
    const {container,root}=render(); await settle();
    expect(container.textContent).toContain('Reintentar');
    await act(async () => { [...container.querySelectorAll('button')].find(button => button.textContent === 'Reintentar')?.click(); }); await settle();
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => root.render(<BehaviourPanel student={student} context={context} session={session} readOnly={true} onFeedback={vi.fn()} />)); await settle();
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('drops the prior student state when the selected context changes', async () => {
    const load = vi.spyOn(workspaceApi, 'behaviour').mockResolvedValue({ sessionId:'session', students:[state] });
    const {container,root}=render(); await settle();
    const nextStudent = {...student, id:'other'};
    const nextContext = {...context, studentId:'other'};
    await act(async () => root.render(<BehaviourPanel student={nextStudent} context={nextContext} session={session} readOnly={false} onFeedback={vi.fn()} />)); await settle();
    expect(load).toHaveBeenCalledTimes(2); expect(container.textContent).toContain('no está en la clase activa');
  });
});
