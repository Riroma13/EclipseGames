import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import {
  CANONICAL_DATABASE,
  DEFAULTS,
  effectiveEnvironment,
  guardResetPath,
  preflightPorts,
  startDemo,
  resetDemo,
  createOwner,
  recoverOwner,
} from './demo-workflow.mjs';

test('uses canonical defaults and ignores generic inherited values', () => {
  const environment = effectiveEnvironment({ API_PORT: '4000', DATABASE_URL: '/tmp/demo.sqlite', NODE_ENV: 'production' });
  assert.equal(environment.NODE_ENV, DEFAULTS.NODE_ENV);
  assert.equal(environment.API_PORT, DEFAULTS.API_PORT);
  assert.equal(environment.DATABASE_URL, CANONICAL_DATABASE);
  assert.equal(environment.API_ORIGIN, DEFAULTS.API_ORIGIN);
});

test('accepts validated namespaced overrides and rejects unsafe values', () => {
  const environment = effectiveEnvironment({ ECLIPSE_DEMO_API_PORT: '4000', ECLIPSE_DEMO_DATABASE_URL: '/tmp/demo.sqlite' });
  assert.equal(environment.API_PORT, '4000');
  assert.equal(environment.DATABASE_URL, '/tmp/demo.sqlite');
  assert.throws(() => effectiveEnvironment({ ECLIPSE_DEMO_NODE_ENV: 'production' }), /requires NODE_ENV/);
  assert.throws(() => effectiveEnvironment({ ECLIPSE_DEMO_API_HOST: '0.0.0.0' }), /loopback/);
  assert.throws(() => effectiveEnvironment({ ECLIPSE_DEMO_API_PORT: '99999' }), /valid port/);
  assert.throws(() => effectiveEnvironment({ ECLIPSE_DEMO_APP_ORIGIN: 'https://evil.example' }), /loopback HTTP/);
});

test('refuses production before startup side effects', async () => {
  await assert.rejects(() => startDemo({ ...DEFAULTS, NODE_ENV: 'production' }), /refused in production/);
});

test('reset accepts only the canonical regular database path', () => {
  assert.equal(guardResetPath({ ...DEFAULTS, DATABASE_URL: CANONICAL_DATABASE }), CANONICAL_DATABASE);
  assert.throws(() => guardResetPath({ ...DEFAULTS, DATABASE_URL: '/tmp/other.sqlite' }), /requires DATABASE_URL/);
  assert.throws(() => guardResetPath({ ...DEFAULTS, DATABASE_URL: `${CANONICAL_DATABASE}-backup` }), /requires DATABASE_URL/);
});

test('port preflight identifies an occupied endpoint', async () => {
  const blocker = createServer().listen({ host: '127.0.0.1', port: 0 });
  await new Promise((resolve) => blocker.once('listening', resolve));
  const address = blocker.address();
  await assert.rejects(
    () => preflightPorts({ ...DEFAULTS, API_PORT: String(address.port) }),
    new RegExp(`Port ${address.port} on 127\\.0\\.0\\.1 is occupied`),
  );
  blocker.close();
});

test('creates private atomic ownership metadata and removes records with no matching process', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-demo-test-'));
  const path = join(directory, 'owner.json');
  const owner = createOwner(path, DEFAULTS);
  assert.match(readFileSync(path, 'utf8'), /"token"/);
  assert.equal((await recoverOwner(DEFAULTS, path)), undefined);
  assert.equal(existsSync(path), false);
  assert.notEqual(owner.token, undefined);
});

test('removes a stale ownership record with no matching process', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-demo-test-'));
  const path = join(directory, 'owner.json');
  writeFileSync(path, JSON.stringify(ownerRecord('other', { pid: process.pid, start: 'wrong', command: 'wrong' }, null)));
  await recoverOwner(DEFAULTS, path);
  assert.equal(existsSync(path), false);
});

function processRecord(child, expected = `${process.execPath}\0watch\0src/server.ts`) {
  const stat = readFileSync(`/proc/${child.pid}/stat`, 'utf8');
  const close = stat.lastIndexOf(')');
  const fields = stat.slice(close + 2).split(' ');
  const command = readFileSync(`/proc/${child.pid}/cmdline`, 'utf8').split('\0').filter(Boolean).join('\0');
  return { pid: child.pid, start: fields[19], command, expected };
}
function ownerRecord(token, api, web) {
  return { token, api, web, apiEndpoint: `${DEFAULTS.API_HOST}:${DEFAULTS.API_PORT}`, webEndpoint: '127.0.0.1:5173' };
}
function startOwnedFixture() {
  return spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)', 'watch', 'src/server.ts'], { detached: true });
}

test('recovers a stale API-only owned component and clears the absent web component safely', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-demo-test-'));
  const path = join(directory, 'owner.json');
  const child = startOwnedFixture();
  try {
    await new Promise((resolve) => child.once('spawn', resolve));
    writeFileSync(path, JSON.stringify(ownerRecord('api-only', processRecord(child), null)));
    await recoverOwner(DEFAULTS, path);
    assert.equal(existsSync(path), false);
  } finally {
    try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
});

test('recovers a stale Vite-only owned component and clears the absent API component safely', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-demo-test-'));
  const path = join(directory, 'owner.json');
  const child = startOwnedFixture();
  try {
    await new Promise((resolve) => child.once('spawn', resolve));
    writeFileSync(path, JSON.stringify(ownerRecord('web-only', null, processRecord(child))));
    await recoverOwner(DEFAULTS, path);
    assert.equal(existsSync(path), false);
  } finally {
    try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
});

test('recovers each independently proven group in a partially stale stack', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-demo-test-'));
  const path = join(directory, 'owner.json');
  const child = startOwnedFixture();
  try {
    await new Promise((resolve) => child.once('spawn', resolve));
    writeFileSync(path, JSON.stringify(ownerRecord('partial-stale', processRecord(child), { pid: process.pid, start: 'wrong', command: 'wrong', expected: 'wrong' })));
    await recoverOwner(DEFAULTS, path);
    assert.equal(existsSync(path), false);
  } finally {
    try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
});

test('does not clear an absent component when its endpoint is occupied', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-demo-test-'));
  const path = join(directory, 'owner.json');
  const blocker = createServer().listen({ host: '127.0.0.1', port: 5173 });
  await new Promise((resolve) => blocker.once('listening', resolve));
  try {
    writeFileSync(path, JSON.stringify(ownerRecord('occupied-absent', null, null)));
    await assert.rejects(() => recoverOwner(DEFAULTS, path), /web endpoint .* occupied/);
    assert.equal(existsSync(path), true);
  } finally {
    blocker.close();
  }
});

test('reset refuses production and non-canonical paths before any side effect', async () => {
  await assert.rejects(() => resetDemo({ ...DEFAULTS, NODE_ENV: 'production' }), /refused in production/);
  await assert.rejects(() => resetDemo({ ...DEFAULTS, DATABASE_URL: '/tmp/not-the-demo.sqlite' }), /requires DATABASE_URL/);
});
