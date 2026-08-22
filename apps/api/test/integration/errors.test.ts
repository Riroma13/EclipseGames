import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createServer } from '../../src/server.js';
import { validateBody } from '../../src/http/validation.js';

describe('API error boundary', () => {
  it('returns a structured validation error with one request ID', async () => {
    const app = createServer(':memory:', { logger: false });
    app.post('/api/v1/test-validation', { preHandler: validateBody(z.object({ name: z.string().min(1) })) }, async () => ({ ok: true }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/test-validation',
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: 'VALIDATION_FAILED', message: expect.any(String), requestId: expect.any(String) });
    expect(response.headers['x-request-id']).toBe(response.json().requestId);
    await app.close();
  });

  it('returns a safe internal error and audits without request payloads', async () => {
    const audit: Record<string, unknown>[] = [];
    const app = createServer(':memory:', { logger: false, audit: (entry) => audit.push(entry) });
    app.get('/api/v1/test-failure', async () => { throw new Error('secret student payload'); });

    const response = await app.inject({ method: 'GET', url: '/api/v1/test-failure?student=private' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', requestId: expect.any(String) });
    expect(JSON.stringify(audit)).not.toContain('secret student payload');
    expect(JSON.stringify(audit)).not.toContain('student=private');
    expect(audit).toEqual([expect.objectContaining({ code: 'INTERNAL_ERROR', requestId: response.json().requestId })]);
    await app.close();
  });
});
