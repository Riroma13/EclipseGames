import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';

const credentials = { email: 'teacher@example.test', password: 'correct horse battery staple' };
const origin = 'http://localhost:5173';
const apps: Awaited<ReturnType<typeof createServer>>[] = [];

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
});

function app() {
  const value = createServer(':memory:', { logger: false, bootstrapTeacher: credentials });
  apps.push(value);
  return value;
}

describe('teacher authentication', () => {
  it('rejects invalid credentials without revealing account state', async () => {
    const response = await app().inject({
      method: 'POST',
      url: '/api/v1/auth/session',
      headers: { origin },
      payload: { email: credentials.email, password: 'wrong password' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'AUTH_INVALID', message: 'Invalid credentials.', requestId: expect.any(String) });
  });

  it('rejects a disallowed origin', async () => {
    const response = await app().inject({
      method: 'POST',
      url: '/api/v1/auth/session',
      headers: { origin: 'https://unexpected.example' },
      payload: credentials,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('ORIGIN_FORBIDDEN');
  });

  it('rate-limits repeated invalid login attempts', async () => {
    const server = app();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await server.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: { ...credentials, password: 'wrong' } });
    }

    const response = await server.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: { ...credentials, password: 'wrong' } });
    expect(response.statusCode).toBe(429);
    expect(response.json().code).toBe('AUTH_RATE_LIMITED');
  });

  it('sets an HTTP-compatible session cookie outside production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    const response = await app().inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    expect(response.statusCode).toBe(204);
    expect(response.headers['set-cookie']).toMatch(/^eclipse-session=/);
    expect(response.headers['set-cookie']).not.toMatch(/^__Host-session=/);
    expect(response.headers['set-cookie']).toMatch(/HttpOnly/);
    expect(response.headers['set-cookie']).not.toMatch(/; Secure(?:;|$)/);
    expect(response.headers['set-cookie']).toMatch(/SameSite=Strict/);
    expect(response.headers['set-cookie']).toMatch(/Path=\//);
    expect(response.headers['set-cookie']).toMatch(/Max-Age=\d+/);
  });

  it('preserves the Secure session cookie in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const response = await app().inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    expect(response.statusCode).toBe(204);
    expect(response.headers['set-cookie']).toMatch(/^__Host-session=/);
    expect(response.headers['set-cookie']).not.toMatch(/Domain=/);
    expect(response.headers['set-cookie']).toMatch(/HttpOnly/);
    expect(response.headers['set-cookie']).toMatch(/Secure/);
    expect(response.headers['set-cookie']).toMatch(/SameSite=Strict/);
    expect(response.headers['set-cookie']).toMatch(/Path=\//);
    expect(response.headers['set-cookie']).toMatch(/Max-Age=\d+/);
  });

  it('rejects a revoked session with AUTH_REQUIRED', async () => {
    const server = app();
    const login = await server.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
    const cookie = login.headers['set-cookie'];
    await server.inject({ method: 'DELETE', url: '/api/v1/auth/session', headers: { origin, cookie } });

    const response = await server.inject({ method: 'GET', url: '/api/v1/academic-years', headers: { origin, cookie } });
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('AUTH_REQUIRED');
  });

  it('uses the canonical non-production cookie name for session reads and logout', async () => {
    const server = app();
    const login = await server.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
    const cookie = login.headers['set-cookie'];

    const sessionRead = await server.inject({ method: 'GET', url: '/api/v1/academic-years', headers: { origin, cookie } });
    expect(sessionRead.statusCode).not.toBe(401);

    const logout = await server.inject({ method: 'DELETE', url: '/api/v1/auth/session', headers: { origin, cookie } });
    expect(logout.statusCode).toBe(204);
    expect(logout.headers['set-cookie']).toMatch(/^eclipse-session=/);
    expect(logout.headers['set-cookie']).toMatch(/Path=\//);
    expect(logout.headers['set-cookie']).toMatch(/Max-Age=0/);
    expect(logout.headers['set-cookie']).not.toMatch(/Secure/);
  });
});
