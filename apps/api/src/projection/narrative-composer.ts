import type Database from 'better-sqlite3';
import type { NarrativeEventDto, NarrativeStateDto, ShowStudentDto } from '@eclipse/contracts';
import { getState } from '../narrative/service.js';

export type NarrativeProjectionDto = {
  title: string;
  term: 'T1' | 'T2' | 'T3';
  ordinal: number;
  completedCount: number;
  totalCount: 9;
  completed?: true;
  revealedClues?: string[];
};

export type NarrativeCompositionInput = { groupId: string; academicYearId: string };
export type NarrativeCompositionPorts = {
  readState(input: NarrativeCompositionInput): NarrativeStateDto | Promise<NarrativeStateDto>;
};

function mapEvent(event: NarrativeEventDto, completedCount: number): NarrativeProjectionDto | null {
  if (event.state === 'BLOCKED') return null;
  const base = { title: event.title, term: event.term, ordinal: event.ordinal, completedCount, totalCount: 9 as const };
  if (event.state === 'AVAILABLE') return base;
  return {
    ...base,
    completed: true,
    revealedClues: event.clues.filter(clue => clue.revealed).map(clue => clue.text),
  };
}

/** Selects only the current available event, or the latest completed event when no event is available. */
export async function composeNarrative(input: NarrativeCompositionInput, ports: NarrativeCompositionPorts): Promise<NarrativeProjectionDto | null> {
  const state = await ports.readState(input);
  const event = state.events.find(candidate => candidate.state === 'AVAILABLE')
    ?? [...state.events].reverse().find(candidate => candidate.state === 'COMPLETED');
  return event ? mapEvent(event, state.completedCount) : null;
}

export function createNarrativeCompositionPorts(db: Database.Database, ownerTeacherId: string): NarrativeCompositionPorts {
  return { readState: ({ groupId, academicYearId }) => getState(db, ownerTeacherId, groupId, academicYearId) };
}

export type ProjectionPriorityState = {
  showStudent: ShowStudentDto | null;
  minigame: unknown | null;
  challenge: unknown | null;
  event: unknown | null;
  narrative: NarrativeProjectionDto | null;
};

export function projectionScene(state: ProjectionPriorityState) {
  if (state.showStudent !== null) return 'SHOW_STUDENT' as const;
  if (state.minigame !== null) return 'MINIGAME' as const;
  if (state.challenge !== null) return 'CHALLENGE' as const;
  if (state.event !== null) return 'EVENT' as const;
  if (state.narrative !== null) return 'NARRATIVE' as const;
  return 'IDLE' as const;
}
