import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameApi } from './game-api';

afterEach(() => vi.restoreAllMocks());

describe('Game Master client routes', () => {
  it('targets the Team Draw, Prompt Deck, and projection-control endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));

    await gameApi.launchTeamDraw('group', { teamCount: 2 });
    await gameApi.launchPromptDeck('group', 'deck');
    await gameApi.shuffleTeamDraw('session');
    await gameApi.randomPrompt('session');
    await gameApi.revealPrompt('session');
    await gameApi.nextPrompt('session');
    await gameApi.projectionControl('group');
    await gameApi.clearProjection('group');

    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      '/api/v1/groups/group/minigames/team-draw',
      '/api/v1/groups/group/minigames/prompt-deck',
      '/api/v1/minigames/session/shuffle',
      '/api/v1/minigames/session/random',
      '/api/v1/minigames/session/reveal',
      '/api/v1/minigames/session/next',
      '/api/v1/teacher/groups/group/display',
      '/api/v1/teacher/groups/group/display/clear',
    ]);
  });

  it('targets teacher-owned preset and deck CRUD routes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));

    await gameApi.minigamePresets();
    await gameApi.createMinigamePreset({ title: 'Sprint', prompt: 'Parle.', durationSeconds: 30 });
    await gameApi.updateMinigamePreset('preset', { title: 'Sprint 2', prompt: 'Parle encore.', durationSeconds: 60 });
    await gameApi.archiveMinigamePreset('preset');
    await gameApi.promptDecks();
    await gameApi.createPromptDeck({ title: 'Questions', prompts: ['Pourquoi ?'] });
    await gameApi.updatePromptDeck('deck', { title: 'Questions 2', prompts: ['Comment ?'] });
    await gameApi.archivePromptDeck('deck');

    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      '/api/v1/minigame-presets',
      '/api/v1/minigame-presets',
      '/api/v1/minigame-presets/preset',
      '/api/v1/minigame-presets/preset/archive',
      '/api/v1/prompt-decks',
      '/api/v1/prompt-decks',
      '/api/v1/prompt-decks/deck',
      '/api/v1/prompt-decks/deck/archive',
    ]);
  });

  it('uses PATCH for event updates', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    const body = { title: 'Updated event', description: 'Description', showOnProjection: false, theme: 'MISSION' as const };

    await gameApi.updateEvent('event', body);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/events/event', expect.objectContaining({ method: 'PATCH', body: JSON.stringify(body) }));
  });

  it('uses PATCH for challenge updates', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    const body = { title: 'Updated challenge', description: 'Description', target: 20, showOnProjection: true };

    await gameApi.updateChallenge('challenge', body);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/challenges/challenge', expect.objectContaining({ method: 'PATCH', body: JSON.stringify(body) }));
  });

  it('sends the event creation idempotency key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } }));
    const body = { title: 'Replayable event', description: '', showOnProjection: false, theme: 'MISSION' as const };
    const requestKey = '00000000-0000-4000-8000-000000000601';

    await gameApi.createEvent('group', body, requestKey);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/groups/group/events', expect.objectContaining({ method: 'POST', body: JSON.stringify(body), headers: expect.objectContaining({ 'Idempotency-Key': requestKey }) }));
  });
});
