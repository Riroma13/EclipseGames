import { describe, expect, it } from 'vitest';
import { averageEvaluatedRt, preserveAcademicFacts, type AcademicFacts, type RtEntry } from '../src/foundation.js';

describe('domain separation representatives', () => {
  it('calculates RT from evaluated entries only', () => {
    const entries: RtEntry[] = [10, 5, 'NOT_EVALUATED', 0];
    expect(averageEvaluatedRt(entries)).toBe(5);
  });

  it('keeps academic facts unchanged when behaviour facts are present', () => {
    const academic: AcademicFacts = { observationGrade: 8, xpEvidence: 12, rtAverage: 7.5 };
    expect(preserveAcademicFacts(academic, { state: 'RED_CODE', restrictsGameMechanics: true })).toEqual(academic);
  });
});
