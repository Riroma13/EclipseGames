import { describe, expect, it } from 'vitest';
import { narrativeCatalogue } from './catalogue.js';
import { completeNarrativeEvent, deriveNarrativeProgress, deriveNarrativeState } from './domain.js';

const base = (overrides = {}) => ({ completedOrdinals: new Set<number>(), currentTerm: 'T1' as const, startedKeys: new Set<string>(), links: new Map(), ...overrides });

describe('SPEC-0042 narrative catalogue and pure progression', () => {
  it('contains the approved nine events in exact order and content shape', () => {
    expect(narrativeCatalogue).toHaveLength(9);
    expect(narrativeCatalogue.map(event => [event.key, event.title, event.term])).toEqual([
      ['t1_el_apagon', 'El apagón', 'T1'], ['t1_el_mensaje', 'El mensaje', 'T1'], ['t1_eclipse', 'Éclipse', 'T1'],
      ['t2_el_expediente', 'El expediente', 'T2'], ['t2_la_anomalia', 'La anomalía', 'T2'], ['t2_la_reunion', 'La reunión', 'T2'],
      ['t3_la_prueba', 'La prueba', 'T3'], ['t3_el_archivo_eclipse', 'El archivo Éclipse', 'T3'], ['t3_la_llamada', 'La llamada', 'T3'],
    ]);
    expect(narrativeCatalogue.map(event => event.clues.length)).toEqual([2, 3, 2, 3, 3, 2, 2, 3, 2]);
    expect(narrativeCatalogue.map(event => event.mechanic)).toEqual([
      { requirement: 'REQUIRED', kind: 'CHALLENGE' }, { requirement: 'OPTIONAL', kind: 'MINIGAME' }, { requirement: 'NONE', kind: null },
      { requirement: 'OPTIONAL', kind: 'CHALLENGE' }, { requirement: 'REQUIRED', kind: 'MINIGAME' }, { requirement: 'NONE', kind: null },
      { requirement: 'OPTIONAL', kind: 'CHALLENGE' }, { requirement: 'REQUIRED', kind: 'MINIGAME' }, { requirement: 'NONE', kind: null },
    ]);
  });

  it('derives initial availability, predecessor gating, term eligibility, and catch-up', () => {
    expect(deriveNarrativeProgress(base()).map(event => event.state)).toEqual(['AVAILABLE', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'BLOCKED']);
    const t1Done = base({ completedOrdinals: new Set([1]), currentTerm: 'T1' });
    expect(deriveNarrativeState(narrativeCatalogue[1], t1Done)).toBe('AVAILABLE');
    expect(deriveNarrativeState(narrativeCatalogue[3], base({ currentTerm: 'T2', completedOrdinals: new Set([1, 2, 3]) }))).toBe('AVAILABLE');
    expect(deriveNarrativeState(narrativeCatalogue[3], base({ currentTerm: 'T1', completedOrdinals: new Set([1, 2, 3]) }))).toBe('BLOCKED');
  });

  it('allows only teacher-started legal completion and never mutates the input set', () => {
    const progress = base({ startedKeys: new Set(['t1_el_apagon']), links: new Map([['t1_el_apagon', { kind: 'CHALLENGE', terminal: 'COMPLETED' }]]) });
    const completed = completeNarrativeEvent('t1_el_apagon', progress);
    expect([...completed]).toEqual([1]);
    expect(progress.completedOrdinals.size).toBe(0);
    expect(() => completeNarrativeEvent('t1_el_mensaje', progress)).toThrow('AVAILABLE');
  });

  it('rejects illegal mechanic transitions, archived writes, and preserves source-domain silence', () => {
    const none = base({ startedKeys: new Set(['t1_eclipse']), completedOrdinals: new Set([1, 2]) });
    expect(() => completeNarrativeEvent('t1_eclipse', { ...none, links: new Map([['t1_eclipse', { kind: 'CHALLENGE', terminal: 'COMPLETED' }]]) })).toThrow('does not accept');
    expect(() => completeNarrativeEvent('t1_eclipse', { ...none, archived: true })).toThrow('read-only');
    expect(deriveNarrativeState(narrativeCatalogue[0], base({ completedOrdinals: new Set([1]), archived: true }))).toBe('COMPLETED');
    expect(none).not.toHaveProperty('grades');
    expect(none).not.toHaveProperty('xp');
  });
});
