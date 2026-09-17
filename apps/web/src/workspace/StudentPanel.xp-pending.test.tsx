// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterXp } from './StudentPanel';
import { workspaceApi, type XpSummary } from './workspace-api';

const summary: XpSummary = {
  studentId: 'student', academicYearId: 'year', annualEffectiveXp: 1, level: 1,
  progress: { isMaxLevel: false, progressPercent: 10, nextLevel: 2, xpToNextLevel: 9 }, badges: [],
};

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('RegisterXp pending accessibility', () => {
  let root: Root | undefined;

  afterEach(() => { act(() => root?.unmount()); root = undefined; });

  it('announces unresolved registration politely, disables values, then replaces it after resolution', async () => {
    let resolve!: (value: { value: { event: { id: string; baseXp: number; specialtyBonusXp: number; effectiveXp: number }; summary: XpSummary }; replayed: boolean }) => void;
    const register = vi.spyOn(workspaceApi, 'registerXp').mockReturnValue(new Promise(resolvePromise => { resolve = resolvePromise; }));
    const onFeedback = vi.fn();
    const container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    act(() => { root?.render(<RegisterXp studentId="student" specialty={null} contextKey="year:student" onSummary={vi.fn()} onFeedback={onFeedback} onUndo={vi.fn()} />); });

    act(() => { (container.querySelector('button[aria-label^="COMMUNICATION"]') as HTMLButtonElement | null)?.click(); });
    await act(async () => { container.querySelector('button:not([disabled])')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(register).toHaveBeenCalledWith('student', { category: 'COMMUNICATION', baseXp: 1 });
    const status = container.querySelector('[role="status"]');
    expect(status?.textContent).toBe('Registrando XP…');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect([...container.querySelectorAll('.xp-values button')].filter(button => button.textContent?.trim().match(/^\+[123]$/)).every(button => (button as HTMLButtonElement).disabled)).toBe(true);

    await act(async () => { resolve({ value: { event: { id: 'event', baseXp: 1, specialtyBonusXp: 0, effectiveXp: 1 }, summary }, replayed: false }); });
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[aria-label="Categorías de XP"]')).toBeTruthy();
    expect(onFeedback).toHaveBeenCalledWith('XP base +1 · XP efectivo +1');
  });
});
