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
import { registerCalendarRoutes } from './calendar/routes.js';
import { registerRtRoutes } from './rt/routes.js';
import { registerGemRoutes } from './gems/routes.js';
import { createCursorCodec, parseCursorKeys } from './gems/cursor.js';
import { createGemSourceOrchestrator } from './gems/source-orchestrator.js';
import { reconcileBeforeReadiness, type StartupReconciliationOptions } from './gems/startup-reconciliation.js';

type ServerOptions = {
  logger?: boolean;
  audit?: (entry: AuditEntry) => void;
  allowedOrigin?: string;
  bootstrapTeacher?: { email: string; password: string };
  startupReconciliation?: StartupReconciliationOptions;
};

export function createServer(databaseUrl = databasePathFromEnv(), options: ServerOptions = {}) {
  let cursorCodec;
  try { cursorCodec = createCursorCodec(parseCursorKeys(process.env.GEM_CURSOR_KEYS)); } catch { throw new Error('GEM_CURSOR_KEYS invalid or missing; server startup aborted.'); }
  const db = openDatabase(databaseUrl);
  const coordinator = createGemSourceOrchestrator();
  try { reconcileBeforeReadiness(db.database, coordinator, options.startupReconciliation); } catch (error) { db.close(); throw error; }
  const app = Fastify({ logger: options.logger ? { serializers: { req: (request: { method:string }) => ({ method: request.method }), request: (request: { method:string }) => ({ method: request.method }) }, redact: { paths: ['req.url','req.raw.url','request.url','request.raw.url','raw.url','rawReq.url','url','query','params','body','headers','req.headers','request.headers'], remove: true } } : options.logger ?? true, disableRequestLogging: true });
  registerErrorBoundary(app, options.audit);
  app.addHook('onRequest', async (request, reply) => {
    app.log.info({ event:'http.request.incoming', requestId:request.id, method:request.method }, 'http request incoming');
    const origin = request.headers.origin;
    if (origin && origin !== (options.allowedOrigin ?? process.env.APP_ORIGIN ?? 'http://localhost:5173')) {
      throw new ApiError('ORIGIN_FORBIDDEN', 403, 'Origin is not allowed.');
    }
    reply.header('x-request-id', request.id);
  });
  app.register(async (instance) => {
    await instance.register(cookie);
    const teacher = options.bootstrapTeacher ? await bootstrapTeacher(db.database, options.bootstrapTeacher.email, options.bootstrapTeacher.password) : undefined;
    if (teacher) ensureProjectionFixture(db.database, teacher.id);
    registerAuthRoutes(instance, db.database);
    registerProjectionRoutes(instance, db.database);
    registerRosterRoutes(instance, db.database);
    registerXpRoutes(instance, db.database, coordinator);
    registerCoinRoutes(instance, db.database);
    registerGameRoutes(instance, db.database);
    registerCalendarRoutes(instance, db.database);
    registerRtRoutes(instance, db.database, coordinator);
    registerGemRoutes(instance, db.database, cursorCodec);
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/v1/health', async () => ({ status: 'ok' }));
  app.addHook('onResponse', async (request, reply) => { app.log.info({ event:'http.request.completed', requestId:request.id, method:request.method, statusCode:reply.statusCode, responseTimeMs:reply.elapsedTime }, 'http request completed'); });
  const webRoot = resolve(process.cwd(), 'apps/web/dist');
  if (existsSync(webRoot)) {
    app.register(fastifyStatic, { root: webRoot, prefix: '/' });
    app.get('/', async (_request, reply) => reply.sendFile('index.html'));
  }
  app.addHook('onClose', async () => db.close());
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const app = createServer();
    const host = process.env.API_HOST ?? '127.0.0.1';
    const port = Number(process.env.API_PORT ?? 3000);
    app.listen({ host, port }).catch((error: unknown) => { process.stderr.write(`Fastify listen failed on ${host}:${port}: ${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
  } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
