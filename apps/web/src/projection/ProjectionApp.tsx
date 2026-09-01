import { useEffect, useState } from 'react';
import { gameApi, type ProjectionDisplay } from '../game/game-api';

const defaultGroupId = '9b6f3b9e-3d0f-4b1e-9b1e-202620270002';

function groupFromUrl() {
  const source = window.location.hash.split('?')[1] ?? window.location.search;
  return new URLSearchParams(source).get('group') || defaultGroupId;
}

function formatSeconds(seconds: number) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`; }
function percent(value: number, target: number) { return target ? Math.min(100, Math.max(0, value / target * 100)) : 0; }

function ProjectionSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/auth/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
    if (!response.ok) { setError('Sign-in failed. Check your credentials.'); return; }
    onSignedIn();
  }
  return <main className="projection-screen projection-auth"><div className="projection-auth-card"><div className="projection-brand"><span className="display-eclipse-mark" aria-hidden="true"><span /></span><span><strong>EclipseGames</strong><small>Classroom Display</small></span></div><h1>Open Classroom Preview</h1><p>Sign in to put the classroom display on screen.</p><form onSubmit={submit}><label htmlFor="projection-email">Email</label><input id="projection-email" name="email" type="email" autoComplete="username" required /><label htmlFor="projection-password">Password</label><input id="projection-password" name="password" type="password" autoComplete="current-password" required /><button type="submit">Open display</button>{error && <p className="projection-error" role="alert">{error}</p>}</form></div></main>;
}

function ProjectionContent({ display }: { display: ProjectionDisplay }) {
  if (display.minigame) {
    const minigame = display.minigame;
    return <section className="display-hero minigame-display" aria-live="polite"><p className="display-kicker">{minigame.kind === 'FRENCH_SPRINT' ? 'FRENCH SPRINT' : 'RANDOM STUDENT DRAW'}</p><h2>{minigame.title}</h2>{minigame.kind === 'FRENCH_SPRINT' ? <><p className="display-prompt">{minigame.prompt}</p><div className={`display-timer${minigame.status === 'RUNNING' ? ' is-running' : ''}`}>{formatSeconds(minigame.remainingSeconds)}</div><span className="display-status">{minigame.status === 'RUNNING' ? 'In progress' : minigame.status.toLowerCase()}</span></> : <><p className="display-prompt">{minigame.prompt}</p><div className="draw-spotlight">{minigame.selectedAlias ? <><span>Next participant</span><strong>{minigame.selectedAlias}</strong></> : <strong>Ready for the next voice</strong>}</div></>}</section>;
  }
  if (display.activeChallenge) {
    const challenge = display.activeChallenge;
    return <section className={`display-hero challenge-display${challenge.status === 'COMPLETED' ? ' is-complete' : ''}`} aria-live="polite"><p className="display-kicker">CLASS CHALLENGE</p><h2>{challenge.title}</h2><p className="display-prompt">{challenge.description}</p><div className="display-challenge-progress"><div><strong>{challenge.progress} / {challenge.target}</strong><span>{challenge.status === 'COMPLETED' ? 'Objective complete' : 'class contributions'}</span></div><div className="display-progress-track" role="progressbar" aria-label="Class challenge progress" aria-valuemin={0} aria-valuemax={challenge.target} aria-valuenow={challenge.progress}><span style={{ width: `${percent(challenge.progress, challenge.target)}%` }} /></div></div></section>;
  }
  if (display.activeEvent) return <section className="display-hero event-display" aria-live="polite"><p className="display-kicker">ACTIVE EVENT · {display.activeEvent.theme}</p><h2>{display.activeEvent.title}</h2><p className="display-prompt">{display.activeEvent.description || 'The next classroom moment is ready.'}</p><span className="display-seal" aria-hidden="true">◈</span></section>;
  return <section className="display-idle"><p className="display-kicker">CLASSROOM READY</p><h2>The room is ready for its next chapter.</h2><p>Choose an event, challenge, or quick activity from the Game Master desk.</p><div className="display-student-grid" aria-label="Classroom roster">{display.students.map(student => <article className="display-student" key={student.alias}><span className="display-avatar" aria-hidden="true">{student.alias.slice(0, 2).toUpperCase()}</span><div><strong>{student.alias}</strong><span>{student.specialty ?? 'Academy member'} · Level {student.xpLevel}</span>{student.unlockedBadge && <small>◇ {student.unlockedBadge}</small>}</div></article>)}</div></section>;
}

function ProjectionView() {
  const [display, setDisplay] = useState<ProjectionDisplay | null>(null);
  const [auth, setAuth] = useState<'checking' | 'signed-out' | 'ready'>('checking');
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const groupId = groupFromUrl();

  useEffect(() => {
    let cancelled = false;
    const read = () => gameApi.projectionDisplay(groupId).then(value => { if (!cancelled) { setDisplay(value); setAuth('ready'); setError(''); } }).catch((caught: any) => { if (cancelled) return; if (caught.status === 401) setAuth('signed-out'); else { setAuth('ready'); setError('Classroom display is unavailable.'); } });
    read();
    const interval = window.setInterval(read, 2_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [groupId]);

  useEffect(() => {
    if (display?.minigame?.status !== 'RUNNING') return;
    const interval = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [display?.minigame?.status, display?.minigame?.startedAt]);

  if (auth === 'checking') return <main className="projection-screen"><p className="projection-loading">Opening Classroom Display…</p></main>;
  if (auth === 'signed-out') return <ProjectionSignIn onSignedIn={() => window.location.reload()} />;
  if (!display) return <main className="projection-screen"><p className="projection-loading" role="alert">{error || 'Classroom display is unavailable.'}</p></main>;
  const currentDisplay = display.minigame?.status === 'RUNNING' && display.minigame.startedAt ? { ...display, minigame: { ...display.minigame, remainingSeconds: Math.max(0, display.minigame.remainingSeconds - Math.floor((clock - Date.parse(display.minigame.startedAt)) / 1000)) } } : display;
  return <main className="projection-screen"><header className="display-header"><div className="projection-brand"><span className="display-eclipse-mark" aria-hidden="true"><span /></span><span><strong>EclipseGames</strong><small>Classroom Display</small></span></div><div className="display-context"><span className="display-kicker">CLASSROOM MODE</span><strong>{display.group.name}</strong></div><span className="display-live"><span aria-hidden="true" />LIVE</span></header>{error && <p className="projection-error" role="alert">{error}</p>}<ProjectionContent display={currentDisplay} /><footer className="display-footer"><span>Academy Chronicle</span><span>Game Master display</span></footer></main>;
}

export function ProjectionApp() { return <ProjectionView />; }
