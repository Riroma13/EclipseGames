// @vitest-environment happy-dom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudentPanel } from './StudentPanel';
import { workspaceApi, type GemCatalogueItem, type XpSummary } from './workspace-api';

const context = { academicYearId: 'year', groupId: 'group', studentId: 'student', realName: 'Ada Lovelace', alias: 'Ada', readOnly: false } as const;
const student = { id: 'student', groupId: 'group', realName: 'Ada Lovelace', alias: 'Ada', avatar: 'default', specialty: null, archivedAt: null };
const balances = { studentId: 'student', academicYearId: 'year', balances: { EMERALD: 2, RUBY: 1, DIAMOND: 0 } };
const catalogue: GemCatalogueItem[] = [{ id: 'emerald-assessment-advantage', currency: 'EMERALD', cost: 2, type: 'ASSESSMENT_ADVANTAGE' }];
const assessment = [{ id: 'assessment', groupId: 'group', name: 'Quiz', archivedAt: null }];
const actionState = { studentId: 'student', academicYearId: 'year', assessmentContextId: 'assessment', resultReward: null, advantageRedemption: null };
const coinSummary = { studentId: 'student', academicYearId: 'year', balance: 4 };
const coinEntry = [{ id: 'coin-entry', amount: 2, source: 'legacy', createdAt: '2026-09-12T10:00:00Z', correctionOfId: null }];
const coinRewards = [{ id: 'legacy-reward', name: 'Ayuda', cost: 2 as const, type: 'ASSESSMENT_ADVANTAGE' as const }];
const xpSummary: XpSummary = { studentId: 'student', academicYearId: 'year', annualEffectiveXp: 1, level: 1, progress: { isMaxLevel: false, progressPercent: 10, nextLevel: 2, xpToNextLevel: 9 }, badges: [] };

function renderPanel() {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => { root.render(<StudentPanel student={student} context={context} historical={false} feedback="" undo={null} onClose={() => undefined} onUndoResult={() => undefined} summary={null} onSummary={() => undefined} onFeedback={() => undefined} onUndo={() => undefined} />); });
  return { container, root };
}

async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

function buttonIn(label: string, section: Element) {
  return [...section.querySelectorAll('button')].find(button => button.textContent?.trim() === label) as HTMLButtonElement | undefined;
}

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('StudentPanel gem and legacy coin read isolation', () => {
  let root: Root | undefined;

  afterEach(() => { act(() => root?.unmount()); root = undefined; });

  it('keeps loaded coin history intact across gem read and action-state failures, then recovers without reloading coins', async () => {
    let gemReads = 0;
    let actionReads = 0;
    const coins = vi.spyOn(workspaceApi, 'coins').mockResolvedValue(coinSummary);
    const ledger = vi.spyOn(workspaceApi, 'coinLedger').mockResolvedValue(coinEntry);
    const rewards = vi.spyOn(workspaceApi, 'coinRewards').mockResolvedValue(coinRewards);
    vi.spyOn(workspaceApi, 'gems').mockImplementation(async () => { gemReads += 1; if (gemReads === 1) throw new Error('gem read failed'); return balances; });
    vi.spyOn(workspaceApi, 'gemCatalogue').mockResolvedValue(catalogue);
    vi.spyOn(workspaceApi, 'assessmentContexts').mockResolvedValue(assessment);
    vi.spyOn(workspaceApi, 'gemActionState').mockImplementation(async () => { actionReads += 1; if (actionReads === 1) throw new Error('action state failed'); return actionState; });
    root = renderPanel().root;
    await settle();
    expect(document.querySelector('[aria-label="Historial de monedas (solo lectura)"]')?.textContent).toContain('legacy · 2');
    const gems = document.querySelector('[aria-label="Gemas"]') as HTMLElement;
    expect(gems.textContent).toContain('No se pudo cargar. Reintentar');
    await act(async () => { buttonIn('Reintentar', gems)?.click(); });
    await settle();
    expect(gems.textContent).toContain('No se pudo cargar el estado. Reintentar');
    await act(async () => { buttonIn('Reintentar', gems)?.click(); });
    await settle();
    expect(gems.textContent).toContain('Otorgar recompensa');
    expect(coins).toHaveBeenCalledTimes(1);
    expect(ledger).toHaveBeenCalledTimes(1);
    expect(rewards).toHaveBeenCalledTimes(1);
    expect(gemReads).toBe(3);
    expect(actionReads).toBe(2);
  });

  it('keeps removal feedback visible in the empty panel without changing selected rendering', () => {
    root = renderPanel().root;
    expect(document.querySelector('h2')?.textContent).toBe('Ada Lovelace');

    act(() => {
      root?.render(<StudentPanel student={null} context={null} historical={false} feedback="The selected student is no longer available." undo={null} onClose={() => undefined} onUndoResult={() => undefined} summary={null} onSummary={() => undefined} onFeedback={() => undefined} onUndo={() => undefined} />);
    });

    const panel = document.querySelector('.student-panel.panel-empty');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('Selecciona un estudiante para consultar su contexto de clase.');
    expect(panel?.textContent).toContain('The selected student is no longer available.');
  });

  it('keeps loaded gem actions usable across coin read failure and retry without reloading gem state', async () => {
    let coinReads = 0;
    const coins = vi.spyOn(workspaceApi, 'coins').mockImplementation(async () => { coinReads += 1; if (coinReads === 1) throw new Error('coin read failed'); return coinSummary; });
    vi.spyOn(workspaceApi, 'coinLedger').mockResolvedValue(coinEntry);
    vi.spyOn(workspaceApi, 'coinRewards').mockResolvedValue(coinRewards);
    const gems = vi.spyOn(workspaceApi, 'gems').mockResolvedValue(balances);
    vi.spyOn(workspaceApi, 'gemCatalogue').mockResolvedValue(catalogue);
    vi.spyOn(workspaceApi, 'assessmentContexts').mockResolvedValue(assessment);
    const actionStateReads = vi.spyOn(workspaceApi, 'gemActionState').mockResolvedValue(actionState);
    root = renderPanel().root;
    await settle();
    const gemsSection = document.querySelector('[aria-label="Gemas"]') as HTMLElement;
    const history = document.querySelector('[aria-label="Historial de monedas (solo lectura)"]') as HTMLElement;
    expect(history.textContent).toContain('No se pudo cargar el historial. Reintentar');
    expect(buttonIn('Otorgar recompensa', gemsSection)?.disabled).toBe(false);
    const gemReadCount = gems.mock.calls.length;
    const actionStateReadCount = actionStateReads.mock.calls.length;
    await act(async () => { buttonIn('Reintentar', history)?.click(); });
    await settle();
    expect(history.textContent).toContain('legacy · 2');
    expect(buttonIn('Otorgar recompensa', gemsSection)?.disabled).toBe(false);
    expect(gems).toHaveBeenCalledTimes(gemReadCount);
    expect(actionStateReads).toHaveBeenCalledTimes(actionStateReadCount);
    expect(coins).toHaveBeenCalledTimes(2);
  });

  it('restores origin focus after resolved XP leaves the dialog and document Escape closes the tablet panel', async () => {
    const previousWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    let resolveXp!: (value: { value: { event: { id: string; baseXp: number; specialtyBonusXp: number; effectiveXp: number }; summary: XpSummary }; replayed: boolean }) => void;
    vi.spyOn(workspaceApi, 'registerXp').mockReturnValue(new Promise(resolve => { resolveXp = resolve; }));
    const origin = document.createElement('button');
    origin.type = 'button';
    origin.textContent = 'Ada';
    document.body.append(origin);

    function Harness() {
      const [open, setOpen] = useState(true);
      return open ? <StudentPanel student={student} context={context} historical={false} feedback="" undo={null} onClose={() => setOpen(false)} originRef={{ current: origin }} onUndoResult={() => undefined} summary={null} onSummary={() => undefined} onFeedback={() => undefined} onUndo={() => undefined} /> : null;
    }

    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.append(container);
    act(() => { origin.focus(); });
    expect(document.activeElement).toBe(origin);
    act(() => { root = createRoot(container); root.render(<Harness />); });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    act(() => { (dialog.querySelector('button[aria-label^="COMMUNICATION"]') as HTMLButtonElement).click(); });
    act(() => { (dialog.querySelector('.xp-values button') as HTMLButtonElement).click(); });
    expect(dialog.querySelector('.xp-values')).not.toBeNull();

    await act(async () => { resolveXp({ value: { event: { id: 'event', baseXp: 1, specialtyBonusXp: 0, effectiveXp: 1 }, summary: xpSummary }, replayed: false }); });
    expect(dialog.querySelector('.xp-values')).toBeNull();
    act(() => { origin.focus(); });
    expect(dialog.contains(document.activeElement)).toBe(false);

    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(origin);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth });
  });

  it('preserves explicit close focus restoration', () => {
    const previousWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    const origin = document.createElement('button');
    document.body.append(origin);

    function Harness() {
      const [open, setOpen] = useState(true);
      return open ? <StudentPanel student={student} context={context} historical={false} feedback="" undo={null} onClose={() => setOpen(false)} originRef={{ current: origin }} onUndoResult={() => undefined} summary={null} onSummary={() => undefined} onFeedback={() => undefined} onUndo={() => undefined} /> : null;
    }

    const container = document.createElement('div');
    document.body.append(container);
    act(() => { root = createRoot(container); root.render(<Harness />); });
    act(() => { (document.querySelector('button[aria-label="Cerrar ficha del estudiante"]') as HTMLButtonElement).click(); });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(origin);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth });
  });
});
