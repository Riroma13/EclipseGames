import { z } from 'zod';

export const apiErrorCodes = [
  'VALIDATION_FAILED',
  'INTERNAL_ERROR',
  'AUTH_INVALID',
  'AUTH_RATE_LIMITED',
  'AUTH_REQUIRED',
  'ORIGIN_FORBIDDEN',
  'FORBIDDEN',
  'NOT_FOUND',
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

export const apiErrorSchema = z.object({
  code: z.enum(apiErrorCodes),
  message: z.string(),
  requestId: z.string().min(1),
});

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

export const healthResponseSchema = z.object({ status: z.literal('ok') });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export { z };
