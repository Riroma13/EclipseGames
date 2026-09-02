export const challengeStarters = [
  { id: 'french-only', title: 'French Only', description: 'Reach 20 spontaneous French contributions.', target: 20 },
  { id: 'class-participation', title: 'Class Participation', description: 'Reach 15 successful class contributions.', target: 15 },
  { id: 'custom', title: 'Custom', description: '', target: null },
] as const;

export type ChallengeStarterId = (typeof challengeStarters)[number]['id'];
export type ChallengeStarterDraft = { title: string; description: string; target: number | ''; showOnProjection: boolean };

export function challengeDraftForStarter(id: ChallengeStarterId): ChallengeStarterDraft {
  const starter = challengeStarters.find(value => value.id === id)!;
  return {
    title: starter.id === 'custom' ? '' : starter.title,
    description: starter.description,
    target: starter.target ?? '',
    showOnProjection: true,
  };
}
