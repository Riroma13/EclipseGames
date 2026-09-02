import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import * as xp from '../xp/service.js';
import * as repository from './repository.js';

const now = () => new Date().toISOString();
const notFound = (message: string): never => { throw new ApiError('NOT_FOUND', 404, message); };
const validation = (message: string): never => { throw new ApiError('VALIDATION_FAILED', 422, message); };
const writable = (group: repository.GroupContext) => { if (group.yearArchivedAt) validation('Archived academic years are read-only.'); return group; };
const idempotencyKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function optionalIdempotencyKey(key: string | undefined) {
  if (key === undefined) return undefined;
  if (!idempotencyKeyPattern.test(key)) validation('A UUID v4 Idempotency-Key header is required.');
  return key;
}

export type EventInput = { title: string; description: string; showOnProjection: boolean; theme: 'MISSION' | 'NARRATIVE' | 'CELEBRATION' };
export type ChallengeInput = { title: string; description: string; target: number; showOnProjection: boolean };
export type TeamDrawInput = { teamCount: number; title?: string };
export type PromptDeckInput = { title: string; prompts: string[] };

export function eventDto(value: repository.EventRecord) {
  return { id: value.id, groupId: value.groupId, title: value.title, description: value.description, status: value.status, showOnProjection: value.showOnProjection === 1, theme: value.theme, createdAt: value.createdAt, updatedAt: value.updatedAt, activatedAt: value.activatedAt, completedAt: value.completedAt };
}

export function challengeDto(value: repository.ChallengeRecord) {
  return { id: value.id, groupId: value.groupId, title: value.title, description: value.description, target: value.target, progress: value.progress, status: value.status, showOnProjection: value.showOnProjection === 1, createdAt: value.createdAt, updatedAt: value.updatedAt, activatedAt: value.activatedAt, completedAt: value.completedAt };
}

function ownedEvent(db: Database.Database, teacherId: string, eventId: string) {
  const event = repository.findEvent(db, teacherId, eventId) ?? notFound('Event not found.');
  const group = repository.groupContext(db, teacherId, event.groupId) ?? notFound('Group not found.');
  return { event, group };
}

function ownedChallenge(db: Database.Database, teacherId: string, challengeId: string) {
  const challenge = repository.findChallenge(db, teacherId, challengeId) ?? notFound('Challenge not found.');
  const group = repository.groupContext(db, teacherId, challenge.groupId) ?? notFound('Group not found.');
  return { challenge, group };
}

function cleanTitle(value: string) { const title = value.trim(); if (!title) validation('A title is required.'); return title; }
function cleanDescription(value: string) { return value.trim(); }

export function listEvents(db: Database.Database, teacherId: string, groupId: string) {
  repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.');
  return repository.listEvents(db, teacherId, groupId).map(eventDto);
}

export function createEvent(db: Database.Database, teacherId: string, groupId: string, input: EventInput, key?: string) {
  const group = writable(repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.'));
  const requestId = optionalIdempotencyKey(key);
  const title = cleanTitle(input.title);
  const description = cleanDescription(input.description);
  const requestFingerprint = repository.fingerprint({ operation: 'create-event', groupId: group.id, title, description, showOnProjection: input.showOnProjection, theme: input.theme });
  if (requestId) {
    const existing = repository.findEventByRequest(db, teacherId, requestId);
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) throw new ApiError('CONFLICT', 409, 'Idempotency-Key was already used for a different request.');
      return { event: eventDto(existing), replay: true };
    }
  }
  const createdAt = now();
  const value: repository.EventRecord = { id: randomUUID(), ownerTeacherId: teacherId, groupId: group.id, title, description, status: 'DRAFT', showOnProjection: input.showOnProjection ? 1 : 0, theme: input.theme, createdAt, updatedAt: createdAt, activatedAt: null, completedAt: null, archivedAt: null, clientRequestId: requestId ?? null, requestFingerprint: requestId ? requestFingerprint : null };
  try {
    return { event: eventDto(db.transaction(() => repository.insertEvent(db, value))()), replay: false };
  } catch (error) {
    if (!requestId || !(error instanceof Error) || !/UNIQUE|constraint/i.test(error.message)) throw error;
    const existing = repository.findEventByRequest(db, teacherId, requestId);
    if (!existing) throw error;
    if (existing.requestFingerprint !== requestFingerprint) throw new ApiError('CONFLICT', 409, 'Idempotency-Key was already used for a different request.');
    return { event: eventDto(existing), replay: true };
  }
}

export function updateEvent(db: Database.Database, teacherId: string, eventId: string, input: EventInput) {
  const { event, group } = ownedEvent(db, teacherId, eventId);
  writable(group);
  if (event.archivedAt) validation('Archived events are read-only.');
  repository.updateEvent(db, event.id, { title: cleanTitle(input.title), description: cleanDescription(input.description), showOnProjection: input.showOnProjection ? 1 : 0, theme: input.theme, updatedAt: now() });
  return eventDto(repository.findEvent(db, teacherId, event.id)!);
}

export function activateEvent(db: Database.Database, teacherId: string, eventId: string) {
  const { event, group } = ownedEvent(db, teacherId, eventId);
  writable(group);
  if (event.archivedAt) validation('Archived events are read-only.');
  if (event.status === 'COMPLETED') validation('Completed events cannot be activated.');
  if (event.status !== 'ACTIVE') repository.updateEvent(db, event.id, { status: 'ACTIVE', activatedAt: now(), updatedAt: now() });
  return eventDto(repository.findEvent(db, teacherId, event.id)!);
}

export function completeEvent(db: Database.Database, teacherId: string, eventId: string) {
  const { event, group } = ownedEvent(db, teacherId, eventId);
  writable(group);
  if (event.archivedAt) validation('Archived events are read-only.');
  if (event.status !== 'ACTIVE') validation('Only active events can be completed.');
  repository.updateEvent(db, event.id, { status: 'COMPLETED', completedAt: now(), showOnProjection: 0, updatedAt: now() });
  return eventDto(repository.findEvent(db, teacherId, event.id)!);
}

export function archiveEvent(db: Database.Database, teacherId: string, eventId: string) {
  const { event, group } = ownedEvent(db, teacherId, eventId);
  writable(group);
  if (event.archivedAt) validation('Event is already archived.');
  repository.updateEvent(db, event.id, { archivedAt: now(), showOnProjection: 0, updatedAt: now() });
  return eventDto(repository.findEvent(db, teacherId, event.id)!);
}

export function displayEvent(db: Database.Database, teacherId: string, eventId: string, visible: boolean) {
  const { event, group } = ownedEvent(db, teacherId, eventId);
  writable(group);
  if (event.archivedAt) validation('Archived events are read-only.');
  if (event.status !== 'ACTIVE' && visible) validation('Only active events can appear on the classroom display.');
  repository.updateEvent(db, event.id, { showOnProjection: visible ? 1 : 0, updatedAt: now() });
  return eventDto(repository.findEvent(db, teacherId, event.id)!);
}

export function listChallenges(db: Database.Database, teacherId: string, groupId: string) {
  repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.');
  return repository.listChallenges(db, teacherId, groupId).map(challengeDto);
}

export function createChallenge(db: Database.Database, teacherId: string, groupId: string, input: ChallengeInput) {
  const group = writable(repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.'));
  if (!Number.isInteger(input.target) || input.target < 1 || input.target > 10_000) validation('Challenge target must be between 1 and 10,000.');
  const createdAt = now();
  return challengeDto(repository.insertChallenge(db, { id: randomUUID(), ownerTeacherId: teacherId, groupId: group.id, title: cleanTitle(input.title), description: cleanDescription(input.description), target: input.target, progress: 0, status: 'DRAFT', showOnProjection: input.showOnProjection ? 1 : 0, createdAt, updatedAt: createdAt, activatedAt: null, completedAt: null, archivedAt: null }));
}

export function updateChallenge(db: Database.Database, teacherId: string, challengeId: string, input: ChallengeInput) {
  const { challenge, group } = ownedChallenge(db, teacherId, challengeId);
  writable(group);
  if (challenge.archivedAt) validation('Archived challenges are read-only.');
  if (!Number.isInteger(input.target) || input.target < 1 || input.target > 10_000 || input.target < challenge.progress) validation('Challenge target cannot be below current progress.');
  let status = challenge.status;
  let completedAt = challenge.completedAt;
  if ((challenge.status === 'ACTIVE' || challenge.status === 'PAUSED') && input.target <= challenge.progress) {
    status = 'COMPLETED';
    completedAt = completedAt ?? now();
  } else if (challenge.status === 'COMPLETED' && input.target > challenge.progress) {
    status = 'ACTIVE';
    completedAt = null;
  }
  repository.updateChallenge(db, challenge.id, { title: cleanTitle(input.title), description: cleanDescription(input.description), target: input.target, showOnProjection: input.showOnProjection ? 1 : 0, status, completedAt, updatedAt: now() });
  return challengeDto(repository.findChallenge(db, teacherId, challenge.id)!);
}

export function activateChallenge(db: Database.Database, teacherId: string, challengeId: string) {
  const { challenge, group } = ownedChallenge(db, teacherId, challengeId);
  writable(group);
  if (challenge.archivedAt) validation('Archived challenges are read-only.');
  if (challenge.status === 'COMPLETED') validation('Completed challenges cannot be activated.');
  if (challenge.status === 'PAUSED') validation('Paused challenges must be resumed.');
  if (challenge.status !== 'ACTIVE') repository.updateChallenge(db, challenge.id, { status: 'ACTIVE', activatedAt: now(), updatedAt: now() });
  return challengeDto(repository.findChallenge(db, teacherId, challenge.id)!);
}

export function pauseChallenge(db: Database.Database, teacherId: string, challengeId: string) {
  const { challenge, group } = ownedChallenge(db, teacherId, challengeId);
  writable(group);
  if (challenge.archivedAt) validation('Archived challenges are read-only.');
  if (challenge.status !== 'ACTIVE') validation('Only active challenges can be paused.');
  repository.updateChallenge(db, challenge.id, { status: 'PAUSED', updatedAt: now() });
  return challengeDto(repository.findChallenge(db, teacherId, challenge.id)!);
}

export function resumeChallenge(db: Database.Database, teacherId: string, challengeId: string) {
  const { challenge, group } = ownedChallenge(db, teacherId, challengeId);
  writable(group);
  if (challenge.archivedAt) validation('Archived challenges are read-only.');
  if (challenge.status !== 'PAUSED') validation('Only paused challenges can be resumed.');
  repository.updateChallenge(db, challenge.id, { status: 'ACTIVE', updatedAt: now() });
  return challengeDto(repository.findChallenge(db, teacherId, challenge.id)!);
}

export function adjustChallenge(db: Database.Database, teacherId: string, challengeId: string, delta: -1 | 1) {
  const { challenge, group } = ownedChallenge(db, teacherId, challengeId);
  writable(group);
  if (challenge.archivedAt) validation('Archived challenges are read-only.');
  if (challenge.status !== 'ACTIVE' && challenge.status !== 'COMPLETED') validation('Only active challenges can change progress.');
  const completedAt = now();
  repository.adjustChallengeAtomically(db, challenge.id, delta, completedAt, completedAt);
  const updated = repository.findChallenge(db, teacherId, challenge.id)!;
  if (updated.status !== 'ACTIVE' && updated.status !== 'COMPLETED') validation('Only active challenges can change progress.');
  return challengeDto(updated);
}

export function completeChallenge(db: Database.Database, teacherId: string, challengeId: string) {
  const { challenge, group } = ownedChallenge(db, teacherId, challengeId);
  writable(group);
  if (challenge.archivedAt) validation('Archived challenges are read-only.');
  if (challenge.status !== 'ACTIVE') validation('Only active challenges can be completed.');
  repository.updateChallenge(db, challenge.id, { status: 'COMPLETED', completedAt: now(), showOnProjection: 0, updatedAt: now() });
  return challengeDto(repository.findChallenge(db, teacherId, challenge.id)!);
}

export function archiveChallenge(db: Database.Database, teacherId: string, challengeId: string) {
  const { challenge, group } = ownedChallenge(db, teacherId, challengeId);
  writable(group);
  if (challenge.archivedAt) validation('Challenge is already archived.');
  repository.updateChallenge(db, challenge.id, { archivedAt: now(), showOnProjection: 0, updatedAt: now() });
  return challengeDto(repository.findChallenge(db, teacherId, challenge.id)!);
}

export function displayChallenge(db: Database.Database, teacherId: string, challengeId: string, visible: boolean) {
  const { challenge, group } = ownedChallenge(db, teacherId, challengeId);
  writable(group);
  if (challenge.archivedAt) validation('Archived challenges are read-only.');
  if ((challenge.status !== 'ACTIVE' && challenge.status !== 'COMPLETED') && visible) validation('Only active challenges can appear on the classroom display.');
  repository.updateChallenge(db, challenge.id, { showOnProjection: visible ? 1 : 0, updatedAt: now() });
  return challengeDto(repository.findChallenge(db, teacherId, challenge.id)!);
}

function activeStudentIds(db: Database.Database, groupId: string) { return repository.listStudents(db, groupId).map(student => student.id); }
function shuffle(values: string[]) { for (let index = values.length - 1; index > 0; index -= 1) { const target = Math.floor(Math.random() * (index + 1)); [values[index], values[target]] = [values[target], values[index]]; } return values; }
function drawOrder(value: string) { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; } catch { return []; } }
function teamAssignments(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isInteger(entry[1]) && entry[1] > 0));
  } catch { return {}; }
}
function promptSnapshot(value: string) { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; } catch { return []; } }

function closeActiveMinigame(db: Database.Database, teacherId: string, groupId: string) {
  const active = repository.findActiveMinigame(db, teacherId, groupId);
  if (active) {
    const current = elapsedRemaining(active);
    repository.updateMinigame(db, active.id, { status: 'ENDED', remainingSeconds: current.remainingSeconds, startedAt: null, pausedAt: null, updatedAt: now() });
  }
}

function elapsedRemaining(value: repository.MinigameRecord) {
  if (value.status !== 'RUNNING' || !value.startedAt) return value;
  const startedAt = Date.parse(value.startedAt);
  if (!Number.isFinite(startedAt)) return value;
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return { ...value, remainingSeconds: Math.max(0, value.remainingSeconds - elapsed) };
}

function activeMinigame(db: Database.Database, teacherId: string, minigameId: string) {
  const value = repository.findMinigame(db, teacherId, minigameId) ?? notFound('Minigame session not found.');
  const current = elapsedRemaining(value);
  if (current.status === 'RUNNING' && current.remainingSeconds === 0) {
    repository.updateMinigame(db, current.id, { status: 'ENDED', remainingSeconds: 0, startedAt: null, pausedAt: null, updatedAt: now() });
    return repository.findMinigame(db, teacherId, current.id)!;
  }
  return current;
}

function ensureMutableMinigame(value: repository.MinigameRecord) {
  if (value.status === 'ENDED') validation('Ended minigame sessions are terminal.');
}

function currentOpenMinigame(db: Database.Database, teacherId: string, groupId: string) {
  const active = repository.findActiveMinigame(db, teacherId, groupId);
  if (!active) return null;
  const current = activeMinigame(db, teacherId, active.id);
  return current.status === 'ENDED' ? null : current;
}

function minigameDto(db: Database.Database, value: repository.MinigameRecord, includePrivateName: boolean) {
  const selected = value.selectedStudentId ? repository.findStudent(db, value.groupId, value.selectedStudentId) : undefined;
  const order = drawOrder(value.drawOrder);
  const assignments = teamAssignments(value.teamAssignments);
  const prompts = promptSnapshot(value.promptDeckPrompts);
  const teams = value.kind === 'TEAM_DRAW' ? Array.from({ length: value.teamCount }, (_, index) => ({
    team: index + 1,
    students: Object.entries(assignments).filter(([, team]) => team === index + 1).map(([studentId]) => {
      if (includePrivateName) {
        const student = repository.findStudent(db, value.groupId, studentId);
        return student ? { id: student.id, realName: student.realName, alias: student.alias, avatar: student.avatar, specialty: student.specialty } : null;
      }
      const student = repository.findSafeStudent(db, value.groupId, studentId);
      return student ? { alias: student.alias, avatar: student.avatar, specialty: student.specialty } : null;
    }).filter((student): student is NonNullable<typeof student> => student !== null),
  })) : undefined;
  return {
    id: value.id,
    groupId: value.groupId,
    kind: value.kind,
    title: value.title,
    prompt: value.prompt,
    durationSeconds: value.durationSeconds,
    status: value.status,
    remainingSeconds: value.remainingSeconds,
    startedAt: value.startedAt,
    pausedAt: value.pausedAt,
    selectedStudent: selected ? { ...(includePrivateName ? { id: selected.id, realName: selected.realName } : {}), alias: selected.alias, specialty: selected.specialty } : null,
    drawCount: Math.min(value.drawIndex, order.length),
    drawTotal: order.length,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(value.kind === 'TEAM_DRAW' ? { teamCount: value.teamCount, teams } : {}),
     ...(value.kind === 'PROMPT_DECK' ? { promptRevealed: value.promptRevealed === 1, promptIndex: value.drawIndex, promptCount: prompts.length } : {}),
  };
}

export function currentMinigame(db: Database.Database, teacherId: string, groupId: string) {
  repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.');
  const current = currentOpenMinigame(db, teacherId, groupId);
  return current ? minigameDto(db, current, true) : null;
}

function contentTitle(value: string) {
  const title = value.trim();
  if (!title || title.length > 120) validation('A title between 1 and 120 characters is required.');
  return title;
}

function contentPrompt(value: string) {
  const prompt = value.trim();
  if (!prompt || prompt.length > 500) validation('A prompt between 1 and 500 characters is required.');
  return prompt;
}

function cleanPromptList(values: string[]) {
  if (values.length < 1 || values.length > 50) validation('Prompt decks must contain between 1 and 50 prompts.');
  return values.map(contentPrompt);
}

function minigamePresetDto(value: repository.MinigamePresetRecord) {
  return { id: value.id, title: value.title, prompt: value.prompt, durationSeconds: value.durationSeconds, archivedAt: value.archivedAt, createdAt: value.createdAt, updatedAt: value.updatedAt };
}

function promptDeckDto(value: repository.PromptDeckRecord) {
  const prompts = promptSnapshot(value.prompts);
  if (!prompts.length) throw new ApiError('INTERNAL_ERROR', 500, 'Prompt deck data is invalid.');
  return { id: value.id, title: value.title, prompts, archivedAt: value.archivedAt, createdAt: value.createdAt, updatedAt: value.updatedAt };
}

export function listMinigamePresets(db: Database.Database, teacherId: string, includeArchived = false) {
  return repository.listMinigamePresets(db, teacherId, includeArchived).map(minigamePresetDto);
}

export function createMinigamePreset(db: Database.Database, teacherId: string, input: { title: string; prompt: string; durationSeconds: number }) {
  const title = contentTitle(input.title);
  const prompt = contentPrompt(input.prompt);
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 10 || input.durationSeconds > 600) validation('Sprint duration must be between 10 and 600 seconds.');
  const createdAt = now();
  return minigamePresetDto(repository.insertMinigamePreset(db, { id: randomUUID(), ownerTeacherId: teacherId, title, prompt, durationSeconds: input.durationSeconds, archivedAt: null, createdAt, updatedAt: createdAt }));
}

export function updateMinigamePreset(db: Database.Database, teacherId: string, presetId: string, input: { title: string; prompt: string; durationSeconds: number }) {
  const current = repository.findMinigamePreset(db, teacherId, presetId) ?? notFound('Minigame preset not found.');
  if (current.archivedAt) validation('Archived minigame presets are read-only.');
  const title = contentTitle(input.title);
  const prompt = contentPrompt(input.prompt);
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 10 || input.durationSeconds > 600) validation('Sprint duration must be between 10 and 600 seconds.');
  repository.updateMinigamePreset(db, presetId, { title, prompt, durationSeconds: input.durationSeconds, archivedAt: null, updatedAt: now() });
  return minigamePresetDto(repository.findMinigamePreset(db, teacherId, presetId)!);
}

export function archiveMinigamePreset(db: Database.Database, teacherId: string, presetId: string) {
  const current = repository.findMinigamePreset(db, teacherId, presetId) ?? notFound('Minigame preset not found.');
  if (current.archivedAt) validation('Minigame preset is already archived.');
  repository.updateMinigamePreset(db, presetId, { title: current.title, prompt: current.prompt, durationSeconds: current.durationSeconds, archivedAt: now(), updatedAt: now() });
  return minigamePresetDto(repository.findMinigamePreset(db, teacherId, presetId)!);
}

export function listPromptDecks(db: Database.Database, teacherId: string, includeArchived = false) {
  return repository.listPromptDecks(db, teacherId, includeArchived).map(promptDeckDto);
}

export function createPromptDeck(db: Database.Database, teacherId: string, input: PromptDeckInput) {
  const title = contentTitle(input.title);
  const prompts = cleanPromptList(input.prompts);
  const createdAt = now();
  return promptDeckDto(repository.insertPromptDeck(db, { id: randomUUID(), ownerTeacherId: teacherId, title, prompts: JSON.stringify(prompts), archivedAt: null, createdAt, updatedAt: createdAt }));
}

export function updatePromptDeck(db: Database.Database, teacherId: string, deckId: string, input: PromptDeckInput) {
  const current = repository.findPromptDeck(db, teacherId, deckId) ?? notFound('Prompt deck not found.');
  if (current.archivedAt) validation('Archived prompt decks are read-only.');
  const title = contentTitle(input.title);
  const prompts = cleanPromptList(input.prompts);
  repository.updatePromptDeck(db, deckId, { title, prompts: JSON.stringify(prompts), archivedAt: null, updatedAt: now() });
  return promptDeckDto(repository.findPromptDeck(db, teacherId, deckId)!);
}

export function archivePromptDeck(db: Database.Database, teacherId: string, deckId: string) {
  const current = repository.findPromptDeck(db, teacherId, deckId) ?? notFound('Prompt deck not found.');
  if (current.archivedAt) validation('Prompt deck is already archived.');
  repository.updatePromptDeck(db, deckId, { title: current.title, prompts: current.prompts, archivedAt: now(), updatedAt: now() });
  return promptDeckDto(repository.findPromptDeck(db, teacherId, deckId)!);
}

export function launchRandomDraw(db: Database.Database, teacherId: string, groupId: string, title: string | undefined) {
  const group = writable(repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.'));
  const students = activeStudentIds(db, group.id);
  if (!students.length) validation('Add at least one student before launching a draw.');
  return db.transaction(() => {
    closeActiveMinigame(db, teacherId, group.id);
    const createdAt = now();
     const value = repository.insertMinigame(db, { id: randomUUID(), ownerTeacherId: teacherId, groupId: group.id, kind: 'RANDOM_DRAW', title: cleanTitle(title || 'Random Student Draw'), prompt: 'Choose the next voice in the room.', durationSeconds: 0, status: 'READY', remainingSeconds: 0, startedAt: null, pausedAt: null, selectedStudentId: null, drawOrder: JSON.stringify(shuffle(students)), drawIndex: 0, createdAt, updatedAt: createdAt, teamCount: 0, teamAssignments: '{}', promptDeckPrompts: '[]', promptRevealed: 1 });
    return minigameDto(db, value, true);
  })();
}

export function launchFrenchSprint(db: Database.Database, teacherId: string, groupId: string, input: { title: string; prompt: string; durationSeconds: number }) {
  const group = writable(repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.'));
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 10 || input.durationSeconds > 600) validation('Sprint duration must be between 10 and 600 seconds.');
  const prompt = input.prompt.trim();
  if (!prompt) validation('A sprint prompt is required.');
  return db.transaction(() => {
    closeActiveMinigame(db, teacherId, group.id);
    const createdAt = now();
     const value = repository.insertMinigame(db, { id: randomUUID(), ownerTeacherId: teacherId, groupId: group.id, kind: 'FRENCH_SPRINT', title: cleanTitle(input.title || 'French Sprint'), prompt, durationSeconds: input.durationSeconds, status: 'READY', remainingSeconds: input.durationSeconds, startedAt: null, pausedAt: null, selectedStudentId: null, drawOrder: '[]', drawIndex: 0, createdAt, updatedAt: createdAt, teamCount: 0, teamAssignments: '{}', promptDeckPrompts: '[]', promptRevealed: 1 });
    return minigameDto(db, value, true);
  })();
}

export function launchFrenchSprintFromPreset(db: Database.Database, teacherId: string, groupId: string, presetId: string) {
  const preset = repository.findMinigamePreset(db, teacherId, presetId) ?? notFound('Minigame preset not found.');
  if (preset.archivedAt) validation('Archived minigame presets are read-only.');
  return launchFrenchSprint(db, teacherId, groupId, { title: preset.title, prompt: preset.prompt, durationSeconds: preset.durationSeconds });
}

function teamAssignmentSnapshot(studentIds: string[], teamCount: number) {
  const assignments: Record<string, number> = {};
  shuffle([...studentIds]).forEach((studentId, index) => { assignments[studentId] = (index % teamCount) + 1; });
  return JSON.stringify(assignments);
}

export function launchTeamDraw(db: Database.Database, teacherId: string, groupId: string, input: TeamDrawInput) {
  const group = writable(repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.'));
  const students = activeStudentIds(db, group.id);
  if (!Number.isInteger(input.teamCount) || input.teamCount < 2 || input.teamCount > 10 || input.teamCount > students.length) validation('Team count must be between 2 and 10 and cannot exceed the active student count.');
  return db.transaction(() => {
    closeActiveMinigame(db, teacherId, group.id);
    const createdAt = now();
     const value = repository.insertMinigame(db, { id: randomUUID(), ownerTeacherId: teacherId, groupId: group.id, kind: 'TEAM_DRAW', title: cleanTitle(input.title || 'Team Draw'), prompt: 'Everyone has a place in the next classroom team.', durationSeconds: 0, status: 'READY', remainingSeconds: 0, startedAt: null, pausedAt: null, selectedStudentId: null, drawOrder: '[]', drawIndex: 0, createdAt, updatedAt: createdAt, teamCount: input.teamCount, teamAssignments: teamAssignmentSnapshot(students, input.teamCount), promptDeckPrompts: '[]', promptRevealed: 1 });
    return minigameDto(db, value, true);
  })();
}

export function shuffleTeamDraw(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  const group = writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  if (current.kind !== 'TEAM_DRAW') validation('Shuffle is only available for Team Draw.');
  const students = activeStudentIds(db, group.id);
  if (current.teamCount < 2 || current.teamCount > students.length) validation('Team configuration is no longer valid for the active roster.');
  repository.updateMinigame(db, current.id, { teamAssignments: teamAssignmentSnapshot(students, current.teamCount), updatedAt: now() });
  return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
}

export function launchPromptDeck(db: Database.Database, teacherId: string, groupId: string, deckId: string) {
  const deck = repository.findPromptDeck(db, teacherId, deckId) ?? notFound('Prompt deck not found.');
  if (deck.archivedAt) validation('Archived prompt decks are read-only.');
  const prompts = promptSnapshot(deck.prompts);
  if (!prompts.length) throw new ApiError('INTERNAL_ERROR', 500, 'Prompt deck data is invalid.');
  const group = writable(repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.'));
  return db.transaction(() => {
    closeActiveMinigame(db, teacherId, group.id);
    const createdAt = now();
     const value = repository.insertMinigame(db, { id: randomUUID(), ownerTeacherId: teacherId, groupId: group.id, kind: 'PROMPT_DECK', title: deck.title, prompt: prompts[0], durationSeconds: 0, status: 'READY', remainingSeconds: 0, startedAt: null, pausedAt: null, selectedStudentId: null, drawOrder: '[]', drawIndex: 0, createdAt, updatedAt: createdAt, teamCount: 0, teamAssignments: '{}', promptDeckPrompts: JSON.stringify(prompts), promptRevealed: 0 });
    return minigameDto(db, value, true);
  })();
}

export function drawStudent(db: Database.Database, teacherId: string, minigameId: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = activeMinigame(db, teacherId, minigameId);
    const group = writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
    ensureMutableMinigame(current);
    if (current.kind === 'PROMPT_DECK') {
      if (!promptSnapshot(current.promptDeckPrompts).length) throw new ApiError('INTERNAL_ERROR', 500, 'Prompt deck snapshot is invalid.');
      return minigameDto(db, current, true);
    }
    if (current.kind !== 'RANDOM_DRAW') validation('Student draw is only available for Random Student Draw.');
    const students = activeStudentIds(db, group.id);
    if (!students.length) validation('Add at least one student before drawing.');
    let order = drawOrder(current.drawOrder).filter(studentId => students.includes(studentId));
    let index = current.drawIndex;
    if (!order.length || index >= order.length) { order = shuffle([...students]); index = 0; }
    const selectedStudentId = order[index];
    const advanced = repository.advanceDrawAtomically(db, current.id, current.drawIndex, selectedStudentId, JSON.stringify(order), index + 1, now());
    if (advanced) return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
  }
  throw new ApiError('CONFLICT', 409, 'The student draw changed while it was being updated. Draw again.');
}

export function drawPrompt(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  if (current.kind !== 'PROMPT_DECK') validation('Prompt draw is only available for Prompt Deck sessions.');
  if (!promptSnapshot(current.promptDeckPrompts).length) throw new ApiError('INTERNAL_ERROR', 500, 'Prompt deck snapshot is invalid.');
  return minigameDto(db, current, true);
}

export function randomPrompt(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  if (current.kind !== 'PROMPT_DECK') validation('Random prompt is only available for Prompt Deck sessions.');
  const prompts = promptSnapshot(current.promptDeckPrompts);
  if (!prompts.length) throw new ApiError('INTERNAL_ERROR', 500, 'Prompt deck snapshot is invalid.');
  const index = Math.floor(Math.random() * prompts.length);
   if (!repository.advancePromptAtomically(db, current.id, current.drawIndex, prompts[index], index, now(), 0)) throw new ApiError('CONFLICT', 409, 'Prompt selection changed while it was being updated. Try again.');
  return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
}

export function revealPrompt(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  if (current.kind !== 'PROMPT_DECK') validation('Prompt reveal is only available for Prompt Deck sessions.');
  if (!promptSnapshot(current.promptDeckPrompts).length) throw new ApiError('INTERNAL_ERROR', 500, 'Prompt deck snapshot is invalid.');
  repository.updateMinigame(db, current.id, { promptRevealed: 1, updatedAt: now() });
  return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
}

export function nextPrompt(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  if (current.kind !== 'PROMPT_DECK') validation('Next prompt is only available for Prompt Deck sessions.');
  const prompts = promptSnapshot(current.promptDeckPrompts);
  if (!prompts.length) throw new ApiError('INTERNAL_ERROR', 500, 'Prompt deck snapshot is invalid.');
  const nextIndex = current.drawIndex + 1;
  if (nextIndex >= prompts.length) validation('All prompts in this deck have been shown.');
   if (!repository.advancePromptAtomically(db, current.id, current.drawIndex, prompts[nextIndex], nextIndex, now(), 0)) throw new ApiError('CONFLICT', 409, 'Prompt selection changed while it was being updated. Try again.');
  return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
}

export function startMinigame(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  if (current.kind !== 'FRENCH_SPRINT') validation('Only French Sprint sessions use a timer.');
  if (current.status === 'READY' || current.status === 'PAUSED') repository.updateMinigame(db, current.id, { status: 'RUNNING', startedAt: now(), pausedAt: null, updatedAt: now() });
  return minigameDto(db, activeMinigame(db, teacherId, current.id), true);
}

export function pauseMinigame(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  if (current.kind !== 'FRENCH_SPRINT') validation('Only French Sprint sessions use a timer.');
  if (current.status === 'RUNNING') repository.updateMinigame(db, current.id, { status: 'PAUSED', remainingSeconds: current.remainingSeconds, startedAt: null, pausedAt: now(), updatedAt: now() });
  return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
}

export function resumeMinigame(db: Database.Database, teacherId: string, minigameId: string) { return startMinigame(db, teacherId, minigameId); }

export function resetMinigame(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  const students = current.kind === 'RANDOM_DRAW' ? activeStudentIds(db, current.groupId) : [];
  const teamStudents = current.kind === 'TEAM_DRAW' ? activeStudentIds(db, current.groupId) : [];
  const prompts = current.kind === 'PROMPT_DECK' ? promptSnapshot(current.promptDeckPrompts) : [];
  if (current.kind === 'TEAM_DRAW' && (current.teamCount < 2 || current.teamCount > 10 || current.teamCount > teamStudents.length)) validation('Team configuration is no longer valid for the active roster.');
  if (current.kind === 'PROMPT_DECK' && !prompts.length) throw new ApiError('INTERNAL_ERROR', 500, 'Prompt deck snapshot is invalid.');
   repository.updateMinigame(db, current.id, { prompt: current.kind === 'PROMPT_DECK' ? prompts[0] ?? '' : current.prompt, status: 'READY', remainingSeconds: current.durationSeconds, startedAt: null, pausedAt: null, selectedStudentId: null, drawOrder: current.kind === 'RANDOM_DRAW' ? JSON.stringify(shuffle(students)) : '[]', drawIndex: 0, teamAssignments: current.kind === 'TEAM_DRAW' ? teamAssignmentSnapshot(teamStudents, current.teamCount) : current.teamAssignments, promptRevealed: current.kind === 'PROMPT_DECK' ? 0 : current.promptRevealed, updatedAt: now() });
  return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
}

export function endMinigame(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  repository.updateMinigame(db, current.id, { status: 'ENDED', remainingSeconds: current.remainingSeconds, startedAt: null, pausedAt: null, updatedAt: now() });
  return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
}

function projectionState(db: Database.Database, teacherId: string, groupId: string) {
  const group = repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.');
  return { teacherId, group, event: repository.projectionEvent(db, teacherId, group.id), challenge: repository.projectionChallenge(db, teacherId, group.id), minigame: currentOpenMinigame(db, teacherId, group.id) };
}

function safeTeamAssignments(db: Database.Database, value: repository.MinigameRecord) {
  const assignments = teamAssignments(value.teamAssignments);
  return Array.from({ length: value.teamCount }, (_, index) => ({
    team: index + 1,
    aliases: Object.entries(assignments).filter(([, team]) => team === index + 1).map(([studentId]) => repository.findSafeStudent(db, value.groupId, studentId)?.alias).filter((alias): alias is string => Boolean(alias)),
  }));
}

function projectionPayload(db: Database.Database, state: ReturnType<typeof projectionState>) {
  const safeStudents = repository.listSafeStudents(db, state.group.id);
  const summaries = xp.groupSummaries(db, state.teacherId, state.group.id, state.group.academicYearId).summaries;
  const summaryByStudent = new Map(summaries.map(item => [item.studentId, item.summary]));
  const promptRevealed = state.minigame?.kind !== 'PROMPT_DECK' || state.minigame.promptRevealed === 1;
  const scene = state.minigame ? 'MINIGAME' as const : state.challenge ? 'CHALLENGE' as const : state.event ? 'EVENT' as const : 'IDLE' as const;
  return {
    scene,
    group: { id: state.group.id, name: state.group.name },
    activeEvent: state.event ? { title: state.event.title, description: state.event.description, theme: state.event.theme, status: state.event.status } : null,
    activeChallenge: state.challenge ? { title: state.challenge.title, description: state.challenge.description, target: state.challenge.target, progress: state.challenge.progress, status: state.challenge.status } : null,
     minigame: state.minigame ? { kind: state.minigame.kind, title: state.minigame.title, prompt: state.minigame.kind === 'PROMPT_DECK' && !promptRevealed ? 'Prompt ready.' : state.minigame.prompt, status: state.minigame.status, durationSeconds: state.minigame.durationSeconds, remainingSeconds: state.minigame.remainingSeconds, startedAt: state.minigame.startedAt, selectedAlias: state.minigame.selectedStudentId ? repository.findSafeStudent(db, state.group.id, state.minigame.selectedStudentId)?.alias ?? null : null, ...(state.minigame.kind === 'TEAM_DRAW' ? { teamCount: state.minigame.teamCount, teams: safeTeamAssignments(db, state.minigame) } : {}), ...(state.minigame.kind === 'PROMPT_DECK' ? { promptRevealed } : {}) } : null,
    students: safeStudents.map(student => { const summary = summaryByStudent.get(student.id); return { avatar: student.avatar, alias: student.alias, specialty: student.specialty, xpLevel: summary?.level ?? 1, progressToNextLevel: summary?.progress.current ?? 0, unlockedBadge: summary?.badges[0]?.label ?? null }; }),
  };
}

export function projectionDisplay(db: Database.Database, teacherId: string, groupId: string) {
  return projectionPayload(db, projectionState(db, teacherId, groupId));
}

export function projectionControl(db: Database.Database, teacherId: string, groupId: string) {
  const state = projectionState(db, teacherId, groupId);
  const display = projectionPayload(db, state);
  const resource = state.minigame ?? state.challenge ?? state.event;
  return { scene: display.scene, resourceId: resource?.id ?? null, title: resource?.title ?? null, kind: state.minigame?.kind ?? null, display };
}

export function clearProjection(db: Database.Database, teacherId: string, groupId: string) {
  const state = projectionState(db, teacherId, groupId);
  writable(state.group);
  return db.transaction(() => {
    if (state.minigame) repository.updateMinigame(db, state.minigame.id, { status: 'ENDED', remainingSeconds: state.minigame.remainingSeconds, startedAt: null, pausedAt: null, updatedAt: now() });
    repository.clearProjectionContent(db, teacherId, groupId, now());
    return projectionControl(db, teacherId, groupId);
  })();
}
