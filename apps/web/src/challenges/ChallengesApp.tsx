import { useEffect, useState } from 'react';
import { TeacherGate } from '../auth/TeacherGate';
import { gameApi, type ClassroomChallenge } from '../game/game-api';
import { TeacherContextBar, useTeacherContext } from '../app/teacher-context';
import { WorkspaceShell } from '../workspace/WorkspaceShell';

type ChallengeDraft = { id?: string; title: string; description: string; target: number; showOnProjection: boolean };
const emptyDraft = (): ChallengeDraft => ({ title: '', description: '', target: 20, showOnProjection: true });
const progressPercent = (progress: number, target: number) => target ? Math.min(100, Math.max(0, (progress / target) * 100)) : 0;

function pageLink(context: ReturnType<typeof useTeacherContext>) {
  const params = new URLSearchParams();
  if (context.yearId) params.set('year', context.yearId);
  if (context.groupId) params.set('group', context.groupId);
  return `/#/challenges${params.toString() ? `?${params}` : ''}`;
}

function ChallengeForm({ draft, busy, onChange, onCancel, onSave }: { draft: ChallengeDraft; busy: boolean; onChange: (value: ChallengeDraft) => void; onCancel: () => void; onSave: () => void }) {
  return <form className="game-form" onSubmit={event => { event.preventDefault(); onSave(); }}>
    <div className="form-heading"><div><p className="eyebrow">{draft.id ? 'EDIT CHALLENGE' : 'NEW CHALLENGE'}</p><h2>{draft.id ? 'Refine the collective objective' : 'Set a collective objective'}</h2></div><button type="button" className="icon-close" aria-label="Close challenge form" onClick={onCancel}>×</button></div>
    <label htmlFor="challenge-title">Title<input id="challenge-title" required maxLength={120} value={draft.title} onChange={event => onChange({ ...draft, title: event.target.value })} placeholder="e.g. French Only" /></label>
    <label htmlFor="challenge-description">Instructions<textarea id="challenge-description" maxLength={500} value={draft.description} onChange={event => onChange({ ...draft, description: event.target.value })} placeholder="Reach 20 spontaneous French contributions." /></label>
    <div className="form-row"><label htmlFor="challenge-target">Target<input id="challenge-target" required type="number" min="1" max="10000" value={draft.target} onChange={event => onChange({ ...draft, target: Number(event.target.value) })} /></label><label className="check-control"><input type="checkbox" checked={draft.showOnProjection} onChange={event => onChange({ ...draft, showOnProjection: event.target.checked })} />Show on Classroom Preview</label></div>
    <div className="form-actions"><button type="button" className="secondary-action" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" disabled={busy || !draft.title.trim() || draft.target < 1}>{busy ? 'Saving…' : draft.id ? 'Save changes' : 'Save challenge'}</button></div>
  </form>;
}

function ChallengeCard({ challenge, busy, onEdit, onActivate, onAdjust, onComplete, onArchive, onDisplay }: { challenge: ClassroomChallenge; busy: boolean; onEdit: () => void; onActivate: () => void; onAdjust: (delta: -1 | 1) => void; onComplete: () => void; onArchive: () => void; onDisplay: () => void }) {
  const complete = challenge.status === 'COMPLETED' || challenge.progress >= challenge.target;
  return <article className={`game-card challenge-game-card status-${challenge.status.toLowerCase()}`}>
    <div className="game-card-topline"><span className={`status-chip status-${challenge.status.toLowerCase()}`}>{complete ? 'complete' : challenge.status.toLowerCase()}</span>{challenge.showOnProjection && challenge.status !== 'DRAFT' && <span className="theme-label">on display</span>}</div>
    <h3>{challenge.title}</h3>
    <p>{challenge.description || 'A collective classroom objective.'}</p>
    <div className="challenge-progress"><div><strong>{challenge.progress} / {challenge.target}</strong><span>class contributions</span></div><div className="progress-track"><span style={{ width: `${progressPercent(challenge.progress, challenge.target)}%` }} /></div></div>
    <div className="game-card-actions">{challenge.status === 'DRAFT' && <button type="button" disabled={busy} onClick={onActivate}>Start challenge</button>}{challenge.status === 'ACTIVE' && <><button type="button" disabled={busy || complete} onClick={() => onAdjust(1)}>+1 Progress</button><button type="button" className="secondary-action" disabled={busy || challenge.progress === 0} onClick={() => onAdjust(-1)}>Correct −1</button><button type="button" className="secondary-action" disabled={busy} onClick={onComplete}>Complete</button></>}{<button type="button" className="secondary-action" disabled={busy} onClick={onEdit}>Edit</button>}{(challenge.status === 'ACTIVE' || challenge.status === 'COMPLETED') && <button type="button" className="quiet-action" disabled={busy} onClick={onDisplay}>{challenge.showOnProjection ? 'Hide from Classroom Preview' : 'Show on Classroom Preview'}</button>}<button type="button" className="quiet-action" disabled={busy} onClick={onArchive}>Archive</button></div>
  </article>;
}

function ChallengesPage() {
  const context = useTeacherContext();
  const [challenges, setChallenges] = useState<ClassroomChallenge[]>([]);
  const [form, setForm] = useState<ChallengeDraft | null>(() => window.location.hash.includes('new=1') ? emptyDraft() : null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!context.groupId) { setChallenges([]); return; }
    let cancelled = false;
    setLoading(true);
    gameApi.challenges(context.groupId).then(value => { if (!cancelled) { setChallenges(value); setError(''); } }).catch(() => { if (!cancelled) setError('Could not load challenges.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [context.groupId, context.revision]);

  async function save(draft: ChallengeDraft) {
    if (!context.groupId || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await (draft.id ? gameApi.updateChallenge(draft.id, { title: draft.title, description: draft.description, target: draft.target, showOnProjection: draft.showOnProjection }) : gameApi.createChallenge(context.groupId, { title: draft.title, description: draft.description, target: draft.target, showOnProjection: draft.showOnProjection }));
      setNotice(draft.id ? 'Challenge updated.' : 'Challenge saved as a draft.'); setForm(null); context.refresh();
    } catch (caught) { setError((caught as Error).message || 'Could not save challenge.'); } finally { setBusy(false); }
  }

  async function mutate(action: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); context.refresh(); } catch (caught) { setError((caught as Error).message || 'Could not update challenge.'); } finally { setBusy(false); }
  }

  async function adjust(challenge: ClassroomChallenge, delta: -1 | 1) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { const value = await gameApi.adjustChallenge(challenge.id, delta); setNotice(value.status === 'COMPLETED' ? 'Challenge complete — objective reached.' : delta > 0 ? `Challenge progress: ${value.progress} / ${value.target}.` : 'Challenge progress corrected.'); context.refresh(); } catch (caught) { setError((caught as Error).message || 'Could not update challenge progress.'); } finally { setBusy(false); }
  }

  const active = challenges.filter(challenge => challenge.status === 'ACTIVE');
  const drafts = challenges.filter(challenge => challenge.status === 'DRAFT');
  const completed = challenges.filter(challenge => challenge.status === 'COMPLETED');
  const projection = context.groupId ? `/#/projection?group=${encodeURIComponent(context.groupId)}` : '/#/projection';

  return <WorkspaceShell activeRoute="challenges">
    <header className="product-page-header"><div><p className="eyebrow">COLLECTIVE OBJECTIVES</p><h1>Challenges</h1><p className="page-lede">Give the class one clear objective to build together.</p></div><div className="page-header-actions"><button type="button" className="primary-action" disabled={!context.groupId || context.historical} onClick={() => setForm(emptyDraft())}>New Challenge</button><a className="action-link secondary-action" href={projection}>Open Classroom Preview</a></div></header>
    <TeacherContextBar context={context} eyebrow="Challenge classroom" />
    {form && <ChallengeForm draft={form} busy={busy} onChange={setForm} onCancel={() => setForm(null)} onSave={() => save(form)} />}
    {notice && <p className="game-notice" role="status">{notice}</p>}{error && <p className="game-error" role="alert">{error}</p>}
    {loading ? <p className="game-loading" role="status">Reading collective objectives…</p> : !context.groupId ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">✦</span><h2>Choose a classroom</h2><p>Select a group above to create a collective challenge.</p></div> : !challenges.length ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">✦</span><h2>No active challenge</h2><p>Set a collective objective for the class.</p><button type="button" onClick={() => setForm(emptyDraft())}>New challenge</button></div> : <div className="collection-stack">
      {active.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">BUILD TOGETHER</p><h2>Active</h2></div><span className="section-note">{active.length} live</span></div><div className="game-card-grid">{active.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} busy={busy} onEdit={() => setForm({ id: challenge.id, title: challenge.title, description: challenge.description, target: challenge.target, showOnProjection: challenge.showOnProjection })} onActivate={() => mutate(() => gameApi.activateChallenge(challenge.id), 'Challenge activated.')} onAdjust={delta => adjust(challenge, delta)} onComplete={() => mutate(() => gameApi.completeChallenge(challenge.id), 'Challenge completed.')} onArchive={() => mutate(() => gameApi.archiveChallenge(challenge.id), 'Challenge archived.')} onDisplay={() => mutate(() => gameApi.displayChallenge(challenge.id, !challenge.showOnProjection), challenge.showOnProjection ? 'Challenge hidden from Classroom Preview.' : 'Challenge shown on Classroom Preview.')} />)}</div></section>}
      {drafts.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">READY TO LEAD</p><h2>Drafts</h2></div><span className="section-note">{drafts.length} waiting</span></div><div className="game-card-grid">{drafts.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} busy={busy} onEdit={() => setForm({ id: challenge.id, title: challenge.title, description: challenge.description, target: challenge.target, showOnProjection: challenge.showOnProjection })} onActivate={() => mutate(() => gameApi.activateChallenge(challenge.id), 'Challenge activated.')} onAdjust={delta => adjust(challenge, delta)} onComplete={() => mutate(() => gameApi.completeChallenge(challenge.id), 'Challenge completed.')} onArchive={() => mutate(() => gameApi.archiveChallenge(challenge.id), 'Challenge archived.')} onDisplay={() => mutate(() => gameApi.displayChallenge(challenge.id, !challenge.showOnProjection), challenge.showOnProjection ? 'Challenge hidden from Classroom Preview.' : 'Challenge shown on Classroom Preview.')} />)}</div></section>}
      {completed.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">FIELD NOTES</p><h2>Completed</h2></div><span className="section-note">{completed.length} finished</span></div><div className="game-card-grid">{completed.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} busy={busy} onEdit={() => setForm({ id: challenge.id, title: challenge.title, description: challenge.description, target: challenge.target, showOnProjection: challenge.showOnProjection })} onActivate={() => mutate(() => gameApi.activateChallenge(challenge.id), 'Challenge activated.')} onAdjust={delta => adjust(challenge, delta)} onComplete={() => mutate(() => gameApi.completeChallenge(challenge.id), 'Challenge completed.')} onArchive={() => mutate(() => gameApi.archiveChallenge(challenge.id), 'Challenge archived.')} onDisplay={() => mutate(() => gameApi.displayChallenge(challenge.id, !challenge.showOnProjection), challenge.showOnProjection ? 'Challenge hidden from Classroom Preview.' : 'Challenge shown on Classroom Preview.')} />)}</div></section>}
    </div>}
  </WorkspaceShell>;
}

export function ChallengesApp() { return <TeacherGate activeRoute="challenges"><ChallengesPage /></TeacherGate>; }
