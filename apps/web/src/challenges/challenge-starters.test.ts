import { describe, expect, it } from 'vitest';
import { challengeDraftForStarter, challengeStarters } from './challenge-starters';

describe('challenge starters', () => {
  it('prefills the French Only starter without persisting a template', () => {
    expect(challengeDraftForStarter('french-only')).toEqual({
      title: 'French Only',
      description: 'Reach 20 spontaneous French contributions.',
      target: 20,
      showOnProjection: true,
    });
  });

  it('prefills Class Participation with its normal creation values', () => {
    expect(challengeDraftForStarter('class-participation')).toEqual({
      title: 'Class Participation',
      description: 'Reach 15 successful class contributions.',
      target: 15,
      showOnProjection: true,
    });
  });

  it('keeps Custom blank and exposes only hardcoded choices', () => {
    expect(challengeDraftForStarter('custom')).toEqual({ title: '', description: '', target: '', showOnProjection: true });
    expect(challengeStarters.map(starter => starter.id)).toEqual(['french-only', 'class-participation', 'custom']);
  });
});
