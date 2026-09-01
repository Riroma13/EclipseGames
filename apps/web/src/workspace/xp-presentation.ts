import type { XpCategory } from './workspace-api';

type BaseXp = 1 | 2 | 3;

// Presentation-only mirror of the canonical domain specialty assignments. The API remains authoritative.
const specialtyCategory = {
  Leader: 'COMMUNICATION',
  Diplomat: 'COMMUNICATION',
  Strategist: 'PRECISION',
  Analyst: 'PRECISION',
  Disciplined: 'CONSISTENCY',
  Perseverant: 'CONSISTENCY',
  Helper: 'COLLABORATION',
  Ally: 'COLLABORATION',
} as const satisfies Record<string, XpCategory>;

export function effectiveXpForAction(baseXp: BaseXp, specialty: string | null, category: XpCategory) {
  const specialtyCategoryForStudent = specialty ? specialtyCategory[specialty as keyof typeof specialtyCategory] : undefined;
  return baseXp + (specialtyCategoryForStudent === category ? 1 : 0);
}
