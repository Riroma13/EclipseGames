import type { ApiFailure } from '../workspace/workspace-api';

export type EventStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';
export type EventTheme = 'MISSION' | 'NARRATIVE' | 'CELEBRATION';
export type ClassroomEvent = { id: string; groupId: string; title: string; description: string; status: EventStatus; showOnProjection: boolean; theme: EventTheme; createdAt: string; updatedAt: string; activatedAt: string | null; completedAt: string | null };
export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export type ClassroomChallenge = { id: string; groupId: string; title: string; description: string; target: number; progress: number; status: ChallengeStatus; showOnProjection: boolean; createdAt: string; updatedAt: string; activatedAt: string | null; completedAt: string | null };
export type MinigameKind = 'RANDOM_DRAW' | 'FRENCH_SPRINT' | 'TEAM_DRAW' | 'PROMPT_DECK';
export type MinigameStatus = 'READY' | 'RUNNING' | 'PAUSED' | 'ENDED';
export type MinigameTeamStudent = { id?: string; realName?: string; alias: string; avatar: string; specialty: string | null };
export type MinigameTeam = { team: number; students: MinigameTeamStudent[] };
export type MinigameSession = { id: string; groupId: string; kind: MinigameKind; title: string; prompt: string; durationSeconds: number; status: MinigameStatus; remainingSeconds: number; startedAt: string | null; pausedAt: string | null; selectedStudent: { id?: string; realName?: string; alias: string; specialty: string | null } | null; drawCount: number; drawTotal: number; createdAt: string; updatedAt: string; teamCount?: number; teams?: MinigameTeam[]; promptRevealed?: boolean; promptIndex?: number; promptCount?: number };
export type MinigamePreset = { id: string; title: string; prompt: string; durationSeconds: number; archivedAt: string | null; createdAt: string; updatedAt: string };
export type PromptDeck = { id: string; title: string; prompts: string[]; archivedAt: string | null; createdAt: string; updatedAt: string };
export type ProjectionStudent = { avatar: string; alias: string; specialty: string | null; xpLevel: number; progressToNextLevel: number; unlockedBadge: string | null };
export type ProjectionDisplay = { scene: 'MINIGAME' | 'CHALLENGE' | 'EVENT' | 'IDLE'; group: { id: string; name: string }; activeEvent: { title: string; description: string; theme: EventTheme; status: 'ACTIVE' } | null; activeChallenge: { title: string; description: string; target: number; progress: number; status: 'ACTIVE' | 'COMPLETED' } | null; minigame: { kind: MinigameKind; title: string; prompt: string; status: Exclude<MinigameStatus, 'ENDED'>; durationSeconds: number; remainingSeconds: number; startedAt: string | null; selectedAlias: string | null; teamCount?: number; teams?: Array<{ team: number; aliases: string[] }>; promptRevealed?: boolean } | null; students: ProjectionStudent[] };
export type ProjectionControl = { scene: ProjectionDisplay['scene']; resourceId: string | null; title: string | null; kind: MinigameKind | null; display: ProjectionDisplay };

async function request<T>(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...init, headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers } });
  if (!response.ok) {
    let body: { code?: string; message?: string } = {};
    try { body = await response.json(); } catch { /* use the status fallback */ }
    const error = new Error(body.message ?? 'The classroom game service is unavailable.') as ApiFailure;
    error.status = response.status;
    error.code = body.code;
    throw error;
  }
  return response.json() as Promise<T>;
}

const json = (body: unknown, idempotencyKey?: string): RequestInit => ({ method: 'POST', body: JSON.stringify(body), ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}) });

export const gameApi = {
  events: (groupId: string) => request<ClassroomEvent[]>(`/api/v1/groups/${groupId}/events`),
  createEvent: (groupId: string, body: { title: string; description: string; showOnProjection: boolean; theme: EventTheme }, idempotencyKey = crypto.randomUUID()) => request<ClassroomEvent>(`/api/v1/groups/${groupId}/events`, json(body, idempotencyKey)),
  updateEvent: (eventId: string, body: { title: string; description: string; showOnProjection: boolean; theme: EventTheme }) => request<ClassroomEvent>(`/api/v1/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  activateEvent: (eventId: string) => request<ClassroomEvent>(`/api/v1/events/${eventId}/activate`, json({})),
  completeEvent: (eventId: string) => request<ClassroomEvent>(`/api/v1/events/${eventId}/complete`, json({})),
  archiveEvent: (eventId: string) => request<ClassroomEvent>(`/api/v1/events/${eventId}/archive`, json({})),
  displayEvent: (eventId: string, visible: boolean) => request<ClassroomEvent>(`/api/v1/events/${eventId}/display`, json({ visible })),
  challenges: (groupId: string) => request<ClassroomChallenge[]>(`/api/v1/groups/${groupId}/challenges`),
  createChallenge: (groupId: string, body: { title: string; description: string; target: number; showOnProjection: boolean }) => request<ClassroomChallenge>(`/api/v1/groups/${groupId}/challenges`, json(body)),
  updateChallenge: (challengeId: string, body: { title: string; description: string; target: number; showOnProjection: boolean }) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  activateChallenge: (challengeId: string) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/activate`, json({})),
  pauseChallenge: (challengeId: string) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/pause`, json({})),
  resumeChallenge: (challengeId: string) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/resume`, json({})),
  adjustChallenge: (challengeId: string, delta: -1 | 1) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/progress`, json({ delta })),
  completeChallenge: (challengeId: string) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/complete`, json({})),
  archiveChallenge: (challengeId: string) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/archive`, json({})),
  displayChallenge: (challengeId: string, visible: boolean) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/display`, json({ visible })),
  currentMinigame: (groupId: string) => request<MinigameSession | null>(`/api/v1/groups/${groupId}/minigames/current`),
  launchRandomDraw: (groupId: string, title?: string) => request<MinigameSession>(`/api/v1/groups/${groupId}/minigames/random-draw`, json(title ? { title } : {})),
  launchFrenchSprint: (groupId: string, body: { title: string; prompt: string; durationSeconds: number }) => request<MinigameSession>(`/api/v1/groups/${groupId}/minigames/french-sprint`, json(body)),
  launchFrenchSprintFromPreset: (groupId: string, presetId: string) => request<MinigameSession>(`/api/v1/groups/${groupId}/minigames/french-sprint/from-preset/${presetId}`, json({})),
  launchTeamDraw: (groupId: string, body: { teamCount: number; title?: string }) => request<MinigameSession>(`/api/v1/groups/${groupId}/minigames/team-draw`, json(body)),
  launchPromptDeck: (groupId: string, deckId: string) => request<MinigameSession>(`/api/v1/groups/${groupId}/minigames/prompt-deck`, json({ deckId })),
  drawStudent: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/draw`, json({})),
  drawPrompt: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/draw`, json({})),
  randomPrompt: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/random`, json({})),
  revealPrompt: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/reveal`, json({})),
  nextPrompt: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/next`, json({})),
  shuffleTeamDraw: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/shuffle`, json({})),
  startMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/start`, json({})),
  pauseMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/pause`, json({})),
  resumeMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/resume`, json({})),
  resetMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/reset`, json({})),
  endMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/end`, json({})),
  projectionDisplay: (groupId: string) => request<ProjectionDisplay>(`/api/v1/projection/groups/${groupId}/display`),
  projectionControl: (groupId: string) => request<ProjectionControl>(`/api/v1/teacher/groups/${groupId}/display`),
  clearProjection: (groupId: string) => request<ProjectionControl>(`/api/v1/teacher/groups/${groupId}/display/clear`, json({})),
  minigamePresets: (includeArchived = false) => request<MinigamePreset[]>(`/api/v1/minigame-presets${includeArchived ? '?includeArchived=true' : ''}`),
  createMinigamePreset: (body: { title: string; prompt: string; durationSeconds: number }) => request<MinigamePreset>('/api/v1/minigame-presets', json(body)),
  updateMinigamePreset: (presetId: string, body: { title: string; prompt: string; durationSeconds: number }) => request<MinigamePreset>(`/api/v1/minigame-presets/${presetId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archiveMinigamePreset: (presetId: string) => request<MinigamePreset>(`/api/v1/minigame-presets/${presetId}/archive`, json({})),
  promptDecks: (includeArchived = false) => request<PromptDeck[]>(`/api/v1/prompt-decks${includeArchived ? '?includeArchived=true' : ''}`),
  createPromptDeck: (body: { title: string; prompts: string[] }) => request<PromptDeck>('/api/v1/prompt-decks', json(body)),
  updatePromptDeck: (deckId: string, body: { title: string; prompts: string[] }) => request<PromptDeck>(`/api/v1/prompt-decks/${deckId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archivePromptDeck: (deckId: string) => request<PromptDeck>(`/api/v1/prompt-decks/${deckId}/archive`, json({})),
};
