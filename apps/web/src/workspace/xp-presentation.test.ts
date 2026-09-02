import { describe, expect, it } from 'vitest';
import { disciplineForSpecialty, effectiveXpForAction, presentationForDiscipline } from './xp-presentation';

const baseValues = [1, 2, 3] as const;
const specialtyFamilies = [
  { specialty: 'Leader', discipline: 'COMMUNICATION', glyph: '◒' },
  { specialty: 'Diplomat', discipline: 'COMMUNICATION', glyph: '◒' },
  { specialty: 'Strategist', discipline: 'PRECISION', glyph: '⌖' },
  { specialty: 'Analyst', discipline: 'PRECISION', glyph: '⌖' },
  { specialty: 'Disciplined', discipline: 'CONSISTENCY', glyph: '↗︎' },
  { specialty: 'Perseverant', discipline: 'CONSISTENCY', glyph: '↗︎' },
  { specialty: 'Helper', discipline: 'COLLABORATION', glyph: '∞' },
  { specialty: 'Ally', discipline: 'COLLABORATION', glyph: '∞' },
] as const;

describe('XP presentation', () => {
  it('maps every specialty family to its canonical discipline and falls back for unknown values', () => {
    expect(specialtyFamilies.map(({ specialty }) => disciplineForSpecialty(specialty))).toEqual(specialtyFamilies.map(({ discipline }) => discipline));
    expect(disciplineForSpecialty(null)).toBeNull();
    expect(disciplineForSpecialty('Unknown specialty')).toBeNull();
  });

  it('uses the shared discipline glyph for representative specialties', () => {
    for (const { specialty, discipline, glyph } of specialtyFamilies.filter(({ specialty }) => ['Leader', 'Strategist', 'Disciplined', 'Helper'].includes(specialty))) {
      expect(presentationForDiscipline(disciplineForSpecialty(specialty)!)).toMatchObject({ glyph });
      expect(presentationForDiscipline(discipline).glyph).toBe(glyph);
    }
  });

  it('shows +2, +3, and +4 for a matching specialty discipline', () => {
    expect(baseValues.map(value => effectiveXpForAction(value, 'Leader', 'COMMUNICATION'))).toEqual([2, 3, 4]);
  });

  it('shows +1, +2, and +3 for nonmatching, null, and unknown specialties', () => {
    expect(baseValues.map(value => effectiveXpForAction(value, 'Leader', 'PRECISION'))).toEqual([1, 2, 3]);
    expect(baseValues.map(value => effectiveXpForAction(value, null, 'COMMUNICATION'))).toEqual([1, 2, 3]);
    expect(baseValues.map(value => effectiveXpForAction(value, 'Unknown specialty', 'COMMUNICATION'))).toEqual([1, 2, 3]);
  });
});
