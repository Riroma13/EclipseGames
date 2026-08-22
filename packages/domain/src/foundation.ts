export type RtEntry = 10 | 5 | 0 | 'NOT_EVALUATED';

export type AcademicFacts = {
  observationGrade: number | null;
  xpEvidence: number;
  rtAverage: number | null;
};

export type BehaviourFacts = {
  state: 'NORMAL' | 'VIGILANCE' | 'ALERT' | 'RED_CODE';
  restrictsGameMechanics: boolean;
};

/** Architectural representative: behaviour facts do not mutate academic facts. */
export function preserveAcademicFacts(academic: AcademicFacts, _behaviour: BehaviourFacts): AcademicFacts {
  return { ...academic };
}

/** Architectural representative of the settled RT averaging boundary. */
export function averageEvaluatedRt(entries: readonly RtEntry[]): number | null {
  const evaluated = entries.filter((entry): entry is 10 | 5 | 0 => entry !== 'NOT_EVALUATED');
  return evaluated.length === 0 ? null : evaluated.reduce((sum, entry) => sum + entry, 0) / evaluated.length;
}
