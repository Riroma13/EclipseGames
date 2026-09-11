import { lstatSync, readFileSync, mkdirSync, openSync, closeSync, renameSync, unlinkSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { randomUUID } from 'node:crypto';

export const CANONICAL_DATABASE = '/home/ubuntu/.local/share/eclipsegames-demo/review-m2.sqlite';
export const DEFAULTS = Object.freeze({
  NODE_ENV: 'development', DATABASE_URL: CANONICAL_DATABASE, API_HOST: '127.0.0.1', API_PORT: '3199',
  APP_ORIGIN: 'http://localhost:5173', API_ORIGIN: 'http://127.0.0.1:3199',
  BOOTSTRAP_TEACHER_EMAIL: 'teacher@example.test', BOOTSTRAP_TEACHER_PASSWORD: 'change-me-in-development',
});
const OVERRIDES = Object.freeze({
  NODE_ENV: 'ECLIPSE_DEMO_NODE_ENV', DATABASE_URL: 'ECLIPSE_DEMO_DATABASE_URL', API_HOST: 'ECLIPSE_DEMO_API_HOST',
  API_PORT: 'ECLIPSE_DEMO_API_PORT', APP_ORIGIN: 'ECLIPSE_DEMO_APP_ORIGIN', API_ORIGIN: 'ECLIPSE_DEMO_API_ORIGIN',
  BOOTSTRAP_TEACHER_EMAIL: 'ECLIPSE_DEMO_BOOTSTRAP_TEACHER_EMAIL',
  BOOTSTRAP_TEACHER_PASSWORD: 'ECLIPSE_DEMO_BOOTSTRAP_TEACHER_PASSWORD',
});

const loopback = (value) => value === '127.0.0.1' || value === 'localhost' || value === '::1';
function validOrigin(value) {
  try { const url = new URL(value); return url.protocol === 'http:' && loopback(url.hostname) && !url.username && !url.password; } catch { return false; }
}
function validate(key, value) {
  if (key === 'NODE_ENV' && value !== 'development') throw new Error('Demo workflow requires NODE_ENV=development.');
  if (key.endsWith('HOST') && !loopback(value)) throw new Error(`${key} must use a loopback host.`);
  if (key.endsWith('PORT')) { const port = Number(value); if (!/^\d+$/.test(value) || port < 1 || port > 65535) throw new Error(`${key} must be a valid port.`); }
  if (key.endsWith('ORIGIN') && !validOrigin(value)) throw new Error(`${key} must be a loopback HTTP origin.`);
  if (key === 'DATABASE_URL' && (!value.endsWith('.sqlite') || value.includes('\0') || value.startsWith('file:'))) throw new Error('DATABASE_URL must be a local SQLite path.');
  if (key === 'BOOTSTRAP_TEACHER_EMAIL' && (!value.includes('@') || /[\r\n]/.test(value))) throw new Error('BOOTSTRAP_TEACHER_EMAIL is invalid.');
  if (key === 'BOOTSTRAP_TEACHER_PASSWORD' && (!value || /[\r\n]/.test(value))) throw new Error('BOOTSTRAP_TEACHER_PASSWORD is invalid.');
  return value;
}

export function effectiveEnvironment(input = process.env) {
  const environment = { ...DEFAULTS };
  for (const [key, variable] of Object.entries(OVERRIDES)) if (input[variable] !== undefined) environment[key] = validate(key, input[variable]);
  validate('NODE_ENV', environment.NODE_ENV);
  return environment;
}

function assertDevelopment(environment) { if (environment.NODE_ENV !== 'development') throw new Error('Demo workflow refused in production.'); }
function exactDemoPath(environment) { const database = resolve(environment.DATABASE_URL); if (database !== CANONICAL_DATABASE) throw new Error(`Demo reset requires DATABASE_URL=${CANONICAL_DATABASE}.`); return database; }
function assertRegularFileOrMissing(path, label) {
  let stat; try { stat = lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (stat.isSymbolicLink()) throw new Error(`Demo reset refuses symlink ${label}: ${path}`);
  if (!stat.isFile()) throw new Error(`Demo reset refuses non-file ${label}: ${path}`);
}
export function guardResetPath(environment) { const database = exactDemoPath(environment); assertRegularFileOrMissing(database, 'database'); assertRegularFileOrMissing(`${database}-wal`, 'database sidecar'); assertRegularFileOrMissing(`${database}-shm`, 'database sidecar'); return database; }
export function removeDemoDatabase(environment) { const database = guardResetPath(environment); for (const path of [database, `${database}-wal`, `${database}-shm`]) try { unlinkSync(path); } catch (error) { if (error.code !== 'ENOENT') throw error; } }

export function checkPort(host, port) {
  return new Promise((resolveCheck, rejectCheck) => { const server = createServer();
    server.once('error', () => rejectCheck(new Error(`Port ${port} on ${host} is occupied or unavailable.`)));
    server.listen({ host, port }, () => server.close(() => resolveCheck()));
  });
}
export async function preflightPorts(environment) { await checkPort(environment.API_HOST, Number(environment.API_PORT)); await checkPort('127.0.0.1', 5173); }

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const runtimeDirectory = process.env.XDG_RUNTIME_DIR || `/tmp/eclipsegames-${process.getuid?.() ?? 'user'}`;
export const OWNERSHIP_FILE = `${runtimeDirectory}/demo-workflow-owner.json`;
const apiCommand = { command: resolve('apps/api/node_modules/.bin/tsx'), args: ['watch', 'src/server.ts'] };
const webCommand = { command: resolve(`apps/web/node_modules/.bin/vite${process.platform === 'win32' ? '.cmd' : ''}`), args: ['--host', '127.0.0.1', '--port', '5173', '--strictPort'] };
const fingerprint = ({ command, args }) => [command, ...args].join('\0');

function atomicWrite(path, value) { const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`; writeFileSync(temporary, `${JSON.stringify(value)}\n`, { mode: 0o600 }); renameSync(temporary, path); chmodSync(path, 0o600); }
function readOwner(path = OWNERSHIP_FILE) { try { return JSON.parse(readFileSync(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw new Error(`Cannot read demo ownership record: ${error.message}`); } }
export function createOwner(path, environment) { mkdirSync(resolve(path, '..'), { recursive: true, mode: 0o700 }); const token = randomUUID(); const owner = { token, api: null, web: null, apiEndpoint: `${environment.API_HOST}:${environment.API_PORT}`, webEndpoint: '127.0.0.1:5173', createdAt: new Date().toISOString() }; try { const fd = openSync(path, 'wx', 0o600); closeSync(fd); } catch (error) { if (error.code !== 'EEXIST') throw error; throw new Error('A demo workflow is already starting; stop it or remove its ownership record after inspection.'); } atomicWrite(path, owner); return owner; }
function procIdentity(pid, expected) {
  try { const stat = readFileSync(`/proc/${pid}/stat`, 'utf8'); const close = stat.lastIndexOf(')'); const fields = stat.slice(close + 2).split(' '); const start = fields[19]; const group = fields[2]; const command = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').filter(Boolean).join('\0'); return { start, group, command, matches: start === expected.start && group === String(pid) && command === expected.command }; } catch { return null; }
}
export function processMatches(record) {
  if (!record?.pid) return false;
  const identity = procIdentity(record.pid, record); if (!identity?.matches || !record.expected) return false;
  const command = identity.command.split('\0'); return record.expected.split('\0').slice(1).every((part) => command.includes(part));
}
function updateOwner(path, owner, apiChild, webChild) {
  const apiIdentity = procIdentity(apiChild.pid, { start: '', command: '' }); const webIdentity = procIdentity(webChild.pid, { start: '', command: '' });
  if (!apiIdentity || !webIdentity) throw new Error('Unable to establish demo process identity safely.');
  owner.api = { pid: apiChild.pid, start: apiIdentity.start, command: apiIdentity.command, expected: fingerprint(apiCommand) };
  owner.web = { pid: webChild.pid, start: webIdentity.start, command: webIdentity.command, expected: fingerprint(webCommand) }; atomicWrite(path, owner);
}
function removeOwner(path, token) { const current = readOwner(path); if (current?.token === token) try { unlinkSync(path); } catch (error) { if (error.code !== 'ENOENT') throw error; } }

async function stopPid(record, signal, kill = process.kill) { if (!record?.pid || !processMatches(record)) return; try { kill(-record.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
function endpointFor(component, environment) { return component === 'api' ? { host: environment.API_HOST, port: Number(environment.API_PORT) } : { host: '127.0.0.1', port: 5173 }; }
async function assertEndpointClear(component, environment) {
  const endpoint = endpointFor(component, environment);
  try { await checkPort(endpoint.host, endpoint.port); } catch { throw new Error(`Demo ${component} endpoint ${endpoint.host}:${endpoint.port} is occupied by an unproven process; refusing unsafe recovery.`); }
}
function recordedEndpointMatches(component, owner, environment) {
  const endpoint = endpointFor(component, environment);
  return (component === 'api' ? owner.apiEndpoint : owner.webEndpoint) === `${endpoint.host}:${endpoint.port}`;
}
function clearOwnerComponent(path, token, component) {
  const current = readOwner(path);
  if (current?.token !== token) return false;
  current[component] = null;
  atomicWrite(path, current);
  return true;
}
export async function recoverOwner(environment, path = OWNERSHIP_FILE) {
  const owner = readOwner(path); if (!owner) return;
  for (const component of ['api', 'web']) {
    const record = owner[component];
    if (!recordedEndpointMatches(component, owner, environment)) throw new Error(`Demo ${component} ownership endpoint does not match the validated environment; refusing unsafe recovery.`);
    if (record && processMatches(record)) {
      await stopPid(record, 'SIGTERM');
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
      await stopPid(record, 'SIGKILL');
    } else {
      await assertEndpointClear(component, environment);
    }
    if (!clearOwnerComponent(path, owner.token, component)) return;
  }
  const current = readOwner(path);
  if (current?.token === owner.token) {
    await Promise.all(['api', 'web'].map((component) => assertEndpointClear(component, environment)));
    removeOwner(path, owner.token);
  }
}

function runCommand(command, args, environment, { cwd = '.', longRunning = false } = {}) {
  return new Promise((resolveRun, rejectRun) => { const child = spawn(command, args, { cwd: resolve(cwd), env: { ...process.env, ...environment }, stdio: 'inherit', detached: longRunning }); let settled = false; let rejectFailure;
    child.failure = new Promise((_, reject) => { rejectFailure = reject; });
    const finish = (result) => { if (!settled) { settled = true; resolveRun(result); } }; child.once('error', (error) => { if (!longRunning) rejectRun(error); else { child.spawnError = error; rejectFailure(new Error(`${command} ${args.join(' ')} failed to spawn: ${error.message}`)); finish({ child, error, code: null, signal: null }); } }); child.once('exit', (code, signal) => { if (longRunning && child.exitCode !== null) rejectFailure(new Error(`${command} ${args.join(' ')} exited with status ${code ?? `signal ${signal}`}.`)); finish({ child, code, signal }); });
    if (longRunning) finish({ child, code: null, signal: null });
  });
}
function readiness(url, timeout = 10000) { const deadline = Date.now() + timeout; return new Promise((resolveReady, rejectReady) => { const attempt = () => { const req = request(url, { timeout: 500 }, (response) => { response.resume(); if (response.statusCode >= 200 && response.statusCode < 300) return resolveReady(); retry(); }); req.once('error', retry); req.end(); }; const retry = () => { if (Date.now() >= deadline) rejectReady(new Error(`Readiness timeout for ${url}.`)); else setTimeout(attempt, 100); }; attempt(); }); }

export async function resetDemo(environment = effectiveEnvironment()) { assertDevelopment(environment); exactDemoPath(environment); await preflightPorts(environment); removeDemoDatabase(environment); for (const command of [['migrate'], ['bootstrap'], ['seed:demo']]) { const result = await runCommand(pnpm, command, environment); if (result.code !== 0) throw new Error(`${command.join(' ')} failed with status ${result.code ?? `signal ${result.signal}`}.`); } }

export async function supervise(environment = effectiveEnvironment(), { ownerPath = OWNERSHIP_FILE, readinessTimeout = 10000 } = {}) {
  const owner = createOwner(ownerPath, environment); const children = []; let stopping = false; let secondSignal = false;
  const stopChild = async (child) => { if (!child?.pid) return; try { process.kill(-child.pid, secondSignal ? 'SIGKILL' : 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; } };
  const cleanup = async (status) => { if (stopping) { secondSignal = true; await Promise.all(children.map(stopChild)); return; } stopping = true; await Promise.all(children.map(stopChild)); await new Promise((resolveWait) => setTimeout(resolveWait, 250)); secondSignal = true; await Promise.all(children.map(stopChild)); removeOwner(ownerPath, owner.token); process.exitCode = status; };
  const onSignal = (signal) => void cleanup(signal === 'SIGINT' ? 130 : 143);
  process.on('SIGINT', onSignal); process.on('SIGTERM', onSignal);
  try {
    const api = await runCommand(apiCommand.command, apiCommand.args, environment, { cwd: 'apps/api', longRunning: true }); if (api.error || api.child.spawnError) throw new Error(`API watcher failed to spawn: ${(api.error || api.child.spawnError).message}`); children.push(api.child); if (api.child.exitCode !== null) throw new Error(`API watcher exited before readiness with status ${api.code ?? 'unknown'}.`);
    const web = await runCommand(webCommand.command, webCommand.args, environment, { cwd: 'apps/web', longRunning: true }); if (web.error || web.child.spawnError) throw new Error(`Vite failed to spawn: ${(web.error || web.child.spawnError).message}`); children.push(web.child); if (web.child.exitCode !== null) throw new Error(`Vite exited before readiness with status ${web.code ?? 'unknown'}.`);
    updateOwner(ownerPath, owner, api.child, web.child);
    await Promise.race([Promise.all([readiness(`http://${environment.API_HOST}:${environment.API_PORT}/health`, readinessTimeout), readiness('http://127.0.0.1:5173/', readinessTimeout)]), Promise.race(children.map((child) => child.failure))]);
    return await new Promise((resolveWait) => { const ended = (code, signal, label) => { if (!stopping) void cleanup(code && code !== 0 ? code : signal ? 128 : 1).then(() => resolveWait(process.exitCode)); }; children.forEach((child, index) => child.once('error', (error) => { if (!stopping) void cleanup(1).then(() => resolveWait(process.exitCode)); else console.error(`${index ? 'Vite' : 'API'} watcher error: ${error.message}`); })); children.forEach((child, index) => child.once('exit', (code, signal) => ended(code, signal, index ? 'Vite' : 'API'))); });
  } catch (error) { await cleanup(1); throw error; } finally { process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onSignal); }
}

export async function startDemo(environment = effectiveEnvironment(), options = {}) { assertDevelopment(environment); await recoverOwner(environment, options.ownerPath); await preflightPorts(environment); const migration = await runCommand(pnpm, ['migrate'], environment); if (migration.code !== 0) throw new Error(`migrate failed with status ${migration.code ?? `signal ${migration.signal}`}.`); const onSignal = (signal) => void (signal === 'SIGINT' ? process.exitCode = 130 : process.exitCode = 143); process.once('SIGINT', onSignal); process.once('SIGTERM', onSignal); try { return await supervise(environment, options); } finally { process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onSignal); } }

if (import.meta.url === `file://${process.argv[1]}`) { const environment = effectiveEnvironment(); const command = process.argv[2]; (command === 'reset' ? resetDemo(environment) : command === 'start' ? startDemo(environment) : Promise.reject(new Error('Usage: demo-workflow.mjs <start|reset>'))).catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }); }
