import { narrativeCatalogue } from './catalogue.js';
import { deriveNarrativeState } from './domain.js';
import type { NarrativeEventRow, NarrativeHead } from './repository.js';

export function mapNarrativeState(head: NarrativeHead | null | undefined, rows: NarrativeEventRow[], currentTerm: 'T1' | 'T2' | 'T3', archived = false) {
  const completed = new Set(rows.filter(row => row.completedAt !== null).map(row => row.ordinal));
  const byKey = new Map(rows.map(row => [row.eventKey, row]));
  return {
    revision: head?.revision ?? 0,
    currentTerm,
    completedCount: completed.size,
    archived,
    events: narrativeCatalogue.map(event => {
      const row = byKey.get(event.key);
      const state = deriveNarrativeState(event, { completedOrdinals: completed, currentTerm });
      return { key: event.key, ordinal: event.ordinal, title: event.title, term: event.term, state,
        startedAt: row?.startedAt ?? null, mechanicKind: row?.mechanicKind ?? null, mechanicId: row?.mechanicId ?? null,
        clues: event.clues.map((text, ordinal) => ({ ordinal: ordinal + 1, text, revealed: ordinal < (row?.revealedClueCount ?? 0) })) };
    }),
  };
}
