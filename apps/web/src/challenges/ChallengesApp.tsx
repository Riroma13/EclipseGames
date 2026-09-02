import { useEffect, useState } from 'react';
import { TeacherGate } from '../auth/TeacherGate';
import { isCurrentDisplay } from '../app/display-status';
import { gameApi, type ClassroomChallenge, type ProjectionControl } from '../game/game-api';
import { TeacherContextBar, useTeacherContext } from '../app/teacher-context';
import { WorkspaceShell } from '../workspace/WorkspaceShell';
import { challengeDraftForStarter, challengeStarters, type ChallengeStarterId } from './challenge-starters';

type ChallengeDraft = { id?: string; title: string; description: string; target: number | ''; showOnProjection: boolean };
const emptyDraft = (): ChallengeDraft => ({ title: '', description: '', target: 20, showOnProjection: true });
const progressPercent = (progress: number, target: number) => target ? Math.min(100, Math.max(0, (progress / target) * 100)) : 0;

function pageLink(context: ReturnType<typeof useTeacherContext>) {
  const params = new URLSearchParams();
  if (context.yearId) params.set('year', context.yearId);
  if (context.groupId) params.set('group', context.groupId);
  return `/#/challenges${params.toString() ? `?${params}` : ''}`;
}

function ChallengeForm({ draft, busy, readOnly, onChange, onCancel, onSave }: { draft: ChallengeDraft; busy: boolean; readOnly: boolean; onChange: (value: ChallengeDraft) => void; onCancel: () => void; onSave: () => void }) {
  const targetPreset = typeof draft.target === 'number' && [10, 20, 30].includes(draft.target) ? String(draft.target) : 'custom';
  return <form className="game-form" onSubmit={event => { event.preventDefault(); onSave(); }}>
    <div className="form-heading"><div><p className="eyebrow">{draft.id ? 'EDIT CHALLENGE' : 'NEW CHALLENGE'}</p><h2>{draft.id ? 'Refine the collective objective' : 'Set a collective objective'}</h2></div><button type="button" className="icon-close" aria-label="Close challenge form" onClick={onCancel}>×</button></div>
    {readOnly && <p className="read-only-note" role="status">Historical year — this challenge is read-only.</p>}
    {!draft.id && <section className="challenge-starters" aria-labelledby="challenge-starters-title"><div><p className="eyebrow">START WITH A STARTER</p><h3 id="challenge-starters-title">Choose a classroom-ready objective</h3><p>These values prefill the normal form. Nothing is saved until you save the challenge.</p></div><div className="starter-choice-grid">{challengeStarters.map(starter => <button type="button" className="starter-choice" key={starter.id} aria-label={starter.title} disabled={readOnly || busy} onClick={() => onChange(challengeDraftForStarter(starter.id as ChallengeStarterId))}><strong>{starter.title}</strong><span>{starter.description || 'Start with a blank objective.'}</span>{starter.target && <small>Target {starter.target} contributions</small>}</button>)}</div></section>}
    <label htmlFor="challenge-title">Title<input id="challenge-title" required maxLength={120} value={draft.title} disabled={readOnly || busy} onChange={event => onChange({ ...draft, title: event.target.value })} placeholder="e.g. French Only" /></label>
    <label htmlFor="challenge-description">Instructions<textarea id="challenge-description" maxLength={500} value={draft.description} disabled={readOnly || busy} onChange={event => onChange({ ...draft, description: event.target.value })} placeholder="Reach 20 spontaneous French contributions." /></label>
    <div className="form-row challenge-target-row"><label htmlFor="challenge-target-preset">Target preset<select id="challenge-target-preset" value={targetPreset} disabled={readOnly || busy} onChange={event => onChange({ ...draft, target: event.target.value === 'custom' ? draft.target : Number(event.target.value) })}><option value="10">10 contributions</option><option value="20">20 contributions</option><option value="30">30 contributions</option><option value="custom">Custom</option></select></label><label htmlFor="challenge-target">Target value<input id="challenge-target" required type="number" min="1" max="10000" value={draft.target} disabled={readOnly || busy} onChange={event => onChange({ ...draft, target: event.target.value === '' ? '' : Number(event.target.value) })} /></label><label className="check-control"><input type="checkbox" checked={draft.showOnProjection} disabled={readOnly || busy} onChange={event => onChange({ ...draft, showOnProjection: event.target.checked })} />Show on Classroom Preview</label></div>
    <div className="form-actions"><button type="button" className="secondary-action" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" disabled={busy || readOnly || !draft.title.trim() || typeof draft.target !== 'number' || draft.target < 1}>{busy ? 'Saving…' : draft.id ? 'Save changes' : 'Save challenge'}</button></div>
  </form>;
}

function ChallengeCard({ challenge, display, busy, readOnly, onEdit, onActivate, onPause, onResume, onAdjust, onComplete, onArchive, onDisplay }: { challenge: ClassroomChallenge; display: ProjectionControl | null; busy: boolean; readOnly: boolean; onEdit: () => void; onActivate: () => void; onPause: () => void; onResume: () => void; onAdjust: (delta: -1 | 1) => void; onComplete: () => void; onArchive: () => void; onDisplay: () => void }) {
  const complete = challenge.status === 'COMPLETED' || challenge.progress >= challenge.target;
  const onClassroomDisplay = isCurrentDisplay(display, 'CHALLENGE', challenge.id);
  return <article className={`game-card challenge-game-card status-${challenge.status.toLowerCase()}`}>
    <div className="game-card-topline"><span className={`status-chip status-${challenge.status.toLowerCase()}`}>{complete ? 'complete' : challenge.status.toLowerCase()}</span>{onClassroomDisplay && <span className="theme-label">on display</span>}</div>
    <h3>{challenge.title}</h3>
    <p>{challenge.description || 'A collective classroom objective.'}</p>
    <div className="challenge-progress"><div><strong>{challenge.progress} / {challenge.target}</strong><span>class contributions</span></div><div className="progress-track"><span style={{ width: `${progressPercent(challenge.progress, challenge.target)}%` }} /></div></div>
    {complete && <p className="challenge-completion-note" role="status">Objective reached. Review the result before moving on.</p>}
    <div className="game-card-actions challenge-live-actions">{challenge.status === 'DRAFT' && <button type="button" disabled={busy || readOnly} onClick={onActivate}>Start challenge</button>}{challenge.status === 'ACTIVE' && <><button type="button" className="live-action" disabled={busy || readOnly || complete} onClick={() => onAdjust(1)}>+1 Progress</button><button type="button" className="secondary-action" disabled={busy || readOnly} onClick={onComplete}>Complete</button><button type="button" className="quiet-action correction-action" disabled={busy || readOnly || challenge.progress === 0} onClick={() => onAdjust(-1)}>Correct −1</button><button type="button" className="secondary-action" disabled={busy || readOnly} onClick={onPause}>Pause</button></>}{challenge.status === 'COMPLETED' && <button type="button" className="quiet-action correction-action" disabled={busy || readOnly || challenge.progress === 0} onClick={() => onAdjust(-1)}>Correct −1 · reopen</button>}{challenge.status === 'PAUSED' && <button type="button" disabled={busy || readOnly} onClick={onResume}>Resume challenge</button>}<button type="button" className="secondary-action" disabled={busy || readOnly} onClick={onEdit}>Edit</button>{(challenge.status === 'ACTIVE' || challenge.status === 'COMPLETED') && <button type="button" className="quiet-action" disabled={busy || readOnly} onClick={onDisplay}>{challenge.showOnProjection ? 'Hide from Classroom Preview' : 'Show on Classroom Preview'}</button>}<button type="button" className="quiet-action" disabled={busy || readOnly} onClick={onArchive}>Archive</button></div>
  </article>;
}

function ChallengesPage() {
  const context = useTeacherContext();
  const [challenges, setChallenges] = useState<ClassroomChallenge[]>([]);
  const [form, setForm] = useState<ChallengeDraft | null>(() => window.location.hash.includes('new=1') ? emptyDraft() : null);
  const [loadedContextKey, setLoadedContextKey] = useState<string | null>(null);
  const [loadedDisplay, setLoadedDisplay] = useState<{ key: string; value: ProjectionControl } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const groupId = context.groupId;
    if (!groupId) { setChallenges([]); setLoadedContextKey(null); setLoading(false); return; }
    const requestKey = `${context.yearId ?? ''}:${groupId}:${context.revision}`;
    let cancelled = false;
    setLoading(true);
    setLoadedContextKey(null);
    setChallenges([]);
    setError('');
    gameApi.challenges(groupId).then(value => { if (!cancelled) { setChallenges(value); setLoadedContextKey(requestKey); setError(''); } }).catch(() => { if (!cancelled) { setChallenges([]); setLoadedContextKey(null); setError('Could not load challenges.'); } }).finally(() => { if (!cancelled) setLoading(false); });
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
    if (!context.groupId || context.historical) setForm(null);
  }, [context.groupId, context.yearId, context.historical]);

  const currentContextKey = context.groupId ? `${context.yearId ?? ''}:${context.groupId}:${context.revision}` : null;
  const dataReady = loadedContextKey !== null && loadedContextKey === currentContextKey;
  const visibleChallenges = dataReady ? challenges : [];
  const display = loadedDisplay?.key === currentContextKey ? loadedDisplay.value : null;

  async function save(draft: ChallengeDraft) {
    if (!context.groupId || context.historical || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
       const target = draft.target;
       if (typeof target !== 'number' || target < 1) return;
       await (draft.id ? gameApi.updateChallenge(draft.id, { title: draft.title, description: draft.description, target, showOnProjection: draft.showOnProjection }) : gameApi.createChallenge(context.groupId, { title: draft.title, description: draft.description, target, showOnProjection: draft.showOnProjection }));
      setNotice(draft.id ? 'Challenge updated.' : 'Challenge saved as a draft.'); setForm(null); context.refresh();
    } catch (caught) { setError((caught as Error).message || 'Could not save challenge.'); } finally { setBusy(false); }
  }

  async function mutate(action: () => Promise<unknown>, message: string) {
    if (context.historical || busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); context.refresh(); } catch (caught) { setError((caught as Error).message || 'Could not update challenge.'); } finally { setBusy(false); }
  }

  async function adjust(challenge: ClassroomChallenge, delta: -1 | 1) {
    if (context.historical || busy) return;
    setBusy(true); setError(''); setNotice('');
    try { const value = await gameApi.adjustChallenge(challenge.id, delta); setNotice(value.status === 'COMPLETED' ? 'Challenge complete — objective reached.' : delta > 0 ? `Challenge progress: ${value.progress} / ${value.target}.` : 'Challenge progress corrected.'); context.refresh(); } catch (caught) { setError((caught as Error).message || 'Could not update challenge progress.'); } finally { setBusy(false); }
  }

  const active = visibleChallenges.filter(challenge => challenge.status === 'ACTIVE');
  const paused = visibleChallenges.filter(challenge => challenge.status === 'PAUSED');
  const drafts = visibleChallenges.filter(challenge => challenge.status === 'DRAFT');
  const completed = visibleChallenges.filter(challenge => challenge.status === 'COMPLETED');
  const projection = context.groupId ? `/#/projection?group=${encodeURIComponent(context.groupId)}` : '/#/projection';

  return <WorkspaceShell activeRoute="challenges">
     <header className="product-page-header"><div><p className="eyebrow">COLLECTIVE OBJECTIVES</p><h1>Challenges</h1><p className="page-lede">Give the class one clear objective to build together.</p></div><div className="page-header-actions"><button type="button" className="primary-action" disabled={!context.groupId || context.historical} onClick={() => setForm(emptyDraft())}>New Challenge</button><a className="action-link secondary-action" href={projection}>Open Classroom Preview</a></div></header>
     <TeacherContextBar context={context} eyebrow="Challenge classroom" />
     {context.historical && <p className="read-only-note" role="status">Historical year — challenges are read-only. You can review their content, but cannot create, edit, activate, archive, change progress, or change display state.</p>}
     {form && <ChallengeForm draft={form} busy={busy} readOnly={context.historical} onChange={setForm} onCancel={() => setForm(null)} onSave={() => save(form)} />}
     {notice && <p className="game-notice" role="status">{notice}</p>}{error && <p className="game-error" role="alert">{error}</p>}
     {(loading || (context.groupId && !dataReady)) ? <p className="game-loading" role="status">Reading collective objectives…</p> : !context.groupId ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">✦</span><h2>Choose a classroom</h2><p>Select a group above to create a collective challenge.</p></div> : !visibleChallenges.length ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">✦</span><h2>No active challenge</h2><p>{context.historical ? 'There are no challenges recorded for this historical classroom.' : 'Set a collective objective for the class.'}</p><button type="button" disabled={context.historical} onClick={() => setForm(emptyDraft())}>New challenge</button></div> : <div className="collection-stack">
       {active.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">BUILD TOGETHER</p><h2>Active</h2></div><span className="section-note">{active.length} live</span></div><div className="game-card-grid">{active.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} display={display} busy={busy} readOnly={context.historical} onEdit={() => setForm({ id: challenge.id, title: challenge.title, description: challenge.description, target: challenge.target, showOnProjection: challenge.showOnProjection })} onActivate={() => mutate(() => gameApi.activateChallenge(challenge.id), 'Challenge activated.')} onPause={() => mutate(() => gameApi.pauseChallenge(challenge.id), 'Challenge paused.')} onResume={() => mutate(() => gameApi.resumeChallenge(challenge.id), 'Challenge resumed.')} onAdjust={delta => adjust(challenge, delta)} onComplete={() => mutate(() => gameApi.completeChallenge(challenge.id), 'Challenge completed.')} onArchive={() => mutate(() => gameApi.archiveChallenge(challenge.id), 'Challenge archived.')} onDisplay={() => mutate(() => gameApi.displayChallenge(challenge.id, !challenge.showOnProjection), challenge.showOnProjection ? 'Challenge hidden from Classroom Preview.' : 'Challenge shown on Classroom Preview.')} />)}</div></section>}
       {paused.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">ON HOLD</p><h2>Paused</h2></div><span className="section-note">{paused.length} waiting</span></div><div className="game-card-grid">{paused.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} display={display} busy={busy} readOnly={context.historical} onEdit={() => setForm({ id: challenge.id, title: challenge.title, description: challenge.description, target: challenge.target, showOnProjection: challenge.showOnProjection })} onActivate={() => mutate(() => gameApi.activateChallenge(challenge.id), 'Challenge activated.')} onPause={() => mutate(() => gameApi.pauseChallenge(challenge.id), 'Challenge paused.')} onResume={() => mutate(() => gameApi.resumeChallenge(challenge.id), 'Challenge resumed.')} onAdjust={delta => adjust(challenge, delta)} onComplete={() => mutate(() => gameApi.completeChallenge(challenge.id), 'Challenge completed.')} onArchive={() => mutate(() => gameApi.archiveChallenge(challenge.id), 'Challenge archived.')} onDisplay={() => mutate(() => gameApi.displayChallenge(challenge.id, !challenge.showOnProjection), challenge.showOnProjection ? 'Challenge hidden from Classroom Preview.' : 'Challenge shown on Classroom Preview.')} />)}</div></section>}
       {drafts.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">READY TO LEAD</p><h2>Drafts</h2></div><span className="section-note">{drafts.length} waiting</span></div><div className="game-card-grid">{drafts.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} display={display} busy={busy} readOnly={context.historical} onEdit={() => setForm({ id: challenge.id, title: challenge.title, description: challenge.description, target: challenge.target, showOnProjection: challenge.showOnProjection })} onActivate={() => mutate(() => gameApi.activateChallenge(challenge.id), 'Challenge activated.')} onPause={() => mutate(() => gameApi.pauseChallenge(challenge.id), 'Challenge paused.')} onResume={() => mutate(() => gameApi.resumeChallenge(challenge.id), 'Challenge resumed.')} onAdjust={delta => adjust(challenge, delta)} onComplete={() => mutate(() => gameApi.completeChallenge(challenge.id), 'Challenge completed.')} onArchive={() => mutate(() => gameApi.archiveChallenge(challenge.id), 'Challenge archived.')} onDisplay={() => mutate(() => gameApi.displayChallenge(challenge.id, !challenge.showOnProjection), challenge.showOnProjection ? 'Challenge hidden from Classroom Preview.' : 'Challenge shown on Classroom Preview.')} />)}</div></section>}
       {completed.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">FIELD NOTES</p><h2>Completed</h2></div><span className="section-note">{completed.length} finished</span></div><div className="game-card-grid">{completed.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} display={display} busy={busy} readOnly={context.historical} onEdit={() => setForm({ id: challenge.id, title: challenge.title, description: challenge.description, target: challenge.target, showOnProjection: challenge.showOnProjection })} onActivate={() => mutate(() => gameApi.activateChallenge(challenge.id), 'Challenge activated.')} onPause={() => mutate(() => gameApi.pauseChallenge(challenge.id), 'Challenge paused.')} onResume={() => mutate(() => gameApi.resumeChallenge(challenge.id), 'Challenge resumed.')} onAdjust={delta => adjust(challenge, delta)} onComplete={() => mutate(() => gameApi.completeChallenge(challenge.id), 'Challenge completed.')} onArchive={() => mutate(() => gameApi.archiveChallenge(challenge.id), 'Challenge archived.')} onDisplay={() => mutate(() => gameApi.displayChallenge(challenge.id, !challenge.showOnProjection), challenge.showOnProjection ? 'Challenge hidden from Classroom Preview.' : 'Challenge shown on Classroom Preview.')} />)}</div></section>}
    </div>}
  </WorkspaceShell>;
}

export function ChallengesApp() { return <TeacherGate activeRoute="challenges"><ChallengesPage /></TeacherGate>; }
