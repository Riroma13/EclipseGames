import { describe, expect, it } from 'vitest';
import { filterStudents, normalizeSearch } from './search';

describe('workspace search', () => {
  const students = [{ realName: 'Élodie Martin', alias: 'Lili' }, { realName: 'Ada Lovelace', alias: 'Calculus' }, { realName: 'Marc Du Pont', alias: 'M' }];
  it('normalizes case, accents, and whitespace', () => expect(normalizeSearch('  ÉLODIE   MARTIN ')).toBe('elodie martin'));
  it('matches every token across name and alias while preserving API order', () => {
    expect(filterStudents(students, 'lili elodie')).toEqual([students[0]]);
    expect(filterStudents(students, 'ada')).toEqual([students[1]]);
    expect(filterStudents(students, '')).toEqual(students);
  });

  it('matches diacritic-insensitive token substrings and returns an empty result for no match', () => {
    expect(filterStudents(students, 'DU pont')).toEqual([students[2]]);
    expect(filterStudents(students, 'lod mar')).toEqual([students[0]]);
    expect(filterStudents(students, 'does-not-exist')).toEqual([]);
  });

  it('collapses repeated whitespace and treats a whitespace-only query as the API order', () => {
    expect(normalizeSearch('\t ADA   LOVELACE\n')).toBe('ada lovelace');
    expect(filterStudents(students, '   ')).toEqual(students);
  });
});
