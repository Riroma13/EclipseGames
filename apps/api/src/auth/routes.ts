import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import { validateBody } from '../http/validation.js';
import { authenticate, authenticateSession, issueSession, revoke, sessionCookieName, sessionCookieOptions } from './service.js';

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

type RateEntry = { failures: number; blockedUntil: number };

export function registerAuthRoutes(app: FastifyInstance, database: Database.Database) {
  const rate = new Map<string, RateEntry>();

  app.post('/api/v1/auth/session', { preHandler: validateBody(credentialsSchema) }, async (request, reply) => {
    const key = request.ip;
    const current = rate.get(key);
    if (current && current.blockedUntil > Date.now()) throw new ApiError('AUTH_RATE_LIMITED', 429, 'Too many login attempts.');
    const { email, password } = request.body as z.infer<typeof credentialsSchema>;
    const teacher = await authenticate(database, email, password);
    if (!teacher) {
      const failures = (current?.failures ?? 0) + 1;
      rate.set(key, { failures, blockedUntil: failures >= 5 ? Date.now() + 60_000 : 0 });
      throw new ApiError(failures >= 5 ? 'AUTH_RATE_LIMITED' : 'AUTH_INVALID', failures >= 5 ? 429 : 401, failures >= 5 ? 'Too many login attempts.' : 'Invalid credentials.');
    }
    rate.delete(key);
    const session = issueSession(database, teacher);
     return reply.code(204).setCookie(sessionCookieName(), session.token, sessionCookieOptions(session.maxAge)).send();
  });

  app.delete('/api/v1/auth/session', async (request, reply) => {
    const token = (request as FastifyRequest & { cookies?: Record<string, string> }).cookies?.[sessionCookieName()];
    if (!authenticateSession(database, token)) throw new ApiError('AUTH_REQUIRED', 401, 'Authentication is required.');
    revoke(database, token);
    return reply.code(204).clearCookie(sessionCookieName(), sessionCookieOptions(0)).send();
  });
}

export function requireSession(database: Database.Database) {
  return async (request: FastifyRequest) => {
    const token = (request as FastifyRequest & { cookies?: Record<string, string> }).cookies?.[sessionCookieName()];
    const session = authenticateSession(database, token);
    if (!session) throw new ApiError('AUTH_REQUIRED', 401, 'Authentication is required.');
    const target = request as FastifyRequest & { teacherId?: string; sessionId?: string };
    target.teacherId = session.teacherId;
    target.sessionId = session.id;
  };
}
