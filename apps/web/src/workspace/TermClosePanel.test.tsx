// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TermClosePanel } from './TermClosePanel';

const context = { academicYearId:'00000000-0000-4000-8000-000000000001', groupId:'00000000-0000-4000-8000-000000000002', readOnly:false } as const;
const term = { id:'00000000-0000-4000-8000-000000000004', code:'T1' as const, startsOn:'2026-09-01', endsOn:'2026-12-01' };
const row = (index:number, rubricState:'CLOSED'|'OPEN' = 'CLOSED') => ({ studentId:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`, realName:`Alumno ${String(index).padStart(2,'0')}`, rubricState, snapshotVersion:rubricState === 'CLOSED' ? 2 : null, rtCount:index % 2, gradeMilli: rubricState === 'CLOSED' ? 8125 : null, rtAverage: index % 2 ? 10 : null });
  const readiness = { state:'OPEN' as const, revision:3, currentSnapshotVersion:null, activeCount:30, readyCount:29, ready:false, students:[...Array(30)].map((_, index) => row(index + 1, index === 29 ? 'OPEN' : 'CLOSED')), blockers:['Alumno 30'], staleReasons:[], b01Count:0, b01Warning:null };
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('TermClosePanel Spanish teacher workflow', () => {
  let root:Root|undefined;
  afterEach(() => { act(() => root?.unmount()); root = undefined; vi.restoreAllMocks(); });

  it('shows the 30-student readiness table, pending filter, next rubric action and disabled explanation', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => new Response(JSON.stringify(String(input).includes('/calendar') ? { configured:true, terms:[term], holidays:[], slots:[], academicYearId:context.academicYearId, timezone:'UTC', canReplace:false } : readiness), { status:200 }));
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<TermClosePanel context={context} onSelectStudent={vi.fn()} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('Cierre trimestral');
    expect(container.textContent).toContain('29 de 30 listos');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(30);
    expect(container.textContent).toContain('Solo pendientes');
    expect(container.textContent).toContain('Cerrar trimestre');
    expect((container.querySelector('button[aria-label="Cerrar trimestre"]') as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain('Falta cerrar la rúbrica de 1 estudiante');
    const select = container.querySelector('input[aria-label="Solo pendientes"]') as HTMLInputElement;
    await act(async () => { select.click(); });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('uses group close controls, retains a retry key, and exposes closed stale/download/reopen state', async () => {
    let closeAttempts = 0; const onSelectStudent = vi.fn();
    const closed = { ...readiness, state:'CLOSED' as const, ready:true, readyCount:30, currentSnapshotVersion:2, blockers:[], staleReasons:['La evidencia RT cambió'] };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/calendar')) return new Response(JSON.stringify({ configured:true, terms:[term], holidays:[], slots:[], academicYearId:context.academicYearId, timezone:'UTC', canReplace:false }), { status:200 });
      if (init?.method === 'POST') { closeAttempts++; return new Response(JSON.stringify({ revision:4, version:2 }), { status: closeAttempts === 1 ? 409 : 201 }); }
      return new Response(JSON.stringify(closed), { status:200 });
    });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<TermClosePanel context={context} onSelectStudent={onSelectStudent} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('Versión 2'); expect(container.textContent).toContain('La evidencia RT cambió');
    expect(container.textContent).toContain('Calificación oficial'); expect(container.textContent).toContain('RT');
    expect(container.textContent).toContain('Exportar XLSX'); expect(container.textContent).toContain('Reabrir cierre');
    const pending = container.querySelector('button[data-action="next-pending"]') as HTMLButtonElement;
    pending?.click(); expect(onSelectStudent).toHaveBeenCalledWith(readiness.students[29].studentId);
  });

  it('prevents duplicate close, reports a stale 409, and allows a reasoned reopen', async () => {
    let closeCalls = 0; const ready = { ...readiness, ready:true, readyCount:30, students:readiness.students.map(student => ({ ...student, rubricState:'CLOSED' as const })) };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/calendar')) return new Response(JSON.stringify({ configured:true, terms:[term] }), { status:200 });
      if (init?.method === 'POST') { closeCalls++; return new Response(JSON.stringify({ message:'stale' }), { status: closeCalls === 1 ? 409 : 201 }); }
      return new Response(JSON.stringify(ready), { status:200 });
    });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<TermClosePanel context={context} onSelectStudent={vi.fn()} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    const close = container.querySelector('button[aria-label="Cerrar trimestre"]') as HTMLButtonElement;
    await act(async () => { close.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('El cierre cambió');
  });
});
