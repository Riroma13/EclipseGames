import { lstatSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

export const CANONICAL_DATABASE = '/home/ubuntu/.local/share/eclipsegames-demo/review-m2.sqlite';
export const DEFAULTS = Object.freeze({
  NODE_ENV: 'development',
  DATABASE_URL: CANONICAL_DATABASE,
  API_HOST: '127.0.0.1',
  API_PORT: '3199',
  APP_ORIGIN: 'http://localhost:5173',
  API_ORIGIN: 'http://127.0.0.1:3199',
  BOOTSTRAP_TEACHER_EMAIL: 'teacher@example.test',
  BOOTSTRAP_TEACHER_PASSWORD: 'change-me-in-development',
});

export function effectiveEnvironment(input = process.env) {
  return Object.fromEntries(Object.entries(DEFAULTS).map(([key, value]) => [key, input[key] ?? value]));
}

function assertDevelopment(environment) {
  if (environment.NODE_ENV === 'production') {
    throw new Error('Demo workflow refused in production.');
  }
}

function exactDemoPath(environment) {
  const database = resolve(environment.DATABASE_URL);
  if (database !== CANONICAL_DATABASE) {
    throw new Error(`Demo reset requires DATABASE_URL=${CANONICAL_DATABASE}.`);
  }
  return database;
}

function assertRegularFileOrMissing(path, label) {
  let stat;
  try { stat = lstatSync(path); } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`Demo reset refuses symlink ${label}: ${path}`);
  if (!stat.isFile()) throw new Error(`Demo reset refuses non-file ${label}: ${path}`);
}

export function guardResetPath(environment) {
  const database = exactDemoPath(environment);
  assertRegularFileOrMissing(database, 'database');
  assertRegularFileOrMissing(`${database}-wal`, 'database sidecar');
  assertRegularFileOrMissing(`${database}-shm`, 'database sidecar');
  return database;
}

export function removeDemoDatabase(environment) {
  const database = guardResetPath(environment);
  for (const path of [database, `${database}-wal`, `${database}-shm`]) {
    try { unlinkSync(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

export function checkPort(host, port) {
  return new Promise((resolveCheck, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error(`Port ${port} on ${host} is occupied or unavailable.`)));
    server.listen({ host, port }, () => server.close(() => resolveCheck()));
  });
}

export async function preflightPorts(environment) {
  await checkPort(environment.API_HOST, Number(environment.API_PORT));
  try {
    await checkPort('127.0.0.1', 5173);
  } catch {
    throw new Error('Port 5173 on 127.0.0.1 is occupied or unavailable.');
  }
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function runCommand(command, args, environment, { cwd = '.', longRunning = false } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: resolve(cwd),
      env: { ...process.env, ...environment },
      stdio: 'inherit',
      detached: longRunning,
    });
    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; resolveRun(result); } };
    if (longRunning) {
      child.once('error', (error) => { child.spawnError = error; });
      finish({ child, code: null, signal: null });
    } else {
      child.once('error', rejectRun);
    }
    child.once('exit', (code, signal) => finish({ code, signal, child }));
  });
}

export async function resetDemo(environment = effectiveEnvironment()) {
  assertDevelopment(environment);
  exactDemoPath(environment);
  await preflightPorts(environment);
  removeDemoDatabase(environment);
  for (const command of [['migrate'], ['bootstrap'], ['seed:demo']]) {
    const result = await runCommand(pnpm, command, environment);
    if (result.code !== 0) throw new Error(`${command.join(' ')} failed with status ${result.code ?? `signal ${result.signal}`}.`);
  }
}

function signalNumber(signal) {
  return signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1;
}

function killGroup(child, signal) {
  if (child?.pid) {
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
}

async function stopChild(child, exited) {
  if (!child) return;
  killGroup(child, 'SIGTERM');
  if (!exited) {
    await Promise.race([new Promise((resolveStop) => child.once('exit', resolveStop)), new Promise((resolveStop) => setTimeout(resolveStop, 1500))]);
  } else {
    await new Promise((resolveStop) => setTimeout(resolveStop, 1500));
  }
  killGroup(child, 'SIGKILL');
}

export async function supervise(environment = effectiveEnvironment()) {
  const children = [];
  const api = await runCommand(resolve('apps/api/node_modules/.bin/tsx'), ['watch', 'src/server.ts'], environment, { cwd: 'apps/api', longRunning: true });
  if (api.error) throw api.error;
  if (api.code !== null || api.signal) throw new Error(`API watcher exited before startup with status ${api.code ?? `signal ${api.signal}`}.`);
  children.push(api.child);
  const web = await runCommand(resolve(`apps/web/node_modules/.bin/vite${process.platform === 'win32' ? '.cmd' : ''}`), ['--host', '127.0.0.1', '--port', '5173', '--strictPort'], environment, { cwd: 'apps/web', longRunning: true });
  if (web.error) {
    await stopChild(api.child, false);
    throw web.error;
  }
  if (web.code !== null || web.signal) {
    await stopChild(api.child, false);
    throw new Error(`Vite exited before startup with status ${web.code ?? `signal ${web.signal}`}.`);
  }
  children.push(web.child);
  let stopping = false;
  const stopAll = async (status) => {
    if (stopping) return;
    stopping = true;
    await Promise.all(children.map((child) => stopChild(child, child.exitCode !== null || child.signalCode !== null)));
    process.exitCode = status;
  };
  const onSignal = (signal) => void stopAll(signalNumber(signal));
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  children.forEach((child) => child.once('error', () => void stopAll(1)));
  await new Promise((resolveWait) => {
    children.forEach((child) => child.once('exit', (code, signal) => {
      if (!stopping) void stopAll(code && code !== 0 ? code : signal ? signalNumber(signal) : 1).finally(resolveWait);
    }));
  });
  process.removeListener('SIGINT', onSignal);
  process.removeListener('SIGTERM', onSignal);
  return process.exitCode ?? 1;
}

export async function startDemo(environment = effectiveEnvironment()) {
  assertDevelopment(environment);
  await preflightPorts(environment);
  const migration = await runCommand(pnpm, ['migrate'], environment);
  if (migration.code !== 0) throw new Error(`migrate failed with status ${migration.code ?? `signal ${migration.signal}`}.`);
  return supervise(environment);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const environment = effectiveEnvironment();
  const command = process.argv[2];
  (command === 'reset' ? resetDemo(environment) : command === 'start' ? startDemo(environment) : Promise.reject(new Error('Usage: demo-workflow.mjs <start|reset>')))
    .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
