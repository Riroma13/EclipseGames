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

export const coinSourceSchema = z.enum(['LEVEL_ENTITLEMENT', 'PERSONAL_IMPROVEMENT', 'EXCEPTIONAL_FRENCH', 'EXCEPTIONAL_COLLABORATION', 'SPECIAL_CHALLENGE']);
export const manualCoinSourceSchema = z.enum(['PERSONAL_IMPROVEMENT', 'EXCEPTIONAL_FRENCH', 'EXCEPTIONAL_COLLABORATION', 'SPECIAL_CHALLENGE']);
export type ManualCoinSource = z.infer<typeof manualCoinSourceSchema>;
export const coinSummarySchema = z.object({ studentId: z.string(), academicYearId: z.string(), balance: z.number().int().nonnegative() });
export type CoinSummaryDto = z.infer<typeof coinSummarySchema>;
export type CoinLedgerEntryDto = { id: string; amount: number; source: string; createdAt: string; correctionOfId: string | null };
export const coinRewardSchema = z.object({ id: z.string(), name: z.string(), cost: z.union([z.literal(2), z.literal(3)]), type: z.literal('ASSESSMENT_ADVANTAGE') });
export type CoinRewardDto = z.infer<typeof coinRewardSchema>;
export const assessmentContextSchema = z.object({ id: z.string(), groupId: z.string(), name: z.string(), archivedAt: z.string().nullable() });
export type AssessmentContextDto = z.infer<typeof assessmentContextSchema>;
export type AdvantageRedemptionDto = { id: string; studentId: string; assessmentContextId: string; rewardId: string; cost: 2 | 3; createdAt: string; reversedAt: string | null };
export type AutomaticReversalDto = { redemptionId: string; rewardId: string; cost: 2 | 3; trigger: 'ENTITLEMENT_REVOKED'; refundLedgerEntryId: string; reversedAt: string };

export type MinigamePresetDto = { id: string; title: string; prompt: string; durationSeconds: number; archivedAt: string | null; createdAt: string; updatedAt: string };
export type PromptDeckDto = { id: string; title: string; prompts: string[]; archivedAt: string | null; createdAt: string; updatedAt: string };

export { z };
