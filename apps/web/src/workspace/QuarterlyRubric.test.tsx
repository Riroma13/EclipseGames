// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuarterlyRubric, formatRubricGrade } from './QuarterlyRubric';

const context = { academicYearId:'00000000-0000-4000-8000-000000000001', groupId:'00000000-0000-4000-8000-000000000002', studentId:'00000000-0000-4000-8000-000000000003', realName:'Ada', alias:'Ada', readOnly:false } as const;
const term = { id:'00000000-0000-4000-8000-000000000004', code:'T1' as const, startsOn:'2026-09-01', endsOn:'2026-12-01' };
const rubric = { studentId:context.studentId, academicYearId:context.academicYearId, termId:term.id, state:'OPEN' as const, revision:0, archived:false, draftComment:null, stale:false, unattributedAnnualEventCount:0, snapshot:null, categories:['COMMUNICATION','PRECISION','CONSISTENCY','COLLABORATION'].map(category => ({ category, baseXp:0, qualifyingEventCount:0, suggestedLevel:1 as const, overrideLevel:null, finalLevel:1 as const, lowEvidence:true })) };
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('QuarterlyRubric private teacher workspace', () => {
  let root:Root|undefined;
  afterEach(() => { act(() => root?.unmount()); root = undefined; vi.restoreAllMocks(); });
  it('renders Spanish empty, evidence, actions, and pending states without browser persistence', async () => {
    let resolveSave: ((response:Response)=>void)|undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes('/calendar')) return Promise.resolve(new Response(JSON.stringify({ configured:true, terms:[term], holidays:[], slots:[], academicYearId:context.academicYearId, timezone:'UTC', canReplace:false }), { status:200 }));
      if (init?.method === 'PUT') return new Promise<Response>(resolve => { resolveSave = resolve; });
      return Promise.resolve(new Response(JSON.stringify(rubric), { status:200 }));
    });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<QuarterlyRubric context={context} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('Rúbrica trimestral');
    expect(container.textContent).toContain('Menos de 4 evidencias');
    expect(container.textContent).toContain('Guardar cambios');
    const save = [...container.querySelectorAll('button')].find(button => button.textContent === 'Guardar cambios') as HTMLButtonElement;
    await act(async () => { save.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('No repitas la acción');
    expect(save.disabled).toBe(true);
    resolveSave?.(new Response(JSON.stringify(rubric), { status:200 }));
  });
  it('shows closed exact grade, stale evidence and read-only archive state', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => new Response(JSON.stringify(String(input).includes('/calendar') ? { configured:true, terms:[term], holidays:[], slots:[], academicYearId:context.academicYearId, timezone:'UTC', canReplace:false } : { ...rubric, state:'CLOSED', archived:true, stale:true, snapshot:{version:2,gradeMilli:8125,gradeDecimal:'8.125',comment:'Private comment',closedAt:'2026-12-01T10:00:00Z',closedByTeacherId:'teacher',priorVersion:1} }), { status:200 }));
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<QuarterlyRubric context={{ ...context, readOnly:true }} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('8,125/10'); expect(container.textContent).toContain('La evidencia cambió'); expect(container.textContent).toContain('Solo lectura'); expect(container.textContent).not.toContain('Reabrir evaluación');
  });
  it('formats the API decimal exactly with Spanish punctuation', () => { expect(formatRubricGrade('7.500')).toBe('7,5/10'); expect(formatRubricGrade('10.000')).toBe('10/10'); });

  it('renders the loading status before calendar data and keeps controls unavailable', async () => {
    let resolveCalendar: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input).includes('/calendar')) return new Promise<Response>(resolve => { resolveCalendar = resolve; });
      return new Response(JSON.stringify(rubric), { status:200 });
    });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<QuarterlyRubric context={context} />); });
    expect(container.textContent).toContain('Cargando rúbrica');
    expect(container.querySelectorAll('button')).toHaveLength(0);
    resolveCalendar?.(new Response(JSON.stringify({ configured:false, canReplace:true }), { status:200 }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  });

  it('covers unconfigured calendar, calendar retry, and zero-evidence guidance', async () => {
    let attempts = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input).includes('/calendar')) {
        attempts += 1;
        if (attempts === 1) return new Response(JSON.stringify({ message: 'temporary' }), { status: 503 });
        return new Response(JSON.stringify({ configured: false, canReplace: true }), { status: 200 });
      }
      return new Response(JSON.stringify(rubric), { status: 200 });
    });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<QuarterlyRubric context={context} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('No se pudo cargar el calendario');
    await act(async () => { (container.querySelector('button') as HTMLButtonElement).click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('No hay trimestres configurados');
    expect(attempts).toBe(2);
  });

  it('preserves an ambiguous save retry key and local edits after a stale revision', async () => {
    const keys: string[] = [];
    let saveAttempts = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/calendar')) return new Response(JSON.stringify({ configured:true, terms:[term], holidays:[], slots:[], academicYearId:context.academicYearId, timezone:'UTC', canReplace:false }), { status:200 });
      if (init?.method === 'PUT') {
        keys.push(String((init.headers as Record<string, string>)['Idempotency-Key']));
        saveAttempts += 1;
        if (saveAttempts === 1) return Promise.reject(new Error('network timeout'));
        return new Response(JSON.stringify({ ...rubric, revision:1, draftComment:'persisted retry' }), { status:200 });
      }
      return new Response(JSON.stringify({ ...rubric, draftComment:'server draft' }), { status:200 });
    });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<QuarterlyRubric context={context} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    const comment = container.querySelector('textarea') as HTMLTextAreaElement;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(comment, 'local edit'); comment.dispatchEvent(new InputEvent('input', { bubbles:true, inputType:'insertText', data:'local edit' })); comment.dispatchEvent(new Event('change', { bubbles:true })); });
    const save = [...container.querySelectorAll('button')].find(button => button.textContent === 'Guardar cambios') as HTMLButtonElement;
    await act(async () => { save.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('Guardar cambios No se pudo completar. Reintentar.');
    expect(container.querySelector('textarea')?.value).toBe('local edit');
    await act(async () => { save.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);

    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).includes('/calendar')) return new Response(JSON.stringify({ configured:true, terms:[term], holidays:[], slots:[], academicYearId:context.academicYearId, timezone:'UTC', canReplace:false }), { status:200 });
      if (init?.method === 'PUT') return new Response(JSON.stringify({ message:'stale' }), { status:409 });
      return new Response(JSON.stringify({ ...rubric, draftComment:'server draft' }), { status:200 });
    });
    await act(async () => { const localComment = container.querySelector('textarea') as HTMLTextAreaElement; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(localComment, 'still local'); localComment.dispatchEvent(new InputEvent('input', { bubbles:true, inputType:'insertText', data:'still local' })); localComment.dispatchEvent(new Event('change', { bubbles:true })); });
    await act(async () => { save.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('La versión cambió');
    expect(container.querySelector('textarea')?.value).toBe('still local');
    expect([...container.querySelectorAll('button')].some(button => button.textContent === 'Recargar')).toBe(true);
  });

  it('requires confirmation and a reason to reopen, then returns to editable REOPENED state', async () => {
    let reopenResolve: ((response: Response) => void) | undefined;
    const closed = { ...rubric, state:'CLOSED' as const, revision:3, snapshot:{ version:1, gradeMilli:8125, gradeDecimal:'8.125', comment:'Cierre privado', closedAt:'2026-12-01T10:00:00Z', closedByTeacherId:'teacher', priorVersion:null } };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).includes('/calendar')) return new Response(JSON.stringify({ configured:true, terms:[term], holidays:[], slots:[], academicYearId:context.academicYearId, timezone:'UTC', canReplace:false }), { status:200 });
      if (init?.method === 'POST') return new Promise<Response>(resolve => { reopenResolve = resolve; });
      return new Response(JSON.stringify(closed), { status:200 });
    });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<QuarterlyRubric context={context} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('8,125/10');
    expect((container.querySelector('select[aria-label^="Nivel final"]') as HTMLSelectElement).disabled).toBe(true);
    await act(async () => { [...container.querySelectorAll('button')].find(button => button.textContent === 'Reabrir evaluación')?.click(); });
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    const confirm = [...container.querySelectorAll('button')].find(button => button.textContent === 'Confirmar reapertura') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    await act(async () => { const reason = container.querySelector('[role="dialog"] textarea') as HTMLTextAreaElement; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(reason, 'Corregir evidencia'); reason.dispatchEvent(new InputEvent('input', { bubbles:true, inputType:'insertText', data:'Corregir evidencia' })); });
    expect(confirm.disabled).toBe(false);
    await act(async () => { confirm.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('No repitas la acción');
    expect(confirm.disabled).toBe(true);
    reopenResolve?.(new Response(JSON.stringify({ ...closed, state:'REOPENED', revision:4, draftComment:'Cierre privado' }), { status:200 }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('Guardar cambios');
  });

  it('clears private state on context change and reconstructs the server draft after remount', async () => {
    const secondContext = { ...context, studentId:'00000000-0000-4000-8000-000000000005', alias:'Grace' };
    const requests: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input); requests.push(url);
      if (url.includes('/calendar')) return new Response(JSON.stringify({ configured:true, terms:[term], holidays:[], slots:[], academicYearId:context.academicYearId, timezone:'UTC', canReplace:false }), { status:200 });
      return new Response(JSON.stringify({ ...rubric, studentId:url.includes(secondContext.studentId) ? secondContext.studentId : context.studentId, draftComment:url.includes(secondContext.studentId) ? 'Grace draft' : 'Ada private draft' }), { status:200 });
    });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<QuarterlyRubric context={context} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('Ada private draft');
    await act(async () => { root?.render(<QuarterlyRubric key="new-context" context={secondContext} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).not.toContain('Ada private draft');
    expect(container.textContent).toContain('Grace draft');
    expect(requests.some(url => url.includes(secondContext.studentId))).toBe(true);
    act(() => root?.unmount()); root = createRoot(container);
    await act(async () => { root?.render(<QuarterlyRubric context={secondContext} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.textContent).toContain('Grace draft');
  });

  it('guards term navigation with a focused discard confirmation for unsaved edits', async () => {
    const secondTerm = { ...term, id:'00000000-0000-4000-8000-000000000006', code:'T2' as const };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input).includes('/calendar')) return new Response(JSON.stringify({ configured:true, terms:[term, secondTerm], holidays:[], slots:[], academicYearId:context.academicYearId, timezone:'UTC', canReplace:false }), { status:200 });
      return new Response(JSON.stringify(rubric), { status:200 });
    });
    const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<QuarterlyRubric context={context} />); await new Promise(resolve => setTimeout(resolve, 0)); });
    const comment = container.querySelector('textarea') as HTMLTextAreaElement;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(comment, 'cambio sin guardar'); comment.dispatchEvent(new InputEvent('input', { bubbles:true, inputType:'insertText', data:'cambio sin guardar' })); });
    const termSelect = container.querySelector('#rubric-term') as HTMLSelectElement;
    await act(async () => { termSelect.value = secondTerm.id; termSelect.dispatchEvent(new Event('change', { bubbles:true })); });
    expect(confirm).toHaveBeenCalledWith('Tienes cambios sin guardar. ¿Descartarlos?');
    expect(termSelect.value).toBe(term.id);
    confirm.mockReturnValue(true);
    await act(async () => { termSelect.value = secondTerm.id; termSelect.dispatchEvent(new Event('change', { bubbles:true })); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect((container.querySelector('#rubric-term') as HTMLSelectElement).value).toBe(secondTerm.id);
  });
});
