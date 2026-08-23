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
  'CONFLICT',
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

export const xpCategories = ['COMMUNICATION', 'PRECISION', 'CONSISTENCY', 'COLLABORATION'] as const;
export const xpCategorySchema = z.enum(xpCategories);
export const xpCreateBodySchema = z.object({ category: xpCategorySchema, baseXp: z.union([z.literal(1), z.literal(2), z.literal(3)]), comment: z.string().trim().max(500).optional() });
export const xpReverseBodySchema = z.object({ reason: z.string().trim().max(500).optional() });
export type XpCategory = (typeof xpCategories)[number];
export type XpAnnualSummaryDto = { studentId: string; academicYearId: string; annualEffectiveXp: number; level: 1|2|3|4|5|6|7|8; progress: { current: number; required: number; nextLevel: number|null; isMaxLevel: boolean }; badges: Array<{ category: XpCategory; label: string; unlockedAt: string }> };

export { z };
