import type { ApiFailure } from '../workspace/workspace-api';

export type EventStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';
export type EventTheme = 'MISSION' | 'NARRATIVE' | 'CELEBRATION';
export type ClassroomEvent = { id: string; groupId: string; title: string; description: string; status: EventStatus; showOnProjection: boolean; theme: EventTheme; createdAt: string; updatedAt: string; activatedAt: string | null; completedAt: string | null };
export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';
export type ClassroomChallenge = { id: string; groupId: string; title: string; description: string; target: number; progress: number; status: ChallengeStatus; showOnProjection: boolean; createdAt: string; updatedAt: string; activatedAt: string | null; completedAt: string | null };
export type MinigameKind = 'RANDOM_DRAW' | 'FRENCH_SPRINT';
export type MinigameStatus = 'READY' | 'RUNNING' | 'PAUSED' | 'ENDED';
export type MinigameSession = { id: string; groupId: string; kind: MinigameKind; title: string; prompt: string; durationSeconds: number; status: MinigameStatus; remainingSeconds: number; startedAt: string | null; pausedAt: string | null; selectedStudent: { id?: string; realName?: string; alias: string; specialty: string | null } | null; drawCount: number; drawTotal: number; createdAt: string; updatedAt: string };
export type ProjectionStudent = { avatar: string; alias: string; specialty: string | null; xpLevel: number; progressToNextLevel: number; unlockedBadge: string | null };
export type ProjectionDisplay = { group: { id: string; name: string }; activeEvent: { title: string; description: string; theme: EventTheme; status: 'ACTIVE' } | null; activeChallenge: { title: string; description: string; target: number; progress: number; status: 'ACTIVE' | 'COMPLETED' } | null; minigame: { kind: MinigameKind; title: string; prompt: string; status: Exclude<MinigameStatus, 'ENDED'>; durationSeconds: number; remainingSeconds: number; startedAt: string | null; selectedAlias: string | null } | null; students: ProjectionStudent[] };

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

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const gameApi = {
  events: (groupId: string) => request<ClassroomEvent[]>(`/api/v1/groups/${groupId}/events`),
  createEvent: (groupId: string, body: { title: string; description: string; showOnProjection: boolean; theme: EventTheme }) => request<ClassroomEvent>(`/api/v1/groups/${groupId}/events`, json(body)),
  updateEvent: (eventId: string, body: { title: string; description: string; showOnProjection: boolean; theme: EventTheme }) => request<ClassroomEvent>(`/api/v1/events/${eventId}`, json(body)),
  activateEvent: (eventId: string) => request<ClassroomEvent>(`/api/v1/events/${eventId}/activate`, json({})),
  completeEvent: (eventId: string) => request<ClassroomEvent>(`/api/v1/events/${eventId}/complete`, json({})),
  archiveEvent: (eventId: string) => request<ClassroomEvent>(`/api/v1/events/${eventId}/archive`, json({})),
  displayEvent: (eventId: string, visible: boolean) => request<ClassroomEvent>(`/api/v1/events/${eventId}/display`, json({ visible })),
  challenges: (groupId: string) => request<ClassroomChallenge[]>(`/api/v1/groups/${groupId}/challenges`),
  createChallenge: (groupId: string, body: { title: string; description: string; target: number; showOnProjection: boolean }) => request<ClassroomChallenge>(`/api/v1/groups/${groupId}/challenges`, json(body)),
  updateChallenge: (challengeId: string, body: { title: string; description: string; target: number; showOnProjection: boolean }) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}`, json(body)),
  activateChallenge: (challengeId: string) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/activate`, json({})),
  adjustChallenge: (challengeId: string, delta: -1 | 1) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/progress`, json({ delta })),
  completeChallenge: (challengeId: string) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/complete`, json({})),
  archiveChallenge: (challengeId: string) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/archive`, json({})),
  displayChallenge: (challengeId: string, visible: boolean) => request<ClassroomChallenge>(`/api/v1/challenges/${challengeId}/display`, json({ visible })),
  currentMinigame: (groupId: string) => request<MinigameSession | null>(`/api/v1/groups/${groupId}/minigames/current`),
  launchRandomDraw: (groupId: string, title?: string) => request<MinigameSession>(`/api/v1/groups/${groupId}/minigames/random-draw`, json(title ? { title } : {})),
  launchFrenchSprint: (groupId: string, body: { title: string; prompt: string; durationSeconds: number }) => request<MinigameSession>(`/api/v1/groups/${groupId}/minigames/french-sprint`, json(body)),
  drawStudent: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/draw`, json({})),
  startMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/start`, json({})),
  pauseMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/pause`, json({})),
  resumeMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/resume`, json({})),
  resetMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/reset`, json({})),
  endMinigame: (minigameId: string) => request<MinigameSession>(`/api/v1/minigames/${minigameId}/end`, json({})),
  projectionDisplay: (groupId: string) => request<ProjectionDisplay>(`/api/v1/projection/groups/${groupId}/display`),
};
