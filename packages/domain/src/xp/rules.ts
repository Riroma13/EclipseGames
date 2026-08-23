export const xpCategories = ['COMMUNICATION', 'PRECISION', 'CONSISTENCY', 'COLLABORATION'] as const;
export type XpCategory = (typeof xpCategories)[number];
export const baseXpValues = [1, 2, 3] as const;
export type BaseXp = (typeof baseXpValues)[number];
export const specialties = ['Leader', 'Diplomat', 'Strategist', 'Analyst', 'Disciplined', 'Perseverant', 'Helper', 'Ally'] as const;
export type Specialty = (typeof specialties)[number];

export const specialtyCategory: Record<Specialty, XpCategory> = {
  Leader: 'COMMUNICATION', Diplomat: 'COMMUNICATION',
  Strategist: 'PRECISION', Analyst: 'PRECISION',
  Disciplined: 'CONSISTENCY', Perseverant: 'CONSISTENCY',
  Helper: 'COLLABORATION', Ally: 'COLLABORATION',
};

export const categoryDescriptions: Record<XpCategory, readonly [string, string, string]> = {
  COMMUNICATION: ['Spanish participation', 'French with help or a short phrase', 'Spontaneous or developed French'],
  PRECISION: ['Corrects or improves', 'Correct and careful work', 'Especially precise work'],
  CONSISTENCY: ['Tries despite difficulty', 'Maintains effort', 'Clearly overcomes difficulty or improves'],
  COLLABORATION: ['Appropriate occasional help', 'Active collaboration', 'Especially valuable collaboration'],
};

export function isXpCategory(value: unknown): value is XpCategory { return typeof value === 'string' && (xpCategories as readonly string[]).includes(value); }
export function isBaseXp(value: unknown): value is BaseXp { return value === 1 || value === 2 || value === 3; }
export function calculateEventXp(category: XpCategory, baseXp: BaseXp, specialty: Specialty | null, specialtyBonusAllowed = true) {
  const categoryAtAward = specialty ? specialtyCategory[specialty] : null;
  const bonusEligible = Boolean(specialty && categoryAtAward === category && specialtyBonusAllowed);
  const specialtyBonusXp = bonusEligible ? 1 : 0;
  return { category, baseXp, specialtyAtAward: specialty, specialtyCategoryAtAward: categoryAtAward, bonusEligibleAtAward: bonusEligible, specialtyBonusXp, effectiveXp: baseXp + specialtyBonusXp } as const;
}

export function activeEffectiveXp(events: readonly { effectiveXp: number; active: boolean }[]) { return events.filter((event) => event.active).reduce((sum, event) => sum + event.effectiveXp, 0); }
export function activeCategoryXp(events: readonly { category: XpCategory; effectiveXp: number; active: boolean }[]) {
  return Object.fromEntries(xpCategories.map((category) => [category, events.filter((event) => event.active && event.category === category).reduce((sum, event) => sum + event.effectiveXp, 0)])) as Record<XpCategory, number>;
}
