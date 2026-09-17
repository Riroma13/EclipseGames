// @vitest-environment happy-dom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UndoBanner } from './UndoBanner';
import { initialWorkspaceState, reducer, type UndoOpportunity, type WorkspaceState } from './workspace-state';

describe('UndoBanner success persistence', () => {
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
  });

  it('keeps the completed opportunity mounted after authoritative reversal update and prevents a duplicate trigger', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const undo = vi.fn(async () => ({ kind: 'undone' as const, message: 'XP registration undone.' }));
    const opportunity: UndoOpportunity = { actionId: 'xp', studentId: 'student', groupId: 'group', expiresAt: Date.now() + 10_000, label: 'Undo XP registration', undo };
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    function Harness() {
      const [state, setState] = useState<WorkspaceState>({ ...initialWorkspaceState, undo: opportunity });
      const [summary, setSummary] = useState('XP +1');
      return <><p>{summary}</p><UndoBanner opportunity={state.undo} onResult={message => { setSummary('XP 0'); setState(current => reducer(current, { type: 'undo-result', message })); }} /></>;
    }

    await act(async () => {
      root?.render(<Harness />);
    });
    expect(container.querySelector('.undo-banner')).not.toBeNull();
    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('XP 0');
    expect(container.textContent).toContain('XP registration undone.');
    expect(container.querySelector('.undo-banner')).not.toBeNull();
    expect(container.querySelector('button')).toBeNull();
    expect(undo).toHaveBeenCalledOnce();
  });
});
