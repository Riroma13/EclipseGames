import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeAny } from 'zod';

export function validateBody(schema: ZodTypeAny): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    request.body = schema.parse(request.body);
  };
}
