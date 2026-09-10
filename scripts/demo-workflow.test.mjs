import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import {
  CANONICAL_DATABASE,
  DEFAULTS,
  effectiveEnvironment,
  guardResetPath,
  preflightPorts,
  startDemo,
} from './demo-workflow.mjs';

test('uses development defaults while preserving explicit values', () => {
  const environment = effectiveEnvironment({ API_PORT: '4000', DATABASE_URL: '/tmp/demo.sqlite' });
  assert.equal(environment.NODE_ENV, DEFAULTS.NODE_ENV);
  assert.equal(environment.API_PORT, '4000');
  assert.equal(environment.DATABASE_URL, '/tmp/demo.sqlite');
  assert.equal(environment.API_ORIGIN, DEFAULTS.API_ORIGIN);
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
