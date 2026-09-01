import type { FastifyInstance, FastifyRequest } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import { validateBody } from '../http/validation.js';
import * as service from './service.js';

const uuid = z.string().uuid();
const eventBody = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).default(''), showOnProjection: z.boolean().default(false), theme: z.enum(['MISSION', 'NARRATIVE', 'CELEBRATION']).default('MISSION') });
const challengeBody = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).default(''), target: z.number().int().min(1).max(10_000), showOnProjection: z.boolean().default(false) });
const displayBody = z.object({ visible: z.boolean() });
const randomDrawBody = z.object({ title: z.string().trim().max(120).optional() });
const sprintBody = z.object({ title: z.string().trim().min(1).max(120), prompt: z.string().trim().min(1).max(500), durationSeconds: z.number().int().min(10).max(600) });
const deltaBody = z.object({ delta: z.union([z.literal(-1), z.literal(1)]) });
const teacher = (request: FastifyRequest) => (request as FastifyRequest & { teacherId: string }).teacherId;
const param = (request: FastifyRequest, key: string) => uuid.parse((request.params as Record<string, string>)[key]);

export function registerGameRoutes(app: FastifyInstance, db: Database.Database) {
  const session = requireSession(db);

  app.get('/api/v1/groups/:groupId/events', { preHandler: session }, async request => service.listEvents(db, teacher(request), param(request, 'groupId')));
  app.post('/api/v1/groups/:groupId/events', { preHandler: [session, validateBody(eventBody)] }, async (request, reply) => reply.code(201).send(service.createEvent(db, teacher(request), param(request, 'groupId'), request.body as z.infer<typeof eventBody>)));
  app.patch('/api/v1/events/:eventId', { preHandler: [session, validateBody(eventBody)] }, async request => service.updateEvent(db, teacher(request), param(request, 'eventId'), request.body as z.infer<typeof eventBody>));
  app.post('/api/v1/events/:eventId/activate', { preHandler: session }, async request => service.activateEvent(db, teacher(request), param(request, 'eventId')));
  app.post('/api/v1/events/:eventId/complete', { preHandler: session }, async request => service.completeEvent(db, teacher(request), param(request, 'eventId')));
  app.post('/api/v1/events/:eventId/archive', { preHandler: session }, async request => service.archiveEvent(db, teacher(request), param(request, 'eventId')));
  app.post('/api/v1/events/:eventId/display', { preHandler: [session, validateBody(displayBody)] }, async request => service.displayEvent(db, teacher(request), param(request, 'eventId'), (request.body as z.infer<typeof displayBody>).visible));

  app.get('/api/v1/groups/:groupId/challenges', { preHandler: session }, async request => service.listChallenges(db, teacher(request), param(request, 'groupId')));
  app.post('/api/v1/groups/:groupId/challenges', { preHandler: [session, validateBody(challengeBody)] }, async (request, reply) => reply.code(201).send(service.createChallenge(db, teacher(request), param(request, 'groupId'), request.body as z.infer<typeof challengeBody>)));
  app.patch('/api/v1/challenges/:challengeId', { preHandler: [session, validateBody(challengeBody)] }, async request => service.updateChallenge(db, teacher(request), param(request, 'challengeId'), request.body as z.infer<typeof challengeBody>));
  app.post('/api/v1/challenges/:challengeId/activate', { preHandler: session }, async request => service.activateChallenge(db, teacher(request), param(request, 'challengeId')));
  app.post('/api/v1/challenges/:challengeId/progress', { preHandler: [session, validateBody(deltaBody)] }, async request => service.adjustChallenge(db, teacher(request), param(request, 'challengeId'), (request.body as z.infer<typeof deltaBody>).delta));
  app.post('/api/v1/challenges/:challengeId/complete', { preHandler: session }, async request => service.completeChallenge(db, teacher(request), param(request, 'challengeId')));
  app.post('/api/v1/challenges/:challengeId/archive', { preHandler: session }, async request => service.archiveChallenge(db, teacher(request), param(request, 'challengeId')));
  app.post('/api/v1/challenges/:challengeId/display', { preHandler: [session, validateBody(displayBody)] }, async request => service.displayChallenge(db, teacher(request), param(request, 'challengeId'), (request.body as z.infer<typeof displayBody>).visible));

  app.get('/api/v1/groups/:groupId/minigames/current', { preHandler: session }, async request => service.currentMinigame(db, teacher(request), param(request, 'groupId')));
  app.post('/api/v1/groups/:groupId/minigames/random-draw', { preHandler: [session, validateBody(randomDrawBody)] }, async (request, reply) => reply.code(201).send(service.launchRandomDraw(db, teacher(request), param(request, 'groupId'), (request.body as z.infer<typeof randomDrawBody>).title)));
  app.post('/api/v1/groups/:groupId/minigames/french-sprint', { preHandler: [session, validateBody(sprintBody)] }, async (request, reply) => reply.code(201).send(service.launchFrenchSprint(db, teacher(request), param(request, 'groupId'), request.body as z.infer<typeof sprintBody>)));
  app.post('/api/v1/minigames/:minigameId/draw', { preHandler: session }, async request => service.drawStudent(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/start', { preHandler: session }, async request => service.startMinigame(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/pause', { preHandler: session }, async request => service.pauseMinigame(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/resume', { preHandler: session }, async request => service.resumeMinigame(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/reset', { preHandler: session }, async request => service.resetMinigame(db, teacher(request), param(request, 'minigameId')));
  app.post('/api/v1/minigames/:minigameId/end', { preHandler: session }, async request => service.endMinigame(db, teacher(request), param(request, 'minigameId')));

  app.get('/api/v1/projection/groups/:groupId/display', { preHandler: session }, async request => service.projectionDisplay(db, teacher(request), param(request, 'groupId')));
}
