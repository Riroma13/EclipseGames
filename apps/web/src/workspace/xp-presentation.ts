import type { XpCategory } from './workspace-api';

type BaseXp = 1 | 2 | 3;
type DisciplinePresentation = { glyph: string; cue: string; actions: Record<BaseXp, string> };

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

const disciplinePresentation = {
  COMMUNICATION: {
    glyph: '◒',
    cue: 'Voice & expression',
    actions: { 1: 'Participation', 2: 'French with help / short phrase', 3: 'Spontaneous or developed French' },
  },
  PRECISION: {
    glyph: '⌖',
    cue: 'Care & accuracy',
    actions: { 1: 'Corrects / improves', 2: 'Correct and careful work', 3: 'Especially precise work' },
  },
  CONSISTENCY: {
    glyph: '↗︎',
    cue: 'Steady progress',
    actions: { 1: 'Tries despite difficulty', 2: 'Maintains effort', 3: 'Overcomes difficulty / improves' },
  },
  COLLABORATION: {
    glyph: '∞',
    cue: 'Learning together',
    actions: { 1: 'Appropriate occasional help', 2: 'Active collaboration', 3: 'Especially valuable collaboration' },
  },
} as const satisfies Record<XpCategory, DisciplinePresentation>;

export function disciplineForSpecialty(specialty: string | null | undefined): XpCategory | null {
  if (!specialty) return null;
  return specialtyCategory[specialty as keyof typeof specialtyCategory] ?? null;
}

export function presentationForDiscipline(discipline: XpCategory) {
  return disciplinePresentation[discipline];
}

export function effectiveXpForAction(baseXp: BaseXp, specialty: string | null, category: XpCategory) {
  return baseXp + (disciplineForSpecialty(specialty) === category ? 1 : 0);
}
