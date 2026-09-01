import { useEffect, useRef, useState } from 'react';
import { activeAssessmentContexts, workspaceApi, type AdvantageRedemption, type ApiFailure, type AssessmentContext, type CoinReward, type CoinSummary, type TeacherStudent, type XpCategory, type XpSummary } from './workspace-api';
import type { WorkspaceStudentContext } from './workspace-state';
import { studentInitials } from './StudentCard';
import { UndoBanner } from './UndoBanner';
import { effectiveXpForAction } from './xp-presentation';

type XpValue = 1 | 2 | 3;

const categories: XpCategory[] = ['COMMUNICATION', 'PRECISION', 'CONSISTENCY', 'COLLABORATION'];
const specialtyBonusLabel = 'Specialty bonus +1';

const categoryMeta: Record<XpCategory, { glyph: string; cue: string; actions: Record<XpValue, string> }> = {
  COMMUNICATION: {
    glyph: '◒',
    cue: 'Voice & expression',
    actions: { 1: 'Participation', 2: 'French with help / short phrase', 3: 'Spontaneous or developed French' },
  },
  PRECISION: {
    glyph: '⌖',
    cue: 'Care & accuracy',
    actions: { 1: 'Corrects / improves', 2: 'Correct and careful work', 3: 'Especially precise work' },
  },
  CONSISTENCY: {
    glyph: '↗︎',
    cue: 'Steady progress',
    actions: { 1: 'Tries despite difficulty', 2: 'Maintains effort', 3: 'Overcomes difficulty / improves' },
  },
  COLLABORATION: {
    glyph: '∞',
    cue: 'Learning together',
    actions: { 1: 'Appropriate occasional help', 2: 'Active collaboration', 3: 'Especially valuable collaboration' },
  },
};

function progressPercent(summary: XpSummary) {
  if (summary.progress.isMaxLevel) return 100;
  if (!summary.progress.required) return 0;
  return Math.min(100, Math.max(0, (summary.progress.current / summary.progress.required) * 100));
}

type AwardNotice = { id: number; baseXp: XpValue; bonusXp: number; effectiveXp: number };

function RegisterXp({ studentId, specialty, onSummary, onFeedback, onUndo, contextKey }: { studentId: string; specialty: string | null; onSummary: (summary: XpSummary) => void; onFeedback: (message: string) => void; onUndo: (event: { id: string }) => void; contextKey: string }) {
  const [category, setCategory] = useState<XpCategory | null>(null);
  const [pending, setPending] = useState(false);
  const [comment, setComment] = useState('');
  const [operationKey, setOperationKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lastBaseXp, setLastBaseXp] = useState<XpValue | null>(null);
  const [award, setAward] = useState<AwardNotice | null>(null);
  const requestGeneration = useRef(0);
  const currentContextKey = useRef(contextKey);

  if (currentContextKey.current !== contextKey) {
    currentContextKey.current = contextKey;
    requestGeneration.current += 1;
  }

  useEffect(() => {
    setPending(false);
    setOperationKey(null);
    setCategory(null);
    setComment('');
    setError('');
    setLastBaseXp(null);
    setAward(null);
  }, [contextKey]);

  useEffect(() => {
    if (!award) return;
    const timer = window.setTimeout(() => setAward(null), 1_200);
    return () => window.clearTimeout(timer);
  }, [award]);

  const specialtyBonus = category ? effectiveXpForAction(1, specialty, category) - 1 : 0;
  const specialtyBonusId = specialtyBonus > 0 ? `xp-${category?.toLowerCase()}-specialty-bonus` : undefined;

  async function submit(baseXp: XpValue) {
    if (!category || pending || currentContextKey.current !== contextKey) return;
    const generation = ++requestGeneration.current;
    const key = operationKey ?? crypto.randomUUID();
    setOperationKey(key);
    setLastBaseXp(baseXp);
    setPending(true);
    setError('');
    const isCurrentRequest = () => generation === requestGeneration.current && currentContextKey.current === contextKey;
    try {
      const result = await workspaceApi.registerXp(studentId, { category, baseXp, ...(comment.trim() ? { comment: comment.trim() } : {}) }, undefined, key);
      if (!isCurrentRequest()) return;
      onSummary(result.value.summary);
      onFeedback(`Base XP +${baseXp} · ${result.value.event.specialtyBonusXp ? specialtyBonusLabel : 'No specialty bonus'} · Effective XP +${result.value.event.effectiveXp}`);
      setAward({ id: Date.now(), baseXp, bonusXp: result.value.event.specialtyBonusXp, effectiveXp: result.value.event.effectiveXp });
      onUndo(result.value.event);
      setOperationKey(null);
      setCategory(null);
      setComment('');
      setLastBaseXp(null);
    } catch (caught) {
      if (!isCurrentRequest()) return;
      const failure = caught as ApiFailure;
      if (typeof failure.status === 'number' && failure.status >= 400 && failure.status < 500) setOperationKey(null);
      const message = failure.status === 401 ? 'Your session expired. Sign in again.' : 'Could not register XP. Try again.';
      setError(message);
    } finally {
      if (isCurrentRequest()) setPending(false);
    }
  }

  return <section className="xp-action panel-section" aria-label="Register XP">
    <div className="action-heading">
      <div className="action-heading-copy"><p className="eyebrow">QUICK CLASSROOM ACTION</p><h3>Quick XP</h3></div>
      <span className="action-hint">One tap to record</span>
    </div>
    {award && <div key={award.id} className="xp-award" role="status" aria-live="polite"><strong>+{award.effectiveXp} XP</strong><span>Base +{award.baseXp}{award.bonusXp ? ' · Specialty bonus +1' : ''}</span></div>}
    {!category ? <div className="xp-categories" aria-label="XP categories">
      {categories.map(value => {
        const meta = categoryMeta[value];
        const hasSpecialtyBonus = effectiveXpForAction(1, specialty, value) > 1;
        return <button className={`discipline-choice discipline-${value.toLowerCase()}`} type="button" key={value} aria-label={`${value}${hasSpecialtyBonus ? `, ${specialtyBonusLabel}` : ''}`} aria-expanded="false" disabled={pending} onClick={() => { setOperationKey(null); setError(''); setAward(null); setCategory(value); }}>
          <span className="discipline-glyph" aria-hidden="true">{meta.glyph}</span>
          <span className="discipline-copy"><strong>{value}</strong><small>{meta.cue}</small>{hasSpecialtyBonus && <span className="specialty-bonus-note">{specialtyBonusLabel}</span>}</span>
          <span className="discipline-arrow" aria-hidden="true">+</span>
        </button>;
      })}
    </div> : <>
      <div className={`selected-category discipline-${category.toLowerCase()}`}>
        <span className="discipline-glyph" aria-hidden="true">{categoryMeta[category].glyph}</span>
        <span className="selected-category-copy"><strong>{category}</strong><small>{categoryMeta[category].cue}</small>{specialtyBonus > 0 && <span id={specialtyBonusId} className="specialty-bonus-note">{specialtyBonusLabel}</span>}</span>
      </div>
      <div className="xp-values" id="xp-options" aria-label={`${category} XP value`}>
        {([1, 2, 3] as const).map(value => {
          const effectiveXp = effectiveXpForAction(value, specialty, category);
          return <button type="button" key={value} aria-label={`+${effectiveXp} ${categoryMeta[category].actions[value]}`} aria-describedby={specialtyBonusId} disabled={pending} onClick={() => submit(value)}>
            <span className="xp-value">+{effectiveXp}</span><span className="xp-action-label">{categoryMeta[category].actions[value]}</span>
          </button>;
        })}
      </div>
      {pending && <p className="action-status" role="status" aria-live="polite" aria-label="Action feedback">Saving XP…</p>}
      {error && <div className="action-error" role="alert"><span>{error}</span>{lastBaseXp && <button type="button" className="quiet-button" disabled={pending} onClick={() => submit(lastBaseXp)}>Retry</button>}</div>}
      <button type="button" className="quiet-button change-category" disabled={pending} onClick={() => { setCategory(null); setOperationKey(null); setError(''); setLastBaseXp(null); }}>Choose another category</button>
      <details><summary>Add optional note</summary><label htmlFor="xp-note">Note<span className="sr-only"> (optional)</span></label><textarea id="xp-note" value={comment} onChange={event => setComment(event.target.value)} maxLength={240} /></details>
    </>}
  </section>;
}

function CoinActions({ context, readOnly, onFeedback }: { context: WorkspaceStudentContext; readOnly: boolean; onFeedback: (message: string) => void }) {
  const [summary, setSummary] = useState<CoinSummary | null>(null);
  const [rewards, setRewards] = useState<CoinReward[]>([]);
  const [contexts, setContexts] = useState<AssessmentContext[]>([]);
  const [assessmentContextId, setAssessmentContextId] = useState('');
  const [assessmentName, setAssessmentName] = useState('');
  const [activeRedemption, setActiveRedemption] = useState<AdvantageRedemption | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (readOnly) return;
    const controller = new AbortController();
    Promise.all([workspaceApi.coins(context.studentId, controller.signal), workspaceApi.coinRewards(controller.signal), workspaceApi.assessmentContexts(context.groupId, controller.signal)]).then(([coins, fixedRewards, availableContexts]) => {
      setSummary(coins);
      setRewards(fixedRewards);
      const writableContexts = activeAssessmentContexts(availableContexts);
      setContexts(writableContexts);
      setAssessmentContextId(writableContexts[0]?.id ?? '');
      setActiveRedemption(null);
      setError('');
    }).catch((caught: unknown) => {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError('Could not load coin advantages.');
    });
    return () => controller.abort();
  }, [context.studentId, context.groupId, readOnly]);

  async function createOrSelectAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = assessmentName.trim();
    if (!name || pending) return;
    setPending(true);
    setError('');
    try {
      const result = await workspaceApi.createAssessmentContext(context.groupId, assessmentName);
      const canonical = result.value;
      setContexts(current => current.some(item => item.id === canonical.id) ? current : [...current, canonical]);
      setAssessmentContextId(canonical.id);
      setAssessmentName('');
      onFeedback(result.replayed ? `${canonical.name} selected.` : `${canonical.name} created and selected.`);
    } catch (caught) {
      const failure = caught as ApiFailure;
      setError(failure.status === 422 ? 'Enter an assessment name.' : failure.message);
    } finally {
      setPending(false);
    }
  }

  async function redeem(reward: CoinReward) {
    if (!assessmentContextId || pending || activeRedemption) return;
    setPending(true);
    setError('');
    try {
      const result = await workspaceApi.redeemAdvantage(context.studentId, assessmentContextId, reward.id);
      setSummary(current => current ? { ...current, balance: current.balance - reward.cost } : current);
      setActiveRedemption(result.value);
      onFeedback(result.replayed ? 'Advantage request replayed.' : `${reward.name} reserved.`);
    } catch (caught) {
      const failure = caught as ApiFailure;
      setError(failure.status === 409 ? 'This assessment already has an advantage.' : failure.message);
    } finally {
      setPending(false);
    }
  }

  async function reverse() {
    if (!activeRedemption || pending) return;
    setPending(true);
    setError('');
    try {
      await workspaceApi.reverseAdvantage(activeRedemption.id);
      setSummary(current => current ? { ...current, balance: current.balance + activeRedemption.cost } : current);
      setActiveRedemption(null);
      onFeedback('Assessment advantage undone.');
    } catch (caught) {
      const failure = caught as ApiFailure;
      setError(failure.status === 409 ? 'This assessment advantage is already reversed.' : failure.message);
    } finally {
      setPending(false);
    }
  }

  if (readOnly) return null;
  return <section className="coin-action panel-section" aria-label="Assessment advantages">
    <div className="coin-action-heading action-heading">
      <div className="coin-title"><span className="eclipse-coin" aria-hidden="true">◈</span><div><p className="eyebrow">ECLIPSE POINTS</p><h3>Assessment advantage</h3></div></div>
      <strong aria-label="Eclipse Points balance">{summary?.balance ?? '—'} points</strong>
    </div>
    <p className="coin-description">A rare academy token for a carefully chosen assessment.</p>
    <form className="assessment-context-form" onSubmit={createOrSelectAssessment}><label htmlFor="assessment-name">Create/select Assessment<input id="assessment-name" value={assessmentName} onChange={event => setAssessmentName(event.target.value)} placeholder="e.g. Unit quiz" maxLength={100} /></label><button type="submit" disabled={pending || !assessmentName.trim()}>Create/select Assessment</button></form>
    {contexts.length ? <label htmlFor="assessment-context">Assessment<select id="assessment-context" value={assessmentContextId} onChange={event => setAssessmentContextId(event.target.value)}>{contexts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <p className="muted">Create an assessment to continue.</p>}
    <div className="coin-rewards">{rewards.map(reward => <button type="button" key={reward.id} disabled={pending || !assessmentContextId || Boolean(activeRedemption) || (summary?.balance ?? 0) < reward.cost} onClick={() => redeem(reward)}>{reward.name} · {reward.cost} points</button>)}</div>
    {activeRedemption && <button type="button" className="quiet-button" disabled={pending} onClick={reverse}>Undo assessment advantage</button>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}

export function StudentPanel({ student, context, historical, feedback, undo, onClose, originRef, onUndoResult, summary, onSummary, onFeedback, onUndo }: { student: TeacherStudent | null; context: WorkspaceStudentContext | null; historical: boolean; feedback: string; undo: any; onClose: () => void; originRef?: { current: HTMLElement | null }; onUndoResult: (message: string) => void; summary: XpSummary | null; onSummary: (summary: XpSummary) => void; onFeedback: (message: string) => void; onUndo: (event: { id: string }) => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previousStudent = useRef<string | null>(null);
  const dialog = typeof window !== 'undefined' && window.innerWidth < 900;

  useEffect(() => {
    if (student && dialog && student.id !== previousStudent.current) (closeRef.current ?? headingRef.current)?.focus();
    previousStudent.current = student?.id ?? null;
  }, [student, dialog]);

  useEffect(() => {
    if (!dialog || !student) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        window.requestAnimationFrame(() => originRef?.current?.focus());
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [dialog, student, onClose, originRef]);

  useEffect(() => {
    if (!dialog || !student) return;
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active?.tagName === 'SUMMARY')) {
        event.preventDefault();
        first.focus();
      } else if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [dialog, student]);

  if (!student || !context) return <aside className="student-panel panel-empty"><p className="muted">Select a student to inspect their classroom context.</p>{feedback && <p role="status" aria-live="polite">{feedback}</p>}</aside>;

  const close = () => {
    onClose();
    originRef?.current?.focus();
    window.requestAnimationFrame(() => originRef?.current?.focus());
  };
  const readOnly = historical || Boolean(student.archivedAt);
  const percent = summary ? progressPercent(summary) : 0;

  return <aside ref={panelRef} className="student-panel" role={dialog ? 'dialog' : undefined} aria-modal={dialog ? true : undefined} aria-labelledby="student-panel-title">
    <button ref={closeRef} className="panel-close" type="button" onClick={close} aria-label="Close student panel">×</button>
    <header className="panel-identity">
      <span className="character-crest student-crest avatar" aria-hidden="true"><span className="crest-initials">{studentInitials(student.realName)}</span><span className="crest-orbit" /></span>
      <div><p className="eyebrow">CHARACTER SHEET · SELECTED STUDENT</p><h2 ref={headingRef} id="student-panel-title" tabIndex={-1}>{student.realName}</h2><p className="student-alias">{student.alias}</p></div>
    </header>
    <div className="sheet-specialty"><span className="specialty-glyph" aria-hidden="true">✦</span><div><small>Specialty</small><strong>{student.specialty ?? 'Not assigned'}</strong></div>{summary && <span className="level-mark">Level {summary.level}</span>}</div>
    <section className="student-facts" aria-label="Student XP summary">
      <span><small>Annual record</small>{summary ? <strong>Annual XP: {summary.annualEffectiveXp} · Level {summary.level}</strong> : <strong>XP summary unavailable</strong>}</span>
    </section>
    {summary && <div className="xp-progress" aria-label={`${summary.progress.current} of ${summary.progress.required} XP to next level`}>
      <div className="xp-progress-heading"><span>Progress to Level {summary.progress.nextLevel ?? 'max'}</span><strong>{summary.progress.isMaxLevel ? 'Maximum level' : `${summary.progress.current} / ${summary.progress.required} XP`}</strong></div>
      <div className="progress-track" role="progressbar" aria-label="XP progression" aria-valuemin={0} aria-valuemax={summary.progress.required} aria-valuenow={summary.progress.current}><span style={{ width: `${percent}%` }} /></div>
    </div>}
    {readOnly ? <p className="read-only-note" role="status">Historical record · read-only</p> : <><RegisterXp studentId={student.id} specialty={student.specialty} contextKey={`${context.academicYearId}:${context.groupId}:${context.studentId}`} onSummary={onSummary} onFeedback={onFeedback} onUndo={onUndo} /><UndoBanner opportunity={undo} onResult={onUndoResult} /></>}
    <section className="achievement-section" aria-label="Achievements">
      <div className="section-heading"><div><p className="eyebrow">ACADEMY SEALS</p><h3>Achievements</h3></div><span className="achievement-count">{summary?.badges.length ?? 0}</span></div>
      {summary?.badges.length ? <div className="badge-list">{summary.badges.map(badge => <span className="badge-seal" key={`${badge.category}-${badge.unlockedAt}`}><span className="badge-medallion" aria-hidden="true">{categoryMeta[badge.category].glyph}</span><span>{badge.label}</span></span>)}</div> : <p className="muted">Seals appear as classroom evidence accumulates.</p>}
    </section>
    {summary?.badges.length ? <p className="badge-callout" role="status">Badge unlocked: {summary.badges.map(badge => badge.label).join(', ')}</p> : null}
    {!readOnly && <CoinActions context={context} readOnly={readOnly} onFeedback={onFeedback} />}
    {feedback && <p key={feedback} className="feedback" role="status" aria-live="polite">{feedback}</p>}
  </aside>;
}
