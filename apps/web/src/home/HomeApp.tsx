import { useEffect, useState } from 'react';
import { TeacherGate } from '../auth/TeacherGate';
import { gameApi, type ClassroomChallenge, type ClassroomEvent, type MinigamePreset, type MinigameSession, type ProjectionControl, type PromptDeck } from '../game/game-api';
import { isCurrentDisplay } from '../app/display-status';
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
function newRoute(route: string, context: ReturnType<typeof useTeacherContext>) { const base = routeLink(route, context); return `${base}${base.includes('?') ? '&' : '?'}new=1`; }

function OnDisplayMarker() { return <span className="display-marker"><span aria-hidden="true" />ON DISPLAY</span>; }

function HomePage() {
  const context = useTeacherContext();
  const [events, setEvents] = useState<ClassroomEvent[]>([]);
  const [challenges, setChallenges] = useState<ClassroomChallenge[]>([]);
  const [minigame, setMinigame] = useState<MinigameSession | null>(null);
  const [presets, setPresets] = useState<MinigamePreset[]>([]);
  const [decks, setDecks] = useState<PromptDeck[]>([]);
  const [loadedDisplay, setLoadedDisplay] = useState<{ key: string; value: ProjectionControl } | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [loadedContextKey, setLoadedContextKey] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const groupId = context.groupId;
    if (!groupId) { setEvents([]); setChallenges([]); setMinigame(null); setStudentCount(0); setLoadedContextKey(null); setLoadingData(false); return; }
    const requestKey = `${context.yearId ?? ''}:${groupId}:${context.revision}`;
    let cancelled = false;
    setLoadingData(true);
    setLoadedContextKey(null);
    setEvents([]);
    setChallenges([]);
    setMinigame(null);
    setStudentCount(0);
    setError('');
    Promise.all([gameApi.events(groupId), gameApi.challenges(groupId), gameApi.currentMinigame(groupId), workspaceApi.students(groupId, false)]).then(([loadedEvents, loadedChallenges, loadedMinigame, students]) => {
      if (cancelled) return;
      setEvents(loadedEvents);
      setChallenges(loadedChallenges);
      setMinigame(loadedMinigame);
      setStudentCount(students.length);
      setLoadedContextKey(requestKey);
      setError('');
    }).catch(() => { if (!cancelled) { setEvents([]); setChallenges([]); setMinigame(null); setStudentCount(0); setLoadedContextKey(null); setError('Could not load the current classroom board.'); } }).finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, [context.groupId, context.yearId, context.revision]);

  useEffect(() => {
    const groupId = context.groupId;
    if (!groupId) { setLoadedDisplay(null); return; }
    const requestKey = `${context.yearId ?? ''}:${groupId}:${context.revision}`;
    let cancelled = false;
    setLoadedDisplay(null);
    gameApi.projectionControl(groupId).then(value => { if (!cancelled) setLoadedDisplay({ key: requestKey, value }); }).catch(() => { if (!cancelled) setLoadedDisplay(null); });
    return () => { cancelled = true; };
  }, [context.groupId, context.yearId, context.revision]);

  useEffect(() => {
    let cancelled = false;
    gameApi.minigamePresets().then(value => { if (!cancelled) setPresets(value); }).catch(() => { if (!cancelled) setPresets([]); });
    return () => { cancelled = true; };
  }, [context.revision]);

  useEffect(() => {
    let cancelled = false;
    gameApi.promptDecks().then(value => { if (!cancelled) setDecks(value); }).catch(() => { if (!cancelled) setDecks([]); });
    return () => { cancelled = true; };
  }, [context.revision]);

  const currentContextKey = context.groupId ? `${context.yearId ?? ''}:${context.groupId}:${context.revision}` : null;
  const boardReady = loadedContextKey !== null && loadedContextKey === currentContextKey;
  const visibleEvents = boardReady ? events : [];
  const visibleChallenges = boardReady ? challenges : [];
  const visibleMinigame = boardReady ? minigame : null;
  const display = loadedDisplay?.key === currentContextKey ? loadedDisplay.value : null;
  const activeEvent = visibleEvents.find(event => event.status === 'ACTIVE') ?? null;
  const activeChallenge = visibleChallenges.find(challenge => challenge.status === 'ACTIVE') ?? null;
  const draftCount = visibleEvents.filter(event => event.status === 'DRAFT').length + visibleChallenges.filter(challenge => challenge.status === 'DRAFT').length;
  const preparedEventCount = visibleEvents.filter(event => event.status === 'DRAFT').length;
  const preparedChallengeCount = visibleChallenges.filter(challenge => challenge.status === 'DRAFT').length;
  const preparedEvents = visibleEvents.filter(event => event.status === 'DRAFT').slice(0, 3);
  const preparedChallenges = visibleChallenges.filter(challenge => challenge.status === 'DRAFT').slice(0, 3);
  const preparedEventsMore = preparedEventCount - preparedEvents.length;
  const preparedChallengesMore = preparedChallengeCount - preparedChallenges.length;
  const preparedCount = preparedEventCount + preparedChallengeCount + presets.length + decks.length;
  const eventOnDisplay = isCurrentDisplay(display, 'EVENT', activeEvent?.id);
  const challengeOnDisplay = isCurrentDisplay(display, 'CHALLENGE', activeChallenge?.id);
  const minigameOnDisplay = isCurrentDisplay(display, 'MINIGAME', visibleMinigame?.id);

  return <WorkspaceShell activeRoute="home">
    <header className="product-page-header home-header">
      <div><p className="eyebrow">GAME MASTER CONSOLE</p><h1>Command Center</h1><p className="page-lede">Prepare the next classroom moment, then step into the room when it is time.</p></div>
      <div className="page-header-actions"><a className="action-link primary-action" href={routeLink('workspace', context)}>Enter Classroom</a><a className="action-link secondary-action" href={routeLink('projection', context)}>Open Classroom Preview</a></div>
    </header>
    <TeacherContextBar context={context} eyebrow="Current classroom" />
    {context.error && <p className="game-error" role="alert">{context.error}</p>}
    {error && <p className="game-error" role="alert">{error} <button type="button" onClick={context.refresh}>Retry</button></p>}
    <section className="home-launch-grid" aria-label="Game Master launchpad">
      <article className="launch-card launch-card-primary"><div><p className="eyebrow">THE TEACHER'S DESK</p><h2>{context.group?.name ?? 'Choose a classroom'}</h2><p>{context.group ? 'Your live roster, rewards, and classroom play are ready from one place.' : 'Select a class above, or use Classroom Setup to create your first one.'}</p></div><a className="text-link" href={routeLink('workspace', context)}>Open live roster <span aria-hidden="true">→</span></a></article>
      <article className="launch-card quick-launch"><div className="section-heading"><div><p className="eyebrow">QUICK LAUNCH</p><h2>Start something useful</h2></div><span className="launch-mark" aria-hidden="true">✦</span></div><div className="launch-actions"><a href={newRoute('events', context)}><span className="launch-glyph" aria-hidden="true">◇</span><span><strong>New Event</strong><small>Set a classroom moment</small></span><span aria-hidden="true">→</span></a><a href={`${routeLink('challenges', context)}${routeLink('challenges', context).includes('?') ? '&new=1' : '?new=1'}`}><span className="launch-glyph" aria-hidden="true">✦</span><span><strong>New Challenge</strong><small>Set a collective goal</small></span><span aria-hidden="true">→</span></a><a href={routeLink('minigames', context)}><span className="launch-glyph" aria-hidden="true">⊕</span><span><strong>Launch Minigame</strong><small>Choose a quick activity</small></span><span aria-hidden="true">→</span></a></div></article>
    </section>
    <section className="active-stage" aria-labelledby="active-now-title">
       <div className="section-heading"><div><p className="eyebrow">THE BOARD</p><h2 id="active-now-title">Active now</h2></div><span className="section-note">{loadingData || !boardReady ? 'Reading current classroom…' : draftCount ? `${draftCount} drafts ready` : 'Live classroom state'}</span></div>
      <div className="active-grid">
        <article className={`active-card${activeEvent ? ' has-content' : ''}`}><div className="active-card-heading"><span className="content-sigil event-sigil" aria-hidden="true">◇</span><div><p className="eyebrow">ACTIVE EVENT</p><h3>{activeEvent?.title ?? 'No active event'}</h3></div></div>{activeEvent ? <><p>{activeEvent.description || 'A classroom moment is ready to lead.'}</p><span className="status-chip">{activeEvent.theme.toLowerCase()}</span></> : <p>Create a mission, narrative moment, or special activity for the class.</p>}<div className="active-card-footer">{activeEvent ? <a className="text-link" href={routeLink('events', context)}>Open event desk <span aria-hidden="true">→</span></a> : <a className="text-link" href={newRoute('events', context)}>Create event <span aria-hidden="true">→</span></a>}{eventOnDisplay && <OnDisplayMarker />}</div></article>
        <article className={`active-card challenge-card${activeChallenge ? ' has-content' : ''}`}><div className="active-card-heading"><span className="content-sigil challenge-sigil" aria-hidden="true">✦</span><div><p className="eyebrow">ACTIVE CHALLENGE</p><h3>{activeChallenge?.title ?? 'No active challenge'}</h3></div></div>{activeChallenge ? <><p>{activeChallenge.description}</p><div className="home-progress"><div><strong>{activeChallenge.progress} / {activeChallenge.target}</strong><span>class contributions</span></div><div className="progress-track"><span style={{ width: `${progressPercent(activeChallenge.progress, activeChallenge.target)}%` }} /></div></div></> : <p>Set one collective objective that the class can see and build together.</p>}<div className="active-card-footer">{activeChallenge ? <a className="text-link" href={routeLink('challenges', context)}>Open challenge desk <span aria-hidden="true">→</span></a> : <a className="text-link" href={newRoute('challenges', context)}>Create challenge <span aria-hidden="true">→</span></a>}{challengeOnDisplay && <OnDisplayMarker />}</div></article>
        <article className={`active-card${visibleMinigame ? ' has-content minigame-card' : ''}`}><div className="active-card-heading"><span className="content-sigil game-sigil" aria-hidden="true">⊕</span><div><p className="eyebrow">MINIGAME</p><h3>{visibleMinigame ? visibleMinigame.title : 'No minigame running'}</h3></div></div>{visibleMinigame ? <><p>{visibleMinigame.prompt || 'A quick classroom activity is ready.'}</p><span className="status-chip">{visibleMinigame.status.toLowerCase()}</span></> : <p>Choose a quick activity when the room needs a spark.</p>}<div className="active-card-footer">{visibleMinigame ? <a className="text-link" href={routeLink('minigames', context)}>Open activity desk <span aria-hidden="true">→</span></a> : <a className="text-link" href={routeLink('minigames', context)}>Choose minigame <span aria-hidden="true">→</span></a>}{minigameOnDisplay && <OnDisplayMarker />}</div></article>
      </div>
    </section>
    <section className="prepared-stage" aria-labelledby="prepared-title">
      <div className="section-heading"><div><p className="eyebrow">THE PREPARED DESK</p><h2 id="prepared-title">Ready for the next lesson</h2></div><span className="section-note">{preparedCount ? `${preparedCount} prepared item${preparedCount === 1 ? '' : 's'}` : 'Nothing waiting yet'}</span></div>
      <div className="prepared-grid">
        <article className="prepared-card"><div className="prepared-card-heading"><span className="content-sigil event-sigil" aria-hidden="true">◇</span><div><p className="eyebrow">EVENTS</p><h3>{preparedEventCount ? `${preparedEventCount} prepared` : 'No prepared events'}</h3></div></div>{preparedEventCount ? <ul>{preparedEvents.map(event => <li key={event.id}><span><strong>{event.title}</strong><small>{event.theme.toLowerCase()} draft</small></span></li>)}{preparedEventsMore > 0 && <li><span><strong>+{preparedEventsMore} more prepared event{preparedEventsMore === 1 ? '' : 's'}</strong><small>Available from Events</small></span></li>}</ul> : <p>Save a classroom moment here before you need it in the room.</p>}<a className="text-link" href={routeLink('events', context)}>{preparedEventCount ? 'Open event desk' : 'Prepare an event'} <span aria-hidden="true">→</span></a></article>
        <article className="prepared-card"><div className="prepared-card-heading"><span className="content-sigil challenge-sigil" aria-hidden="true">✦</span><div><p className="eyebrow">CHALLENGES</p><h3>{preparedChallengeCount ? `${preparedChallengeCount} prepared` : 'No prepared challenges'}</h3></div></div>{preparedChallengeCount ? <ul>{preparedChallenges.map(challenge => <li key={challenge.id}><span><strong>{challenge.title}</strong><small>target {challenge.target} contributions</small></span></li>)}{preparedChallengesMore > 0 && <li><span><strong>+{preparedChallengesMore} more prepared challenge{preparedChallengesMore === 1 ? '' : 's'}</strong><small>Available from Challenges</small></span></li>}</ul> : <p>Set a collective objective so the class knows what to build together.</p>}<a className="text-link" href={routeLink('challenges', context)}>{preparedChallengeCount ? 'Open challenge desk' : 'Prepare a challenge'} <span aria-hidden="true">→</span></a></article>
       <article className="prepared-card"><div className="prepared-card-heading"><span className="content-sigil game-sigil" aria-hidden="true">◷</span><div><p className="eyebrow">SAVED SPRINTS</p><h3>{presets.length ? `${presets.length} saved` : 'No saved sprints'}</h3></div></div>{presets.length ? <ul><li><span><strong>{presets[0].title}</strong><small>{presets[0].durationSeconds} seconds · ready to launch</small></span></li>{presets.length > 1 && <li><span><strong>+{presets.length - 1} more preset{presets.length === 2 ? '' : 's'}</strong><small>Available from Minigames</small></span></li>}</ul> : <p>Save a French Sprint prompt once, then launch it without retyping.</p>}<a className="text-link" href={routeLink('minigames', context)}>{presets.length ? 'Open minigame desk' : 'Save a sprint preset'} <span aria-hidden="true">→</span></a></article>
       <article className="prepared-card"><div className="prepared-card-heading"><span className="content-sigil deck-sigil" aria-hidden="true">▤</span><div><p className="eyebrow">PROMPT DECKS</p><h3>{decks.length ? `${decks.length} saved` : 'No saved decks'}</h3></div></div>{decks.length ? <ul><li><span><strong>{decks[0].title}</strong><small>{decks[0].prompts.length} prompts · ready to lead</small></span></li>{decks.length > 1 && <li><span><strong>+{decks.length - 1} more deck{decks.length === 2 ? '' : 's'}</strong><small>Available from Minigames</small></span></li>}</ul> : <p>Save a prompt sequence once, then lead it one question at a time.</p>}<a className="text-link" href={routeLink('minigames', context)}>{decks.length ? 'Open minigame desk' : 'Save a prompt deck'} <span aria-hidden="true">→</span></a></article>
      </div>
    </section>
    <section className="class-snapshot" aria-label="Class snapshot"><div><p className="eyebrow">CLASS SNAPSHOT</p><h2>{context.group?.name ?? 'No classroom selected'}</h2></div><div className="snapshot-value"><strong>{studentCount}</strong><span>students</span></div><a className="text-link" href={routeLink('workspace', context)}>Manage classroom <span aria-hidden="true">→</span></a></section>
  </WorkspaceShell>;
}

export function HomeApp() { return <TeacherGate activeRoute="home"><HomePage /></TeacherGate>; }
