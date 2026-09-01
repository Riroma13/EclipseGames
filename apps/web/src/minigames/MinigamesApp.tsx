import { useEffect, useState } from 'react';
import { TeacherGate } from '../auth/TeacherGate';
import { gameApi, type MinigameSession } from '../game/game-api';
import { TeacherContextBar, useTeacherContext } from '../app/teacher-context';
import { WorkspaceShell } from '../workspace/WorkspaceShell';

const secondsLabel = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`;

function pageLink(context: ReturnType<typeof useTeacherContext>) {
  const params = new URLSearchParams();
  if (context.yearId) params.set('year', context.yearId);
  if (context.groupId) params.set('group', context.groupId);
  return `/#/minigames${params.toString() ? `?${params}` : ''}`;
}

function RandomDrawLaunch({ busy, onLaunch }: { busy: boolean; onLaunch: (title: string) => void }) {
  const [title, setTitle] = useState('');
  return <article className="minigame-option"><div className="minigame-option-heading"><span className="content-sigil game-sigil" aria-hidden="true">⊕</span><div><p className="eyebrow">MINIGAME 01</p><h2>Random Student Draw</h2></div></div><p>Choose the next participant without breaking the rhythm of the lesson.</p><label htmlFor="draw-title">Activity title<span className="optional-label">optional</span><input id="draw-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Random Student Draw" /></label><button type="button" disabled={busy} onClick={() => onLaunch(title)}>Launch Random Draw</button></article>;
}

function SprintLaunch({ busy, onLaunch }: { busy: boolean; onLaunch: (value: { title: string; prompt: string; durationSeconds: number }) => void }) {
  const [title, setTitle] = useState('French Sprint');
  const [prompt, setPrompt] = useState('Describe your weekend only in French.');
  const [durationSeconds, setDurationSeconds] = useState(30);
  return <article className="minigame-option"><div className="minigame-option-heading"><span className="content-sigil sprint-sigil" aria-hidden="true">◷</span><div><p className="eyebrow">MINIGAME 02</p><h2>French Sprint</h2></div></div><p>Set a prompt and give the room a short, focused burst of French.</p><label htmlFor="sprint-title">Title<input id="sprint-title" value={title} onChange={event => setTitle(event.target.value)} /></label><label htmlFor="sprint-prompt">Prompt<textarea id="sprint-prompt" maxLength={500} value={prompt} onChange={event => setPrompt(event.target.value)} /></label><label htmlFor="sprint-duration">Duration<select id="sprint-duration" value={durationSeconds} onChange={event => setDurationSeconds(Number(event.target.value))}><option value="30">30 seconds</option><option value="60">60 seconds</option><option value="90">90 seconds</option><option value="120">2 minutes</option></select></label><button type="button" disabled={busy || !title.trim() || !prompt.trim()} onClick={() => onLaunch({ title, prompt, durationSeconds })}>Launch French Sprint</button></article>;
}

function ActiveRandomDraw({ session, busy, onDraw, onReset, onEnd }: { session: MinigameSession; busy: boolean; onDraw: () => void; onReset: () => void; onEnd: () => void }) {
  return <article className="active-minigame-card"><div className="active-minigame-heading"><div><p className="eyebrow">LIVE MINIGAME · RANDOM DRAW</p><h2>{session.title}</h2></div><span className="status-chip status-active">ready</span></div><p className="minigame-prompt">{session.prompt}</p><div className="draw-result" aria-live="polite">{session.selectedStudent ? <><span className="result-kicker">Next participant</span><strong>{session.selectedStudent.realName}</strong><span>{session.selectedStudent.alias}{session.selectedStudent.specialty ? ` · ${session.selectedStudent.specialty}` : ''}</span></> : <><span className="result-kicker">Ready when you are</span><strong>Draw the next voice</strong><span>Everyone cycles once before a repeat.</span></>}</div><div className="minigame-controls"><button type="button" disabled={busy} onClick={onDraw}>{session.selectedStudent ? 'Draw again' : 'Draw student'}</button><button type="button" className="secondary-action" disabled={busy} onClick={onReset}>Reset cycle</button><button type="button" className="quiet-action" disabled={busy} onClick={onEnd}>End game</button></div><div className="draw-count">{session.drawCount} of {session.drawTotal} students drawn this cycle</div></article>;
}

function ActiveSprint({ session, remainingSeconds, busy, onStart, onPause, onReset, onEnd }: { session: MinigameSession; remainingSeconds: number; busy: boolean; onStart: () => void; onPause: () => void; onReset: () => void; onEnd: () => void }) {
  return <article className="active-minigame-card sprint-live-card"><div className="active-minigame-heading"><div><p className="eyebrow">LIVE MINIGAME · FRENCH SPRINT</p><h2>{session.title}</h2></div><span className={`status-chip status-${session.status.toLowerCase()}`}>{session.status.toLowerCase()}</span></div><p className="minigame-prompt">{session.prompt}</p><div className={`sprint-timer${session.status === 'RUNNING' ? ' is-running' : ''}`} aria-label={`${remainingSeconds} seconds remaining`}>{secondsLabel(remainingSeconds)}</div><div className="minigame-controls">{session.status === 'RUNNING' ? <button type="button" disabled={busy} onClick={onPause}>Pause</button> : <button type="button" disabled={busy || remainingSeconds === 0} onClick={onStart}>{session.status === 'PAUSED' ? 'Resume' : 'Start'}</button>}<button type="button" className="secondary-action" disabled={busy} onClick={onReset}>Reset</button><button type="button" className="quiet-action" disabled={busy} onClick={onEnd}>End game</button></div></article>;
}

function MinigamesPage() {
  const context = useTeacherContext();
  const [session, setSession] = useState<MinigameSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    if (!context.groupId) { setSession(null); return; }
    let cancelled = false;
    setLoading(true);
    gameApi.currentMinigame(context.groupId).then(value => { if (!cancelled) { setSession(value); setError(''); } }).catch(() => { if (!cancelled) setError('Could not load the current minigame.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [context.groupId, context.revision]);

  useEffect(() => {
    if (session?.status !== 'RUNNING') return;
    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [session?.status, session?.startedAt]);

  const remainingSeconds = session?.status === 'RUNNING' && session.startedAt ? Math.max(0, session.remainingSeconds - Math.floor((clock - Date.parse(session.startedAt)) / 1000)) : session?.remainingSeconds ?? 0;

  async function launch(action: () => Promise<MinigameSession>, message: string) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { setSession(await action()); setNotice(message); } catch (caught) { setError((caught as Error).message || 'Could not launch the minigame.'); } finally { setBusy(false); }
  }

  async function sessionAction(action: () => Promise<MinigameSession>, message: string, ended = false) {
    if (busy || !session) return;
    setBusy(true); setError(''); setNotice('');
    try { const value = await action(); setSession(ended ? null : value); setNotice(message); } catch (caught) { setError((caught as Error).message || 'Could not update the minigame.'); } finally { setBusy(false); }
  }

  const projection = context.groupId ? `/#/projection?group=${encodeURIComponent(context.groupId)}` : '/#/projection';
  return <WorkspaceShell activeRoute="minigames">
    <header className="product-page-header"><div><p className="eyebrow">ACADEMY ACTIVITIES</p><h1>Minigames</h1><p className="page-lede">Choose a small, useful spark for the room. Nothing to configure twice.</p></div><div className="page-header-actions"><a className="action-link secondary-action" href={projection}>Open Classroom Preview</a></div></header>
    <TeacherContextBar context={context} eyebrow="Minigame classroom" />
    {notice && <p className="game-notice" role="status">{notice}</p>}{error && <p className="game-error" role="alert">{error}</p>}
    {loading ? <p className="game-loading" role="status">Preparing the activity desk…</p> : !context.groupId ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">⊕</span><h2>Choose a classroom</h2><p>Select a group above before launching a minigame.</p></div> : session?.kind === 'RANDOM_DRAW' ? <ActiveRandomDraw session={session} busy={busy} onDraw={() => sessionAction(() => gameApi.drawStudent(session.id), 'Student drawn.')} onReset={() => sessionAction(() => gameApi.resetMinigame(session.id), 'Draw cycle reset.')} onEnd={() => sessionAction(() => gameApi.endMinigame(session.id), 'Minigame ended.', true)} /> : session ? <ActiveSprint session={session} remainingSeconds={remainingSeconds} busy={busy} onStart={() => sessionAction(() => session.status === 'PAUSED' ? gameApi.resumeMinigame(session.id) : gameApi.startMinigame(session.id), session.status === 'PAUSED' ? 'French Sprint resumed.' : 'French Sprint started.')} onPause={() => sessionAction(() => gameApi.pauseMinigame(session.id), 'French Sprint paused.')} onReset={() => sessionAction(() => gameApi.resetMinigame(session.id), 'French Sprint reset.')} onEnd={() => sessionAction(() => gameApi.endMinigame(session.id), 'Minigame ended.', true)} /> : <><section className="minigame-intro"><p className="eyebrow">CHOOSE YOUR NEXT MOVE</p><h2>Quick classroom activities</h2><p>Launch a ready-to-play activity for this group. The latest session stays available if you reload the page.</p></section><div className="minigame-options"><RandomDrawLaunch busy={busy} onLaunch={title => launch(() => gameApi.launchRandomDraw(context.groupId!, title.trim() || undefined), 'Random Student Draw launched.')} /><SprintLaunch busy={busy} onLaunch={value => launch(() => gameApi.launchFrenchSprint(context.groupId!, value), 'French Sprint launched.')} /></div></>}
  </WorkspaceShell>;
}

export function MinigamesApp() { return <TeacherGate activeRoute="minigames"><MinigamesPage /></TeacherGate>; }
