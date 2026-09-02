import type { ProjectionControl } from '../game/game-api';

export type TeacherDisplayStatus = {
  state: 'live' | 'idle' | 'unavailable';
  label: 'LIVE' | 'Idle' | 'Unavailable';
  title: string;
  detail: string;
};

export function isCurrentDisplay(control: ProjectionControl | null, scene: ProjectionControl['scene'], resourceId: string | null | undefined) {
  return Boolean(resourceId && control?.scene === scene && control.resourceId === resourceId);
}

export function formatDisplaySeconds(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`;
}

export function displayStatus(control: ProjectionControl | null): TeacherDisplayStatus {
  if (!control) return { state: 'unavailable', label: 'Unavailable', title: 'Display status unavailable', detail: 'Try again in a moment.' };
  if (control.scene === 'MINIGAME' && control.display.minigame) {
    const minigame = control.display.minigame;
    const label = { RANDOM_DRAW: 'Random Draw', FRENCH_SPRINT: 'French Sprint', TEAM_DRAW: 'Team Draw', PROMPT_DECK: 'Prompt Deck' }[minigame.kind];
    const timer = minigame.kind === 'FRENCH_SPRINT' ? ` · ${formatDisplaySeconds(minigame.remainingSeconds)}` : '';
    return { state: 'live', label: 'LIVE', title: minigame.title, detail: `${label}${timer}` };
  }
  if (control.scene === 'CHALLENGE' && control.display.activeChallenge) {
    const challenge = control.display.activeChallenge;
    return { state: 'live', label: 'LIVE', title: challenge.title, detail: `Challenge · ${challenge.progress} / ${challenge.target} contributions` };
  }
  if (control.scene === 'EVENT' && control.display.activeEvent) {
    return { state: 'live', label: 'LIVE', title: control.display.activeEvent.title, detail: 'Event on Classroom Preview' };
  }
  return { state: 'idle', label: 'Idle', title: 'Nothing currently displayed', detail: 'Classroom Preview is idle.' };
}
