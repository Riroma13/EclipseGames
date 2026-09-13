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
export type XpAnnualSummaryDto = { studentId: string; academicYearId: string; annualEffectiveXp: number; level: 1|2|3|4|5|6|7|8; progress: { isMaxLevel: false; progressPercent: number; nextLevel: 2|3|4|5|6|7|8; xpToNextLevel: number } | { isMaxLevel: true; progressPercent: 100; nextLevel: null; xpToNextLevel: null }; badges: Array<{ category: XpCategory; label: string; unlockedAt: string }> };
export type GemCurrency = 'EMERALD'|'RUBY'|'DIAMOND';
export type GemBalancesDto = { studentId: string; academicYearId: string; balances: Record<GemCurrency, number> };
export type GemLedgerEntryDto = { currency: GemCurrency; amount: 1|-1; kind: 'GRANT'|'REVOKE'|'REINSTATE'|'CORRECTION'|'SPEND'|'SPEND_REVERSAL'; createdAt: string };
export type GemLedgerPageDto = { studentId: string; academicYearId: string; entries: GemLedgerEntryDto[]; nextCursor: string|null };
export type GemCatalogueItemDto = { id: 'emerald-assessment-advantage'|'ruby-assessment-advantage'|'diamond-assessment-advantage'; currency: GemCurrency; cost: 1|2; type: 'ASSESSMENT_ADVANTAGE' };
export type GemActionStateDto = {
  studentId: string;
  academicYearId: string;
  assessmentContextId: string;
  resultReward: null | { id: string; tier: 'NONE'|'EMERALD_1'|'EMERALD_2'|'RUBY_1'|'DIAMOND_1'; state: 'ACTIVE'|'REVERSED' };
  advantageRedemption: null | { id: string; currency: GemCurrency; cost: 1|2; state: 'ACTIVE'|'REVERSED' };
};

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

export const calendarTermSchema = z.object({ code: z.enum(['T1', 'T2', 'T3']), startsOn: z.string().date(), endsOn: z.string().date() });
export const calendarSchema = z.object({ timezone: z.string(), terms: z.array(calendarTermSchema).length(3), holidays: z.array(z.object({ startsOn: z.string().date(), endsOn: z.string().date() })), slots: z.array(z.object({ groupId: z.string().uuid(), weekday: z.number().int(), startsAt: z.string(), endsAt: z.string() })) });
export const realClassSessionSchema = z.object({ id: z.string().uuid(), academicYearId: z.string().uuid(), groupId: z.string().uuid(), localDate: z.string().date(), timezone: z.string().min(1), slotStartsAt: z.string(), slotEndsAt: z.string(), startedAt: z.string().datetime(), endedAt: z.string().datetime().nullable(), createdAt: z.string().datetime() });
export type RealClassSessionDto = z.infer<typeof realClassSessionSchema>;
export const sessionStatusReasons = ['ACTIVE_SESSION','ARCHIVED_YEAR','UNCONFIGURED','OUTSIDE_TERM','HOLIDAY','NO_CLASS_DAY','OUTSIDE_TIMETABLE','USED_SLOT_DATE','ELIGIBLE'] as const;
export type SessionStatusReason = typeof sessionStatusReasons[number];
export type ClassOccurrenceDto = { localDate: string; weekdayLabel: string; startsAt: string; endsAt: string };
export type SessionStatusDto = { configured: boolean; canReplace: boolean; eligible: boolean; reason: SessionStatusReason; startTiming: 'EARLY'|'SCHEDULED'|null; message: string; currentClass: ClassOccurrenceDto|null; nextClass: ClassOccurrenceDto|null; activeForSelectedGroup: boolean; active: RealClassSessionDto|null };
export const rtValueSchema = z.union([z.literal(10), z.literal(5), z.literal(0), z.literal('ABSENT')]);
export type RtValue = z.infer<typeof rtValueSchema>;
export type RtTermSummaryDto = { studentId: string; termId: string; average: number | null; energy: 'CRITICAL'|'LOW'|'STABLE'|'HIGH'|'MAXIMUM' | null; streak: number };

export { z };
