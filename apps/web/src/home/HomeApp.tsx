import { useEffect, useState } from 'react';
import { TeacherGate } from '../auth/TeacherGate';
import { gameApi, type ClassroomChallenge, type ClassroomEvent, type MinigameSession } from '../game/game-api';
import { useTeacherContext, TeacherContextBar } from '../app/teacher-context';
import { workspaceApi } from '../workspace/workspace-api';
import { WorkspaceShell } from '../workspace/WorkspaceShell';

function routeLink(route: string, context: ReturnType<typeof useTeacherContext>) {
  const params = new URLSearchParams();
  if (context.yearId) params.set('year', context.yearId);
  if (context.groupId) params.set('group', context.groupId);
  const base = route === 'home' ? '/#/' : `/#/${route}`;
  return `${base}${params.toString() ? `?${params}` : ''}`;
}

function progressPercent(progress: number, target: number) { return target ? Math.min(100, Math.max(0, (progress / target) * 100)) : 0; }

function HomePage() {
  const context = useTeacherContext();
  const [events, setEvents] = useState<ClassroomEvent[]>([]);
  const [challenges, setChallenges] = useState<ClassroomChallenge[]>([]);
  const [minigame, setMinigame] = useState<MinigameSession | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!context.groupId) { setEvents([]); setChallenges([]); setMinigame(null); setStudentCount(0); return; }
    let cancelled = false;
    setLoadingData(true);
    Promise.all([gameApi.events(context.groupId), gameApi.challenges(context.groupId), gameApi.currentMinigame(context.groupId), workspaceApi.students(context.groupId, false)]).then(([loadedEvents, loadedChallenges, loadedMinigame, students]) => {
      if (cancelled) return;
      setEvents(loadedEvents);
      setChallenges(loadedChallenges);
      setMinigame(loadedMinigame);
      setStudentCount(students.length);
      setError('');
    }).catch(() => { if (!cancelled) setError('Could not load the current classroom board.'); }).finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, [context.groupId, context.revision]);

  const activeEvent = events.find(event => event.status === 'ACTIVE') ?? null;
  const activeChallenge = challenges.find(challenge => challenge.status === 'ACTIVE') ?? null;
  const draftCount = events.filter(event => event.status === 'DRAFT').length + challenges.filter(challenge => challenge.status === 'DRAFT').length;

  return <WorkspaceShell activeRoute="home">
    <header className="product-page-header home-header">
      <div><p className="eyebrow">GAME MASTER CONSOLE</p><h1>Home / Command Center</h1><p className="page-lede">Prepare the next classroom moment, then step into the room when it is time.</p></div>
      <div className="page-header-actions"><a className="action-link primary-action" href={routeLink('workspace', context)}>Enter Classroom</a><a className="action-link secondary-action" href={routeLink('projection', context)}>Open Classroom Preview</a></div>
    </header>
    <TeacherContextBar context={context} eyebrow="Current classroom" />
    {context.error && <p className="game-error" role="alert">{context.error}</p>}
    {error && <p className="game-error" role="alert">{error} <button type="button" onClick={context.refresh}>Retry</button></p>}
    <section className="home-launch-grid" aria-label="Game Master launchpad">
      <article className="launch-card launch-card-primary"><div><p className="eyebrow">THE TEACHER'S DESK</p><h2>{context.group?.name ?? 'Choose a classroom'}</h2><p>{context.group ? 'Your live roster, rewards, and classroom play are ready from one place.' : 'Select a class above, or use Classroom Setup to create your first one.'}</p></div><a className="text-link" href={routeLink('workspace', context)}>Open live roster <span aria-hidden="true">→</span></a></article>
      <article className="launch-card quick-launch"><div className="section-heading"><div><p className="eyebrow">QUICK LAUNCH</p><h2>Start something useful</h2></div><span className="launch-mark" aria-hidden="true">✦</span></div><div className="launch-actions"><a href={routeLink('events', context)}><span className="launch-glyph" aria-hidden="true">◇</span><span><strong>New Event</strong><small>Set a classroom moment</small></span><span aria-hidden="true">→</span></a><a href={`${routeLink('challenges', context)}${routeLink('challenges', context).includes('?') ? '&new=1' : '?new=1'}`}><span className="launch-glyph" aria-hidden="true">✦</span><span><strong>New Challenge</strong><small>Set a collective goal</small></span><span aria-hidden="true">→</span></a><a href={routeLink('minigames', context)}><span className="launch-glyph" aria-hidden="true">⊕</span><span><strong>Launch Minigame</strong><small>Choose a quick activity</small></span><span aria-hidden="true">→</span></a></div></article>
    </section>
    <section className="active-stage" aria-labelledby="active-now-title">
      <div className="section-heading"><div><p className="eyebrow">THE BOARD</p><h2 id="active-now-title">Active now</h2></div><span className="section-note">{loadingData ? 'Refreshing…' : draftCount ? `${draftCount} drafts ready` : 'Live classroom state'}</span></div>
      <div className="active-grid">
        <article className={`active-card${activeEvent ? ' has-content' : ''}`}><div className="active-card-heading"><span className="content-sigil event-sigil" aria-hidden="true">◇</span><div><p className="eyebrow">ACTIVE EVENT</p><h3>{activeEvent?.title ?? 'No active event'}</h3></div></div>{activeEvent ? <><p>{activeEvent.description || 'A classroom moment is ready to lead.'}</p><span className="status-chip">{activeEvent.theme.toLowerCase()}</span></> : <><p>Create a mission, narrative moment, or special activity for the class.</p><a className="text-link" href={`${routeLink('events', context)}${routeLink('events', context).includes('?') ? '&new=1' : '?new=1'}`}>Create event <span aria-hidden="true">→</span></a></>}</article>
        <article className={`active-card challenge-card${activeChallenge ? ' has-content' : ''}`}><div className="active-card-heading"><span className="content-sigil challenge-sigil" aria-hidden="true">✦</span><div><p className="eyebrow">ACTIVE CHALLENGE</p><h3>{activeChallenge?.title ?? 'No active challenge'}</h3></div></div>{activeChallenge ? <><p>{activeChallenge.description}</p><div className="home-progress"><div><strong>{activeChallenge.progress} / {activeChallenge.target}</strong><span>class contributions</span></div><div className="progress-track"><span style={{ width: `${progressPercent(activeChallenge.progress, activeChallenge.target)}%` }} /></div></div></> : <><p>Set one collective objective that the class can see and build together.</p><a className="text-link" href={`${routeLink('challenges', context)}${routeLink('challenges', context).includes('?') ? '&new=1' : '?new=1'}`}>Create challenge <span aria-hidden="true">→</span></a></>}</article>
        <article className={`active-card${minigame ? ' has-content minigame-card' : ''}`}><div className="active-card-heading"><span className="content-sigil game-sigil" aria-hidden="true">⊕</span><div><p className="eyebrow">MINIGAME</p><h3>{minigame ? minigame.title : 'No minigame running'}</h3></div></div>{minigame ? <><p>{minigame.prompt || 'A quick classroom activity is ready.'}</p><span className="status-chip">{minigame.status.toLowerCase()}</span></> : <><p>Choose a quick activity when the room needs a spark.</p><a className="text-link" href={routeLink('minigames', context)}>Choose minigame <span aria-hidden="true">→</span></a></>}</article>
      </div>
    </section>
    <section className="class-snapshot" aria-label="Class snapshot"><div><p className="eyebrow">CLASS SNAPSHOT</p><h2>{context.group?.name ?? 'No classroom selected'}</h2></div><div className="snapshot-value"><strong>{studentCount}</strong><span>students</span></div><a className="text-link" href={routeLink('workspace', context)}>Manage classroom <span aria-hidden="true">→</span></a></section>
  </WorkspaceShell>;
}

export function HomeApp() { return <TeacherGate activeRoute="home"><HomePage /></TeacherGate>; }
