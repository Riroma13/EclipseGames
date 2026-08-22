import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { ApiErrorCode } from '@eclipse/contracts';

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type AuditEntry = { code: ApiErrorCode; requestId: string };

export function registerErrorBoundary(app: FastifyInstance, audit?: (entry: AuditEntry) => void) {
  app.setErrorHandler((error, request, reply) => {
    const apiError = error instanceof ZodError
      ? new ApiError('VALIDATION_FAILED', 422, 'Request validation failed.')
      : error instanceof ApiError
        ? error
        : new ApiError('INTERNAL_ERROR', 500, 'An unexpected error occurred.');
    const requestId = request.id;

    audit?.({ code: apiError.code, requestId });
    request.log.error({ requestId, code: apiError.code }, 'request failed');
    return reply
      .status(apiError.statusCode)
      .header('x-request-id', requestId)
      .send({ code: apiError.code, message: apiError.message, requestId });
  });
}
