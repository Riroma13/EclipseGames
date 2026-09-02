import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import { ApiError } from '../http/errors.js';
import { validateBody } from '../http/validation.js';
import * as service from './service.js';

const uuid = z.string().uuid();
const idempotencyKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const eventBody = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).default(''), showOnProjection: z.boolean().default(false), theme: z.enum(['MISSION', 'NARRATIVE', 'CELEBRATION']).default('MISSION') });
const challengeBody = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).default(''), target: z.number().int().min(1).max(10_000), showOnProjection: z.boolean().default(false) });
const displayBody = z.object({ visible: z.boolean() });
const randomDrawBody = z.object({ title: z.string().trim().max(120).optional() });
const sprintBody = z.object({ title: z.string().trim().min(1).max(120), prompt: z.string().trim().min(1).max(500), durationSeconds: z.number().int().min(10).max(600) });
const deltaBody = z.object({ delta: z.union([z.literal(-1), z.literal(1)]) });
const teamDrawBody = z.object({ teamCount: z.number().int().min(2).max(10), title: z.string().trim().min(1).max(120).optional() });
const presetBody = z.object({ title: z.string().trim().min(1).max(120), prompt: z.string().trim().min(1).max(500), durationSeconds: z.number().int().min(10).max(600) });
const promptDeckBody = z.object({ title: z.string().trim().min(1).max(120), prompts: z.array(z.string().trim().min(1).max(500)).min(1).max(50) });
const promptDeckLaunchBody = z.object({ deckId: uuid });
const includeArchivedQuery = z.object({ includeArchived: z.enum(['true', 'false']).default('false') });
const teacher = (request: FastifyRequest) => (request as FastifyRequest & { teacherId: string }).teacherId;
const param = (request: FastifyRequest, key: string) => uuid.parse((request.params as Record<string, string>)[key]);
const requiredIdempotencyKey = (request: FastifyRequest) => { const value = request.headers['idempotency-key']; if (typeof value !== 'string' || !idempotencyKeyPattern.test(value)) throw new ApiError('VALIDATION_FAILED', 422, 'A UUID v4 Idempotency-Key header is required.'); return value; };

export function registerGameRoutes(app: FastifyInstance, db: Database.Database) {
  const session = requireSession(db);

  app.get('/api/v1/groups/:groupId/events', { preHandler: session }, async request => service.listEvents(db, teacher(request), param(request, 'groupId')));
   app.post('/api/v1/groups/:groupId/events', { preHandler: [session, validateBody(eventBody)] }, async (request, reply) => { const result = service.createEvent(db, teacher(request), param(request, 'groupId'), request.body as z.infer<typeof eventBody>, requiredIdempotencyKey(request)); return reply.code(result.replay ? 200 : 201).send(result.event); });
  app.patch('/api/v1/events/:eventId', { preHandler: [session, validateBody(eventBody)] }, async request => service.updateEvent(db, teacher(request), param(request, 'eventId'), request.body as z.infer<typeof eventBody>));
  app.post('/api/v1/events/:eventId/activate', { preHandler: session }, async request => service.activateEvent(db, teacher(request), param(request, 'eventId')));
  app.post('/api/v1/events/:eventId/complete', { preHandler: session }, async request => service.completeEvent(db, teacher(request), param(request, 'eventId')));
  app.post('/api/v1/events/:eventId/archive', { preHandler: session }, async request => service.archiveEvent(db, teacher(request), param(request, 'eventId')));
  app.post('/api/v1/events/:eventId/display', { preHandler: [session, validateBody(displayBody)] }, async request => service.displayEvent(db, teacher(request), param(request, 'eventId'), (request.body as z.infer<typeof displayBody>).visible));

  app.get('/api/v1/groups/:groupId/challenges', { preHandler: session }, async request => service.listChallenges(db, teacher(request), param(request, 'groupId')));
  app.post('/api/v1/groups/:groupId/challenges', { preHandler: [session, validateBody(challengeBody)] }, async (request, reply) => reply.code(201).send(service.createChallenge(db, teacher(request), param(request, 'groupId'), request.body as z.infer<typeof challengeBody>)));
  app.patch('/api/v1/challenges/:challengeId', { preHandler: [session, validateBody(challengeBody)] }, async request => service.updateChallenge(db, teacher(request), param(request, 'challengeId'), request.body as z.infer<typeof challengeBody>));
  app.post('/api/v1/challenges/:challengeId/activate', { preHandler: session }, async request => service.activateChallenge(db, teacher(request), param(request, 'challengeId')));
  app.post('/api/v1/challenges/:challengeId/pause', { preHandler: session }, async request => service.pauseChallenge(db, teacher(request), param(request, 'challengeId')));
  app.post('/api/v1/challenges/:challengeId/resume', { preHandler: session }, async request => service.resumeChallenge(db, teacher(request), param(request, 'challengeId')));
  app.post('/api/v1/challenges/:challengeId/progress', { preHandler: [session, validateBody(deltaBody)] }, async request => service.adjustChallenge(db, teacher(request), param(request, 'challengeId'), (request.body as z.infer<typeof deltaBody>).delta));
  app.post('/api/v1/challenges/:challengeId/complete', { preHandler: session }, async request => service.completeChallenge(db, teacher(request), param(request, 'challengeId')));
  app.post('/api/v1/challenges/:challengeId/archive', { preHandler: session }, async request => service.archiveChallenge(db, teacher(request), param(request, 'challengeId')));
  app.post('/api/v1/challenges/:challengeId/display', { preHandler: [session, validateBody(displayBody)] }, async request => service.displayChallenge(db, teacher(request), param(request, 'challengeId'), (request.body as z.infer<typeof displayBody>).visible));

  app.get('/api/v1/groups/:groupId/minigames/current', { preHandler: session }, async request => service.currentMinigame(db, teacher(request), param(request, 'groupId')));
  app.post('/api/v1/groups/:groupId/minigames/random-draw', { preHandler: [session, validateBody(randomDrawBody)] }, async (request, reply) => reply.code(201).send(service.launchRandomDraw(db, teacher(request), param(request, 'groupId'), (request.body as z.infer<typeof randomDrawBody>).title)));
  app.post('/api/v1/groups/:groupId/minigames/french-sprint', { preHandler: [session, validateBody(sprintBody)] }, async (request, reply) => reply.code(201).send(service.launchFrenchSprint(db, teacher(request), param(request, 'groupId'), request.body as z.infer<typeof sprintBody>)));
  app.post('/api/v1/groups/:groupId/minigames/french-sprint/from-preset/:presetId', { preHandler: session }, async (request, reply) => reply.code(201).send(service.launchFrenchSprintFromPreset(db, teacher(request), param(request, 'groupId'), param(request, 'presetId'))));
  app.post('/api/v1/groups/:groupId/minigames/team-draw', { preHandler: [session, validateBody(teamDrawBody)] }, async (request, reply) => reply.code(201).send(service.launchTeamDraw(db, teacher(request), param(request, 'groupId'), request.body as z.infer<typeof teamDrawBody>)));
  app.post('/api/v1/groups/:groupId/minigames/prompt-deck', { preHandler: [session, validateBody(promptDeckLaunchBody)] }, async (request, reply) => reply.code(201).send(service.launchPromptDeck(db, teacher(request), param(request, 'groupId'), (request.body as z.infer<typeof promptDeckLaunchBody>).deckId)));
  app.post('/api/v1/minigames/:minigameId/draw', { preHandler: session }, async request => service.drawStudent(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/random', { preHandler: session }, async request => service.randomPrompt(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/reveal', { preHandler: session }, async request => service.revealPrompt(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/next', { preHandler: session }, async request => service.nextPrompt(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/shuffle', { preHandler: session }, async request => service.shuffleTeamDraw(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/start', { preHandler: session }, async request => service.startMinigame(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/pause', { preHandler: session }, async request => service.pauseMinigame(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/resume', { preHandler: session }, async request => service.resumeMinigame(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/reset', { preHandler: session }, async request => service.resetMinigame(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/end', { preHandler: session }, async request => service.endMinigame(db, teacher(request), param(request, 'minigameId')));

  app.get('/api/v1/projection/groups/:groupId/display', { preHandler: session }, async request => service.projectionDisplay(db, teacher(request), param(request, 'groupId')));
  app.get('/api/v1/teacher/groups/:groupId/display', { preHandler: session }, async request => service.projectionControl(db, teacher(request), param(request, 'groupId')));
  app.post('/api/v1/teacher/groups/:groupId/display/clear', { preHandler: session }, async request => service.clearProjection(db, teacher(request), param(request, 'groupId')));

  app.get('/api/v1/minigame-presets', { preHandler: session }, async request => service.listMinigamePresets(db, teacher(request), includeArchivedQuery.parse(request.query).includeArchived === 'true'));
  app.post('/api/v1/minigame-presets', { preHandler: [session, validateBody(presetBody)] }, async (request, reply) => reply.code(201).send(service.createMinigamePreset(db, teacher(request), request.body as z.infer<typeof presetBody>)));
  app.patch('/api/v1/minigame-presets/:presetId', { preHandler: [session, validateBody(presetBody)] }, async request => service.updateMinigamePreset(db, teacher(request), param(request, 'presetId'), request.body as z.infer<typeof presetBody>));
  app.post('/api/v1/minigame-presets/:presetId/archive', { preHandler: session }, async request => service.archiveMinigamePreset(db, teacher(request), param(request, 'presetId')));

  app.get('/api/v1/prompt-decks', { preHandler: session }, async request => service.listPromptDecks(db, teacher(request), includeArchivedQuery.parse(request.query).includeArchived === 'true'));
  app.post('/api/v1/prompt-decks', { preHandler: [session, validateBody(promptDeckBody)] }, async (request, reply) => reply.code(201).send(service.createPromptDeck(db, teacher(request), request.body as z.infer<typeof promptDeckBody>)));
  app.patch('/api/v1/prompt-decks/:deckId', { preHandler: [session, validateBody(promptDeckBody)] }, async request => service.updatePromptDeck(db, teacher(request), param(request, 'deckId'), request.body as z.infer<typeof promptDeckBody>));
  app.post('/api/v1/prompt-decks/:deckId/archive', { preHandler: session }, async request => service.archivePromptDeck(db, teacher(request), param(request, 'deckId')));
}
