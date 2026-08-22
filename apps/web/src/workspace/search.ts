export type SearchableStudent = Readonly<{ realName: string; alias: string }>;

export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

export function filterStudents<T extends SearchableStudent>(students: readonly T[], query: string): T[] {
  const tokens = normalizeSearch(query).split(' ').filter(Boolean);
  if (!tokens.length) return [...students];
  return students.filter((student) => {
    const haystack = `${normalizeSearch(student.realName)} ${normalizeSearch(student.alias)}`;
    return tokens.every((token) => haystack.includes(token));
  });
}
