import { narrativeCatalogue, type MechanicKind, type NarrativeCatalogueEvent, type NarrativeTerm } from './catalogue.js';

export type NarrativeState = 'BLOCKED' | 'AVAILABLE' | 'COMPLETED';
export type LinkedMechanic = { kind: MechanicKind; terminal: 'COMPLETED' | 'ENDED' };
export type NarrativeProgress = {
  completedOrdinals: ReadonlySet<number>;
  startedKeys?: ReadonlySet<string>;
  links?: ReadonlyMap<string, LinkedMechanic>;
  currentTerm: NarrativeTerm;
  archived?: boolean;
};

const termRank: Record<NarrativeTerm, number> = { T1: 1, T2: 2, T3: 3 };

export function deriveNarrativeState(event: NarrativeCatalogueEvent, progress: NarrativeProgress): NarrativeState {
  if (progress.completedOrdinals.has(event.ordinal)) return 'COMPLETED';
  const predecessorsComplete = event.ordinal === 1 || progress.completedOrdinals.has(event.ordinal - 1);
  return predecessorsComplete && termRank[progress.currentTerm] >= termRank[event.term] ? 'AVAILABLE' : 'BLOCKED';
}

export function deriveNarrativeProgress(progress: NarrativeProgress) {
  return narrativeCatalogue.map(event => ({ ...event, state: deriveNarrativeState(event, progress) }));
}

function fail(message: string): never { throw new Error(message); }

export function assertCanComplete(event: NarrativeCatalogueEvent, progress: NarrativeProgress): void {
  if (progress.archived) fail('Archived narrative progress is read-only.');
  if (deriveNarrativeState(event, progress) !== 'AVAILABLE') fail('Only an AVAILABLE event can be completed.');
  if (!progress.startedKeys?.has(event.key)) fail('The event must be started before completion.');
  const link = progress.links?.get(event.key);
  if (event.mechanic.requirement === 'NONE' && link) fail('This event does not accept a mechanic link.');
  if (event.mechanic.requirement === 'REQUIRED' && (!link || link.kind !== event.mechanic.kind || link.terminal !== (event.mechanic.kind === 'CHALLENGE' ? 'COMPLETED' : 'ENDED'))) fail('The required mechanic must reach its terminal state first.');
  if (event.mechanic.requirement === 'OPTIONAL' && link && (link.kind !== event.mechanic.kind || link.terminal !== (event.mechanic.kind === 'CHALLENGE' ? 'COMPLETED' : 'ENDED'))) fail('The linked optional mechanic must reach its terminal state first.');
}

export function completeNarrativeEvent(key: string, progress: NarrativeProgress): ReadonlySet<number> {
  const event = narrativeCatalogue.find(candidate => candidate.key === key);
  if (!event) fail('Unknown narrative event.');
  assertCanComplete(event, progress);
  return new Set([...progress.completedOrdinals, event.ordinal]);
}

export function isNarrativeState(value: string): value is NarrativeState {
  return value === 'BLOCKED' || value === 'AVAILABLE' || value === 'COMPLETED';
}
