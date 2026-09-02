import { describe, expect, it } from 'vitest';
import type { ProjectionControl } from '../game/game-api';
import { displayStatus, isCurrentDisplay } from './display-status';

const baseDisplay = {
  group: { id: 'group', name: 'Class' },
  activeEvent: null,
  activeChallenge: null,
  minigame: null,
  students: [],
};

function control(scene: ProjectionControl['scene'], display: Partial<ProjectionControl['display']> = {}): ProjectionControl {
  return { scene, resourceId: scene === 'IDLE' ? null : 'resource', title: null, kind: null, display: { ...baseDisplay, scene, ...display } } as ProjectionControl;
}

describe('teacher display status', () => {
  it('matches only the resource selected by the authoritative projection scene', () => {
    expect(isCurrentDisplay(control('MINIGAME'), 'CHALLENGE', 'resource')).toBe(false);
    expect(isCurrentDisplay(control('CHALLENGE'), 'CHALLENGE', 'resource')).toBe(true);
    expect(isCurrentDisplay(control('CHALLENGE'), 'CHALLENGE', 'another-resource')).toBe(false);
  });

  it('uses the authoritative scene precedence supplied by ProjectionControl', () => {
    const status = displayStatus(control('MINIGAME', {
      activeEvent: { title: 'Event', description: '', theme: 'MISSION', status: 'ACTIVE' },
      activeChallenge: { title: 'Challenge', description: '', target: 20, progress: 12, status: 'ACTIVE' },
      minigame: { kind: 'RANDOM_DRAW', title: 'Draw', prompt: '', status: 'READY', durationSeconds: 0, remainingSeconds: 0, startedAt: null, selectedAlias: null },
    }));
    expect(status).toEqual({ state: 'live', label: 'LIVE', title: 'Draw', detail: 'Random Draw' });
  });

  it('presents challenge progress, event title, and idle state without inventing values', () => {
    expect(displayStatus(control('CHALLENGE', { activeChallenge: { title: 'French Only', description: '', target: 20, progress: 12, status: 'ACTIVE' } }))).toMatchObject({ label: 'LIVE', title: 'French Only', detail: 'Challenge · 12 / 20 contributions' });
    expect(displayStatus(control('EVENT', { activeEvent: { title: 'The Signal', description: '', theme: 'NARRATIVE', status: 'ACTIVE' } }))).toMatchObject({ label: 'LIVE', title: 'The Signal' });
    expect(displayStatus(control('IDLE'))).toEqual({ state: 'idle', label: 'Idle', title: 'Nothing currently displayed', detail: 'Classroom Preview is idle.' });
  });
});
