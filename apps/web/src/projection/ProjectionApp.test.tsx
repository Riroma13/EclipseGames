// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectionDisplay } from '../game/game-api';
import { ProjectionContent } from './ProjectionApp';

const baseDisplay = (overrides: Partial<ProjectionDisplay> = {}): ProjectionDisplay => ({
  scene: 'IDLE', group: { id: 'group', name: 'Room' }, activeEvent: null, activeChallenge: null, narrative: null,
  minigame: null, students: [], showStudent: null, ...overrides,
});

afterEach(() => { document.body.replaceChildren(); });

describe('Projection narrative consumer', () => {
  function render(display: ProjectionDisplay) {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    act(() => { root.render(<ProjectionContent display={display} />); });
    return { container, root };
  }

  it('recognizes the NARRATIVE scene and renders the approved title, term, ordinal, and progress', () => {
    const { container, root } = render(baseDisplay({ scene: 'NARRATIVE', narrative: { title: 'El apagón', term: 'T1', ordinal: 1, completedCount: 2, totalCount: 9 } }));
    expect(container.textContent).toContain('El apagón');
    expect(container.textContent).toContain('T1');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2 / 9');
    act(() => root.unmount());
  });

  it('renders only supplied revealed clues after the completed marker', () => {
    const { container, root } = render(baseDisplay({ scene: 'NARRATIVE', narrative: { title: 'El apagón', term: 'T1', ordinal: 1, completedCount: 1, totalCount: 9, completed: true, revealedClues: ['La señal fue preparada dentro de la escuela.'] } }));
    expect(container.textContent).toContain('Completed');
    expect(container.textContent).toContain('La señal fue preparada dentro de la escuela.');
    act(() => root.unmount());
  });

  it('does not render forbidden fields or unrevealed clue content', () => {
    const { container, root } = render(baseDisplay({ scene: 'NARRATIVE', narrative: { title: 'El mensaje', term: 'T1', ordinal: 2, completedCount: 2, totalCount: 9, completed: true, revealedClues: ['Approved clue'] } }));
    expect(container.textContent).not.toContain('mechanic-id');
    expect(container.textContent).not.toContain('challenge-id');
    expect(container.textContent).not.toContain('student-private');
    expect(container.textContent).not.toContain('Unrevealed clue');
    expect(container.textContent).toContain('Approved clue');
    act(() => root.unmount());
  });

  it('keeps existing event projection rendering unchanged', () => {
    const { container, root } = render(baseDisplay({ scene: 'EVENT', activeEvent: { title: 'Mission', description: 'Ready', theme: 'MISSION', status: 'ACTIVE' } }));
    expect(container.textContent).toContain('ACTIVE EVENT · MISSION');
    expect(container.textContent).toContain('Mission');
    expect(container.textContent).toContain('Ready');
    act(() => root.unmount());
  });
});
