import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import * as xp from '../xp/service.js';
import * as repository from './repository.js';

const now = () => new Date().toISOString();
const notFound = (message: string): never => { throw new ApiError('NOT_FOUND', 404, message); };
const validation = (message: string): never => { throw new ApiError('VALIDATION_FAILED', 422, message); };
const writable = (group: repository.GroupContext) => { if (group.yearArchivedAt) validation('Archived academic years are read-only.'); return group; };

export type EventInput = { title: string; description: string; showOnProjection: boolean; theme: 'MISSION' | 'NARRATIVE' | 'CELEBRATION' };
export type ChallengeInput = { title: string; description: string; target: number; showOnProjection: boolean };

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

export function createEvent(db: Database.Database, teacherId: string, groupId: string, input: EventInput) {
  const group = writable(repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.'));
  const createdAt = now();
  return eventDto(repository.insertEvent(db, { id: randomUUID(), ownerTeacherId: teacherId, groupId: group.id, title: cleanTitle(input.title), description: cleanDescription(input.description), status: 'DRAFT', showOnProjection: input.showOnProjection ? 1 : 0, theme: input.theme, createdAt, updatedAt: createdAt, activatedAt: null, completedAt: null, archivedAt: null }));
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
  if (challenge.status === 'ACTIVE' && input.target <= challenge.progress) {
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
  if (challenge.status !== 'ACTIVE') repository.updateChallenge(db, challenge.id, { status: 'ACTIVE', activatedAt: now(), updatedAt: now() });
  return challengeDto(repository.findChallenge(db, teacherId, challenge.id)!);
}

export function adjustChallenge(db: Database.Database, teacherId: string, challengeId: string, delta: -1 | 1) {
  const { challenge, group } = ownedChallenge(db, teacherId, challengeId);
  writable(group);
  if (challenge.archivedAt) validation('Archived challenges are read-only.');
  if (challenge.status !== 'ACTIVE' && challenge.status !== 'COMPLETED') validation('Only active challenges can change progress.');
  const progress = Math.max(0, Math.min(challenge.target, challenge.progress + delta));
  let status: repository.ChallengeStatus = challenge.status;
  let completedAt = challenge.completedAt;
  if (progress >= challenge.target) { status = 'COMPLETED'; completedAt = completedAt ?? now(); }
  else if (challenge.status === 'COMPLETED' && delta < 0) { status = 'ACTIVE'; completedAt = null; }
  repository.updateChallenge(db, challenge.id, { progress, status, completedAt, updatedAt: now() });
  return challengeDto(repository.findChallenge(db, teacherId, challenge.id)!);
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
  };
}

export function currentMinigame(db: Database.Database, teacherId: string, groupId: string) {
  repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.');
  const current = currentOpenMinigame(db, teacherId, groupId);
  return current ? minigameDto(db, current, true) : null;
}

export function launchRandomDraw(db: Database.Database, teacherId: string, groupId: string, title: string | undefined) {
  const group = writable(repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.'));
  const students = activeStudentIds(db, group.id);
  if (!students.length) validation('Add at least one student before launching a draw.');
  return db.transaction(() => {
    closeActiveMinigame(db, teacherId, group.id);
    const createdAt = now();
    const value = repository.insertMinigame(db, { id: randomUUID(), ownerTeacherId: teacherId, groupId: group.id, kind: 'RANDOM_DRAW', title: cleanTitle(title || 'Random Student Draw'), prompt: 'Choose the next voice in the room.', durationSeconds: 0, status: 'READY', remainingSeconds: 0, startedAt: null, pausedAt: null, selectedStudentId: null, drawOrder: JSON.stringify(shuffle(students)), drawIndex: 0, createdAt, updatedAt: createdAt });
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
    const value = repository.insertMinigame(db, { id: randomUUID(), ownerTeacherId: teacherId, groupId: group.id, kind: 'FRENCH_SPRINT', title: cleanTitle(input.title || 'French Sprint'), prompt, durationSeconds: input.durationSeconds, status: 'READY', remainingSeconds: input.durationSeconds, startedAt: null, pausedAt: null, selectedStudentId: null, drawOrder: '[]', drawIndex: 0, createdAt, updatedAt: createdAt });
    return minigameDto(db, value, true);
  })();
}

export function drawStudent(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  const group = writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  if (current.kind !== 'RANDOM_DRAW') validation('Student draw is only available for Random Student Draw.');
  const students = activeStudentIds(db, group.id);
  if (!students.length) validation('Add at least one student before drawing.');
  let order = drawOrder(current.drawOrder).filter(studentId => students.includes(studentId));
  let index = current.drawIndex;
  if (!order.length || index >= order.length) { order = shuffle([...students]); index = 0; }
  const selectedStudentId = order[index];
  repository.updateMinigame(db, current.id, { selectedStudentId, drawOrder: JSON.stringify(order), drawIndex: index + 1, updatedAt: now() });
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
  repository.updateMinigame(db, current.id, { status: 'READY', remainingSeconds: current.durationSeconds, startedAt: null, pausedAt: null, selectedStudentId: null, drawOrder: current.kind === 'RANDOM_DRAW' ? JSON.stringify(shuffle(students)) : '[]', drawIndex: 0, updatedAt: now() });
  return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
}

export function endMinigame(db: Database.Database, teacherId: string, minigameId: string) {
  const current = activeMinigame(db, teacherId, minigameId);
  writable(repository.groupContext(db, teacherId, current.groupId) ?? notFound('Group not found.'));
  ensureMutableMinigame(current);
  repository.updateMinigame(db, current.id, { status: 'ENDED', remainingSeconds: current.remainingSeconds, startedAt: null, pausedAt: null, updatedAt: now() });
  return minigameDto(db, repository.findMinigame(db, teacherId, current.id)!, true);
}

export function projectionDisplay(db: Database.Database, teacherId: string, groupId: string) {
  const group = repository.groupContext(db, teacherId, groupId) ?? notFound('Group not found.');
  const event = repository.projectionEvent(db, teacherId, group.id);
  const challenge = repository.projectionChallenge(db, teacherId, group.id);
  const minigame = currentOpenMinigame(db, teacherId, group.id);
  const safeStudents = repository.listSafeStudents(db, group.id);
  const summaries = xp.groupSummaries(db, teacherId, group.id, group.academicYearId).summaries;
  const summaryByStudent = new Map(summaries.map(item => [item.studentId, item.summary]));
  return {
    group: { id: group.id, name: group.name },
    activeEvent: event ? { title: event.title, description: event.description, theme: event.theme, status: event.status } : null,
    activeChallenge: challenge ? { title: challenge.title, description: challenge.description, target: challenge.target, progress: challenge.progress, status: challenge.status } : null,
    minigame: minigame ? { kind: minigame.kind, title: minigame.title, prompt: minigame.prompt, status: minigame.status, durationSeconds: minigame.durationSeconds, remainingSeconds: minigame.remainingSeconds, startedAt: minigame.startedAt, selectedAlias: minigame.selectedStudentId ? repository.findSafeStudent(db, group.id, minigame.selectedStudentId)?.alias ?? null : null } : null,
    students: safeStudents.map(student => { const summary = summaryByStudent.get(student.id); return { avatar: student.avatar, alias: student.alias, specialty: student.specialty, xpLevel: summary?.level ?? 1, progressToNextLevel: summary?.progress.current ?? 0, unlockedBadge: summary?.badges[0]?.label ?? null }; }),
  };
}
