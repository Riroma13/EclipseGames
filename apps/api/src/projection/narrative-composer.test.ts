import { describe, expect, it, vi } from 'vitest';
import { narrativeCatalogue } from '../narrative/catalogue.js';
import { composeNarrative, projectionScene } from './narrative-composer.js';
import type { NarrativeStateDto } from '@eclipse/contracts';

const stateFor = (state: 'BLOCKED' | 'AVAILABLE' | 'COMPLETED', revealed = 0): NarrativeStateDto => ({
  revision: 4,
  currentTerm: 'T3' as const,
  completedCount: state === 'COMPLETED' ? 3 : 2,
  archived: false,
    events: narrativeCatalogue.map(event => ({
    key: event.key,
    ordinal: event.ordinal,
    title: event.title,
    term: event.term,
    state: event.ordinal === 1 ? state : 'BLOCKED' as const,
    startedAt: null,
    mechanicKind: 'CHALLENGE' as const,
    mechanicId: 'private-mechanic-id',
    clues: event.clues.map((text, ordinal) => ({ ordinal: ordinal + 1, text, revealed: ordinal < revealed })),
    })) as NarrativeStateDto['events'],
});

describe('narrative Projection allowlist', () => {
  it.each(narrativeCatalogue)('serializes AVAILABLE event %s without lifecycle, key, or clue fields', async event => {
    const available = stateFor('AVAILABLE');
    available.events[0] = { ...available.events[0], key: event.key, ordinal: event.ordinal, title: event.title, term: event.term, state: 'AVAILABLE', clues: event.clues.map((text, ordinal) => ({ ordinal: ordinal + 1, text, revealed: ordinal < 0 })) };
    const result = await composeNarrative({ groupId: 'g', academicYearId: 'y' }, { readState: vi.fn(() => available) });
    expect(result).toEqual({ title: event.title, term: event.term, ordinal: event.ordinal, completedCount: 2, totalCount: 9 });
    expect(JSON.stringify(result)).not.toContain('private-mechanic-id');
    expect(JSON.stringify(result)).not.toContain(event.clues[0]);
  });

  it('serializes only approved revealed clues after completion', async () => {
    const completed = stateFor('COMPLETED', 1);
    const result = await composeNarrative({ groupId: 'g', academicYearId: 'y' }, { readState: () => completed });
    expect(result).toEqual({ title: narrativeCatalogue[0].title, term: 'T1', ordinal: 1, completedCount: 3, totalCount: 9, completed: true, revealedClues: [narrativeCatalogue[0].clues[0]] });
    expect(JSON.stringify(result)).not.toContain(narrativeCatalogue[0].clues[1]);
  });

  it('does not serialize blocked or future content and reads archived state without mutation', async () => {
    const archived = { ...stateFor('BLOCKED'), archived: true };
    const readState = vi.fn(() => archived);
    expect(await composeNarrative({ groupId: 'g', academicYearId: 'y' }, { readState })).toBeNull();
    expect(readState).toHaveBeenCalledOnce();
    expect(readState).not.toHaveBeenCalledWith(expect.objectContaining({ write: expect.anything() }));
  });

  it('prefers the approved display priority and never mutates the input state', () => {
    const state = { showStudent: null, minigame: null, challenge: null, event: null, narrative: { title: 'El apagón', term: 'T1' as const, ordinal: 1, completedCount: 0, totalCount: 9 as const } };
    expect(projectionScene(state)).toBe('NARRATIVE');
    expect(projectionScene({ ...state, event: {} })).toBe('EVENT');
    expect(projectionScene({ ...state, challenge: {} })).toBe('CHALLENGE');
    expect(projectionScene({ ...state, minigame: {} })).toBe('MINIGAME');
    expect(projectionScene({ ...state, showStudent: { kind: 'SHOW_STUDENT', expiresAt: '2026-01-01T00:00:00.000Z', student: { avatar: { studentId: 'a', alias: 'A-a', specialty: null, specialtyCategory: null, level: 1, progress: { isMaxLevel: false, progressPercent: 0, nextLevel: 2, xpToNextLevel: 10 }, badges: [], profile: { faceId: 'face-human', skinToneId: 'skin-medium', hairId: 'hair-short', featureId: 'feature-none', clothingId: 'clothing-eclipse', accessoryId: 'accessory-none', frameId: 'frame-none', backgroundId: 'background-eclipse' } }, energy: null, gems: { EMERALD: 0, RUBY: 0, DIAMOND: 0 } }, behaviour: null } })).toBe('SHOW_STUDENT');
    expect(state.narrative).toEqual({ title: 'El apagón', term: 'T1', ordinal: 1, completedCount: 0, totalCount: 9 });
  });
});
