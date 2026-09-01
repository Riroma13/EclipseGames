import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDatabase } from './db/client.js';
import { ApiError, registerErrorBoundary, type AuditEntry } from './http/errors.js';
import { bootstrapTeacher } from './auth/service.js';
import { registerAuthRoutes } from './auth/routes.js';
import { ensureProjectionFixture } from './projection/repository.js';
import { registerProjectionRoutes } from './projection/routes.js';
import { databasePathFromEnv } from './db/path.js';
import { registerRosterRoutes } from './roster/routes.js';
import { registerXpRoutes } from './xp/routes.js';
import { registerCoinRoutes } from './coins/routes.js';
import { registerGameRoutes } from './game/routes.js';

type ServerOptions = {
  logger?: boolean;
  audit?: (entry: AuditEntry) => void;
  allowedOrigin?: string;
  bootstrapTeacher?: { email: string; password: string };
};

export function createServer(databaseUrl = databasePathFromEnv(), options: ServerOptions = {}) {
  const db = openDatabase(databaseUrl);
  const app = Fastify({ logger: options.logger ?? true });
  registerErrorBoundary(app, options.audit);
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && origin !== (options.allowedOrigin ?? process.env.APP_ORIGIN ?? 'http://localhost:5173')) {
      throw new ApiError('ORIGIN_FORBIDDEN', 403, 'Origin is not allowed.');
    }
    reply.header('x-request-id', request.id);
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/v1/health', async () => ({ status: 'ok' }));
  app.register(async (instance) => {
    await instance.register(cookie);
    const teacher = options.bootstrapTeacher ? await bootstrapTeacher(db.database, options.bootstrapTeacher.email, options.bootstrapTeacher.password) : undefined;
    if (teacher) ensureProjectionFixture(db.database, teacher.id);
    registerAuthRoutes(instance, db.database);
    registerProjectionRoutes(instance, db.database);
    registerRosterRoutes(instance, db.database);
    registerXpRoutes(instance, db.database);
    registerCoinRoutes(instance, db.database);
    registerGameRoutes(instance, db.database);
  });
  const webRoot = resolve(process.cwd(), 'apps/web/dist');
  if (existsSync(webRoot)) {
    app.register(fastifyStatic, { root: webRoot, prefix: '/' });
    app.get('/', async (_request, reply) => reply.sendFile('index.html'));
  }
  app.addHook('onClose', async () => db.close());
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createServer();
  const host = process.env.API_HOST ?? '127.0.0.1';
  const port = Number(process.env.API_PORT ?? 3000);
  app.listen({ host, port }).catch((error) => {
    app.log.error(error);
    process.exitCode = 1;
  });
}
