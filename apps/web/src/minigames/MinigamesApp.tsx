import { useEffect, useRef, useState } from 'react';
import { TeacherGate } from '../auth/TeacherGate';
import { gameApi, type MinigameKind, type MinigamePreset, type MinigameSession, type PromptDeck } from '../game/game-api';
import { TeacherContextBar, useTeacherContext } from '../app/teacher-context';
import { workspaceApi } from '../workspace/workspace-api';
import { WorkspaceShell } from '../workspace/WorkspaceShell';

const secondsLabel = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`;
const durationOptions = [30, 60, 90, 120];

type PresetDraft = { id?: string; title: string; prompt: string; durationSeconds: number };
type DeckDraft = { id?: string; title: string; promptsText: string };
type ExpiryReconcileStatus = 'idle' | 'pending' | 'error';
const emptyPreset = (): PresetDraft => ({ title: '', prompt: '', durationSeconds: 30 });
const emptyDeck = (): DeckDraft => ({ title: '', promptsText: '' });
const parsePrompts = (value: string) => value.split(/\r?\n/).map(prompt => prompt.trim()).filter(Boolean);

const activityChoices: Array<{ kind: MinigameKind; title: string; description: string }> = [
  { kind: 'RANDOM_DRAW', title: 'Random Student Draw', description: 'Choose the next participant without breaking the rhythm.' },
  { kind: 'FRENCH_SPRINT', title: 'French Sprint', description: 'Give the room a short, focused burst of French.' },
  { kind: 'TEAM_DRAW', title: 'Team Draw', description: 'Build temporary, balanced teams from the active roster.' },
  { kind: 'PROMPT_DECK', title: 'Prompt Deck', description: 'Lead a prepared sequence one clear question at a time.' },
];

function RandomDrawLaunch({ busy, readOnly, onLaunch }: { busy: boolean; readOnly: boolean; onLaunch: (title: string) => void }) {
  const [title, setTitle] = useState('');
  return <article className="minigame-option selected-minigame-option">
    <div className="minigame-option-heading"><span className="content-sigil game-sigil" aria-hidden="true">⊕</span><div><p className="eyebrow">MINIGAME 01</p><h2>Random Student Draw</h2></div></div>
    <p>Choose the next participant without breaking the rhythm of the lesson.</p>
    <label className="optional-field" htmlFor="draw-title">Activity title <span className="optional-label">optional</span><input id="draw-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Random Student Draw" /></label>
    <button type="button" className="primary-action" disabled={busy || readOnly} onClick={() => onLaunch(title)}>Launch Random Draw</button>
  </article>;
}

function SprintLaunch({ busy, readOnly, presets, onLaunch, onPresetLaunch }: { busy: boolean; readOnly: boolean; presets: MinigamePreset[]; onLaunch: (value: { title: string; prompt: string; durationSeconds: number }) => void; onPresetLaunch: (presetId: string) => void }) {
  const [title, setTitle] = useState('French Sprint');
  const [prompt, setPrompt] = useState('Describe your weekend only in French.');
  const [durationSeconds, setDurationSeconds] = useState(30);
  return <article className="minigame-option selected-minigame-option sprint-launch-option">
    <div className="minigame-option-heading"><span className="content-sigil sprint-sigil" aria-hidden="true">◷</span><div><p className="eyebrow">MINIGAME 02</p><h2>French Sprint</h2></div></div>
    <p>Set a prompt and give the room a short, focused burst of French.</p>
    <section className="quick-launch-block" aria-labelledby="quick-sprint-title">
      <div className="subsection-heading"><div><p className="eyebrow">QUICK LAUNCH</p><h3 id="quick-sprint-title">Start from a fresh prompt</h3></div><span className="section-note">Ready in seconds</span></div>
      <label htmlFor="sprint-title">Title<input id="sprint-title" value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label htmlFor="sprint-prompt">Prompt<textarea id="sprint-prompt" maxLength={500} value={prompt} onChange={event => setPrompt(event.target.value)} /></label>
      <label htmlFor="sprint-duration">Duration<select id="sprint-duration" value={durationSeconds} onChange={event => setDurationSeconds(Number(event.target.value))}>{durationOptions.map(value => <option key={value} value={value}>{value < 120 ? `${value} seconds` : '2 minutes'}</option>)}</select></label>
      <button type="button" className="primary-action" disabled={busy || readOnly || !title.trim() || !prompt.trim()} onClick={() => onLaunch({ title, prompt, durationSeconds })}>Launch French Sprint</button>
    </section>
    <section className="saved-preset-section" aria-labelledby="saved-presets-title">
      <div className="subsection-heading"><div><p className="eyebrow">SAVED PRESETS</p><h3 id="saved-presets-title">Reusable sprint prompts</h3></div><span className="section-note">{presets.length} saved</span></div>
      {presets.length ? <div className="preset-launch-list">{presets.map(preset => <article className="preset-launch-card" key={preset.id}><div><strong>{preset.title}</strong><span>{preset.durationSeconds < 120 ? `${preset.durationSeconds} seconds` : '2 minutes'} · ready to launch</span></div><button type="button" className="secondary-action" disabled={busy || readOnly} onClick={() => onPresetLaunch(preset.id)}>Launch</button></article>)}</div> : <p className="minigame-choice-note">No saved presets yet. Create one in Saved classroom material below.</p>}
    </section>
  </article>;
}

function TeamDrawLaunch({ busy, readOnly, studentCount, onLaunch }: { busy: boolean; readOnly: boolean; studentCount: number; onLaunch: (value: { teamCount: number; title?: string }) => void }) {
  const [title, setTitle] = useState('');
  const [teamCount, setTeamCount] = useState(2);
  const maxTeams = Math.min(10, studentCount);
  return <article className="minigame-option selected-minigame-option team-launch-option">
    <div className="minigame-option-heading"><span className="content-sigil team-sigil" aria-hidden="true">◈</span><div><p className="eyebrow">MINIGAME 03</p><h2>Team Draw</h2></div></div>
    <p>Build temporary, balanced teams from the active roster. No permanent classroom teams are created.</p>
    <label htmlFor="team-count">Number of teams<select id="team-count" value={teamCount} onChange={event => setTeamCount(Number(event.target.value))} disabled={busy || readOnly || maxTeams < 2}>{Array.from({ length: Math.max(0, maxTeams - 1) }, (_, index) => index + 2).map(value => <option key={value} value={value}>{value} teams</option>)}</select></label>
    <div className="team-roster-readiness"><strong>{studentCount}</strong><span>active students ready</span></div>
    {studentCount < 2 && <p className="minigame-choice-note">Add at least two active students before creating teams.</p>}
    <label className="optional-field" htmlFor="team-title">Activity title <span className="optional-label">optional</span><input id="team-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Team Draw" /></label>
    <button type="button" className="primary-action" disabled={busy || readOnly || studentCount < 2 || teamCount > maxTeams} onClick={() => onLaunch({ teamCount, title: title.trim() || undefined })}>Create teams</button>
  </article>;
}

function PromptDeckLaunch({ busy, readOnly, decks, onLaunch, onCreateDeck }: { busy: boolean; readOnly: boolean; decks: PromptDeck[]; onLaunch: (deckId: string) => void; onCreateDeck: () => void }) {
  const [deckId, setDeckId] = useState('');
  return <article className="minigame-option selected-minigame-option prompt-deck-launch-option">
    <div className="minigame-option-heading"><span className="content-sigil deck-sigil" aria-hidden="true">▤</span><div><p className="eyebrow">MINIGAME 04</p><h2>Prompt Deck</h2></div></div>
    <p>Keep a prepared sequence of prompts moving, one clear question at a time.</p>
    {decks.length ? <>
      <div className="prompt-deck-list" aria-label="Available prompt decks">{decks.map(deck => <article className="prompt-deck-choice" key={deck.id}><div><strong>{deck.title}</strong><span>{deck.prompts.length} prompts</span></div><div className="prompt-deck-choice-actions"><button type="button" className="primary-action" disabled={busy || readOnly} onClick={() => onLaunch(deck.id)}>Launch</button><button type="button" className="quiet-action" disabled={busy || readOnly} onClick={() => { setDeckId(deck.id); document.getElementById('prompt-deck')?.focus(); }}>Choose another</button></div></article>)}</div>
      <label className="secondary-content-select" htmlFor="prompt-deck">Choose another deck<select id="prompt-deck" aria-label="Prompt deck" value={deckId} onChange={event => setDeckId(event.target.value)} disabled={busy || readOnly}><option value="">Select a deck for the main action</option>{decks.map(deck => <option key={deck.id} value={deck.id}>{deck.title} · {deck.prompts.length} prompts</option>)}</select></label>
      <div className="prompt-deck-actions"><button type="button" className="secondary-action" disabled={busy || readOnly || !deckId} onClick={() => onLaunch(deckId)}>Launch Prompt Deck</button><button type="button" className="quiet-action" disabled={busy || readOnly || !deckId} onClick={() => setDeckId('')}>Choose another</button></div>
    </> : <div className="minigame-empty-choice"><p className="minigame-choice-note">No prompt decks are saved yet. Create the first deck below, then return here to launch it.</p><button type="button" className="primary-action" disabled={busy || readOnly} onClick={onCreateDeck}>Create first deck</button></div>}
  </article>;
}

function ActiveRandomDraw({ session, busy, readOnly, onDraw, onReset, onEnd }: { session: MinigameSession; busy: boolean; readOnly: boolean; onDraw: () => void; onReset: () => void; onEnd: () => void }) {
  return <article className="active-minigame-card"><div className="active-minigame-heading"><div><p className="eyebrow">LIVE MINIGAME · RANDOM DRAW</p><h2>{session.title}</h2></div><span className="status-chip status-active">ready</span></div><p className="minigame-prompt">{session.prompt}</p><div className="draw-result" aria-live="polite">{session.selectedStudent ? <><span className="result-kicker">Next participant</span><strong>{session.selectedStudent.realName}</strong><span>{session.selectedStudent.alias}{session.selectedStudent.specialty ? ` · ${session.selectedStudent.specialty}` : ''}</span></> : <><span className="result-kicker">Ready when you are</span><strong>Draw the next voice</strong><span>Everyone cycles once before a repeat.</span></>}</div><div className="minigame-controls"><button type="button" className="primary-action" disabled={busy || readOnly} onClick={onDraw}>{session.selectedStudent ? 'Draw again' : 'Draw student'}</button><button type="button" className="secondary-action" disabled={busy || readOnly} onClick={onReset}>Reset cycle</button><button type="button" className="quiet-action" disabled={busy || readOnly} onClick={onEnd}>End game</button></div><div className="draw-count">{session.drawCount} of {session.drawTotal} students drawn this cycle</div></article>;
}

function ActiveTeamDraw({ session, busy, readOnly, onShuffle, onEnd }: { session: MinigameSession; busy: boolean; readOnly: boolean; onShuffle: () => void; onEnd: () => void }) {
  return <article className="active-minigame-card team-live-card"><div className="active-minigame-heading"><div><p className="eyebrow">LIVE MINIGAME · TEAM DRAW</p><h2>{session.title}</h2></div><span className="status-chip status-active">ready</span></div><p className="minigame-prompt">{session.prompt}</p><div className="team-grid" aria-label="Temporary classroom teams">{session.teams?.map(team => <section className="team-card" key={team.team}><p className="result-kicker">Team {team.team}</p><ul>{team.students.map(student => <li key={student.id ?? student.alias}><strong>{student.realName ?? student.alias}</strong><span>{student.alias}</span></li>)}</ul></section>)}</div><div className="minigame-controls"><button type="button" className="primary-action" aria-label="Shuffle teams" disabled={busy || readOnly} onClick={onShuffle}>Shuffle again</button><button type="button" className="quiet-action" disabled={busy || readOnly} onClick={onEnd}>End game</button></div></article>;
}

function ActivePromptDeck({ session, busy, readOnly, onReveal, onRandom, onNext, onReset, onEnd }: { session: MinigameSession; busy: boolean; readOnly: boolean; onReveal: () => void; onRandom: () => void; onNext: () => void; onReset: () => void; onEnd: () => void }) {
  const promptIndex = session.promptIndex ?? 0;
  const promptCount = session.promptCount ?? 0;
  const isLastPrompt = promptCount > 0 && promptIndex + 1 >= promptCount;
  return <article className="active-minigame-card prompt-deck-live-card"><div className="active-minigame-heading"><div><p className="eyebrow">LIVE MINIGAME · PROMPT DECK</p><h2>{session.title}</h2></div><span className="status-chip status-active">ready</span></div><div className="prompt-card" aria-live="polite"><span className="result-kicker">Prompt {promptIndex + 1} of {promptCount}</span><p>{session.prompt}</p><span className="result-kicker">{session.promptRevealed ? 'Visible on Classroom Preview' : 'Ready to reveal on Classroom Preview'}</span></div><div className="minigame-controls"><button type="button" className="primary-action" disabled={busy || readOnly || session.promptRevealed} onClick={onReveal}>{session.promptRevealed ? 'Shown on Classroom Preview' : 'Reveal current'}</button><button type="button" className="secondary-action" disabled={busy || readOnly} onClick={onRandom}>Random prompt</button><button type="button" className="secondary-action" disabled={busy || readOnly || isLastPrompt} onClick={onNext}>{isLastPrompt ? 'Deck complete' : 'Next prompt'}</button><button type="button" className="secondary-action" disabled={busy || readOnly} onClick={onReset}>Start again</button><button type="button" className="quiet-action" disabled={busy || readOnly} onClick={onEnd}>End game</button></div></article>;
}

function ActiveSprint({ session, remainingSeconds, busy, readOnly, expiryStatus, onReconcile, onStart, onPause, onReset, onEnd }: { session: MinigameSession; remainingSeconds: number; busy: boolean; readOnly: boolean; expiryStatus: ExpiryReconcileStatus; onReconcile: () => void; onStart: () => void; onPause: () => void; onReset: () => void; onEnd: () => void }) {
  const expired = session.status === 'RUNNING' && remainingSeconds === 0;
  return <article className="active-minigame-card sprint-live-card"><div className="active-minigame-heading"><div><p className="eyebrow">LIVE MINIGAME · FRENCH SPRINT</p><h2>{session.title}</h2></div><span className={`status-chip status-${expired ? 'paused' : session.status.toLowerCase()}`}>{expired ? expiryStatus === 'error' ? 'sync needed' : 'ending' : session.status.toLowerCase()}</span></div><p className="minigame-prompt">{session.prompt}</p><div className={`sprint-timer${session.status === 'RUNNING' && !expired ? ' is-running' : ''}`} aria-label={`${remainingSeconds} seconds remaining`}>{secondsLabel(remainingSeconds)}</div><div className="minigame-controls">{expired ? <button type="button" disabled={busy || readOnly || expiryStatus !== 'error'} onClick={onReconcile}>{expiryStatus === 'error' ? 'Retry timer sync' : 'Checking timer…'}</button> : session.status === 'RUNNING' ? <button type="button" disabled={busy || readOnly} onClick={onPause}>Pause</button> : <button type="button" disabled={busy || readOnly || remainingSeconds === 0} onClick={onStart}>{session.status === 'PAUSED' ? 'Resume' : 'Start'}</button>}<button type="button" className="secondary-action" disabled={busy || readOnly || expiryStatus === 'pending'} onClick={onReset}>Reset</button><button type="button" className="quiet-action" disabled={busy || readOnly || expiryStatus === 'pending'} onClick={onEnd}>End game</button></div></article>;
}

function PresetForm({ draft, busy, onChange, onCancel, onSave }: { draft: PresetDraft; busy: boolean; onChange: (value: PresetDraft) => void; onCancel: () => void; onSave: () => void }) {
  return <form className="content-form" onSubmit={event => { event.preventDefault(); onSave(); }}><div className="form-heading"><div><p className="eyebrow">{draft.id ? 'EDIT PRESET' : 'NEW PRESET'}</p><h3>{draft.id ? 'Refine a saved sprint' : 'Save a sprint preset'}</h3></div><button type="button" className="icon-close" aria-label="Close preset form" onClick={onCancel}>×</button></div><label htmlFor="preset-title">Title<input id="preset-title" required maxLength={120} value={draft.title} onChange={event => onChange({ ...draft, title: event.target.value })} /></label><label htmlFor="preset-prompt">Prompt<textarea required maxLength={500} id="preset-prompt" value={draft.prompt} onChange={event => onChange({ ...draft, prompt: event.target.value })} /></label><label htmlFor="preset-duration">Duration<select id="preset-duration" value={draft.durationSeconds} onChange={event => onChange({ ...draft, durationSeconds: Number(event.target.value) })}>{durationOptions.map(value => <option key={value} value={value}>{value < 120 ? `${value} seconds` : '2 minutes'}</option>)}</select></label><div className="form-actions"><button type="button" className="secondary-action" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" disabled={busy || !draft.title.trim() || !draft.prompt.trim()}>{busy ? 'Saving…' : draft.id ? 'Save changes' : 'Save preset'}</button></div></form>;
}

function DeckForm({ draft, busy, onChange, onCancel, onSave }: { draft: DeckDraft; busy: boolean; onChange: (value: DeckDraft) => void; onCancel: () => void; onSave: () => void }) {
  const promptCount = parsePrompts(draft.promptsText).length;
  return <form className="content-form" onSubmit={event => { event.preventDefault(); onSave(); }}><div className="form-heading"><div><p className="eyebrow">{draft.id ? 'EDIT DECK' : 'NEW DECK'}</p><h3>{draft.id ? 'Refine a prompt sequence' : 'Prepare a prompt deck'}</h3></div><button type="button" className="icon-close" aria-label="Close prompt deck form" onClick={onCancel}>×</button></div><label htmlFor="deck-title">Title<input id="deck-title" required maxLength={120} value={draft.title} onChange={event => onChange({ ...draft, title: event.target.value })} /></label><label htmlFor="deck-prompts">Prompts <span className="optional-label">one per line · {promptCount}/50</span><textarea required maxLength={25500} id="deck-prompts" value={draft.promptsText} onChange={event => onChange({ ...draft, promptsText: event.target.value })} placeholder="What happened yesterday?\nDescribe the picture.\nAsk a follow-up question." /></label><div className="form-actions"><button type="button" className="secondary-action" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" disabled={busy || !draft.title.trim() || promptCount < 1 || promptCount > 50}>{busy ? 'Saving…' : draft.id ? 'Save changes' : 'Save deck'}</button></div></form>;
}

type ContentLibraryProps = { presets: MinigamePreset[]; decks: PromptDeck[]; presetForm: PresetDraft | null; deckForm: DeckDraft | null; busy: boolean; readOnly: boolean; onPresetForm: (value: PresetDraft | null) => void; onDeckForm: (value: DeckDraft | null) => void; onSavePreset: () => void; onSaveDeck: () => void; onArchivePreset: (id: string) => void; onArchiveDeck: (id: string) => void };

function ContentLibrary({ presets, decks, presetForm, deckForm, busy, readOnly, onPresetForm, onDeckForm, onSavePreset, onSaveDeck, onArchivePreset, onArchiveDeck }: ContentLibraryProps) {
  const openPreset = () => { onDeckForm(null); onPresetForm(emptyPreset()); };
  const openDeck = () => { onPresetForm(null); onDeckForm(emptyDeck()); };
  return <section id="saved-classroom-material" className="content-library" aria-labelledby="content-library-title">
    <div className="section-heading"><div><p className="eyebrow">YOUR LIBRARY</p><h2 id="content-library-title">Saved classroom material</h2><p className="library-lede">Reusable prompts stay here until the room needs them.</p></div><div className="library-summary"><span><strong>{presets.length}</strong> sprint presets</span><span><strong>{decks.length}</strong> prompt decks</span></div></div>
    <div className="library-grid">
      <section className="library-panel" aria-labelledby="library-presets-title">
        <div className="library-panel-heading"><div><p className="eyebrow">FRENCH SPRINTS</p><h3 id="library-presets-title">Presets</h3></div><button type="button" className="primary-action" disabled={busy || readOnly} onClick={openPreset}>{presets.length ? 'New preset' : 'Create first preset'}</button></div>
        {presetForm && <PresetForm draft={presetForm} busy={busy} onChange={onPresetForm} onCancel={() => onPresetForm(null)} onSave={onSavePreset} />}
        {presets.length ? <div className="content-card-list">{presets.map(preset => <article className="content-card" key={preset.id}><div><h4>{preset.title}</h4><p>{preset.prompt}</p><span>{secondsLabel(preset.durationSeconds)}</span></div><div className="content-card-actions"><button type="button" className="quiet-action" disabled={busy || readOnly} onClick={() => { onDeckForm(null); onPresetForm({ id: preset.id, title: preset.title, prompt: preset.prompt, durationSeconds: preset.durationSeconds }); }}>Edit</button><button type="button" className="quiet-action" disabled={busy || readOnly} onClick={() => onArchivePreset(preset.id)}>Archive</button></div></article>)}</div> : !presetForm && <div className="library-empty"><p>No saved sprint presets yet.</p><span>Save a prompt once to launch it without retyping.</span><button type="button" className="primary-action" disabled={busy || readOnly} onClick={openPreset}>Create first preset</button></div>}
      </section>
      <section className="library-panel" aria-labelledby="library-decks-title">
        <div className="library-panel-heading"><div><p className="eyebrow">PROMPT SEQUENCES</p><h3 id="library-decks-title">Decks</h3></div><button type="button" className="primary-action" disabled={busy || readOnly} onClick={openDeck}>{decks.length ? 'New deck' : 'Create first deck'}</button></div>
        {deckForm && <DeckForm draft={deckForm} busy={busy} onChange={onDeckForm} onCancel={() => onDeckForm(null)} onSave={onSaveDeck} />}
        {decks.length ? <div className="content-card-list">{decks.map(deck => <article className="content-card" key={deck.id}><div><h4>{deck.title}</h4><p>{deck.prompts[0]}</p><span>{deck.prompts.length} prompts</span></div><div className="content-card-actions"><button type="button" className="quiet-action" disabled={busy || readOnly} onClick={() => { onPresetForm(null); onDeckForm({ id: deck.id, title: deck.title, promptsText: deck.prompts.join('\n') }); }}>Edit</button><button type="button" className="quiet-action" disabled={busy || readOnly} onClick={() => onArchiveDeck(deck.id)}>Archive</button></div></article>)}</div> : !deckForm && <div className="library-empty"><p>No prompt decks yet.</p><span>Build a sequence once, then reveal each prompt as you lead.</span><button type="button" className="primary-action" disabled={busy || readOnly} onClick={openDeck}>Create first deck</button></div>}
      </section>
    </div>
  </section>;
}

function ActivityChoice({ choice, selected, summary, onSelect }: { choice: (typeof activityChoices)[number]; selected: boolean; summary: string; onSelect: () => void }) {
  return <button type="button" className={`activity-choice${selected ? ' is-selected' : ''}`} aria-label={`${selected ? 'Selected' : 'Choose'} ${choice.title}`} aria-pressed={selected} onClick={onSelect}><span className={`content-sigil ${choice.kind === 'TEAM_DRAW' ? 'team-sigil' : choice.kind === 'PROMPT_DECK' ? 'deck-sigil' : choice.kind === 'FRENCH_SPRINT' ? 'sprint-sigil' : 'game-sigil'}`} aria-hidden="true">{choice.kind === 'TEAM_DRAW' ? '◈' : choice.kind === 'PROMPT_DECK' ? '▤' : choice.kind === 'FRENCH_SPRINT' ? '◷' : '⊕'}</span><span><strong>{choice.title}</strong><small>{choice.description}</small><em>{summary}</em></span><span className="activity-choice-arrow" aria-hidden="true">{selected ? '●' : '→'}</span></button>;
}

function MinigamesPage() {
  const context = useTeacherContext();
  const [session, setSession] = useState<MinigameSession | null>(null);
  const [presets, setPresets] = useState<MinigamePreset[]>([]);
  const [decks, setDecks] = useState<PromptDeck[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [selectedKind, setSelectedKind] = useState<MinigameKind>('RANDOM_DRAW');
  const [presetForm, setPresetForm] = useState<PresetDraft | null>(null);
  const [deckForm, setDeckForm] = useState<DeckDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clock, setClock] = useState(Date.now());
  const [expiryReconcileStatus, setExpiryReconcileStatus] = useState<ExpiryReconcileStatus>('idle');
  const [loadedContextKey, setLoadedContextKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const reconcileGeneration = useRef(0);
  const contextKey = context.groupId ? `${context.yearId ?? ''}:${context.groupId}:${context.revision}` : null;
  const contextIdentityKey = context.groupId ? `${context.yearId ?? ''}:${context.groupId}` : null;
  const currentContextKey = useRef(contextKey);
  const previousContextIdentityKey = useRef(contextIdentityKey);
  currentContextKey.current = contextKey;
  const readOnly = context.historical;
  const dataReady = contextKey === null || loadedContextKey === contextKey;
  const visibleSession = dataReady ? session : null;
  const visiblePresets = dataReady ? presets : [];
  const visibleDecks = dataReady ? decks : [];
  const visibleStudentCount = dataReady ? studentCount : 0;
  const visiblePresetForm = dataReady ? presetForm : null;
  const visibleDeckForm = dataReady ? deckForm : null;

  function clearLoadedState() {
    setSession(null);
    setPresets([]);
    setDecks([]);
    setStudentCount(0);
    setPresetForm(null);
    setDeckForm(null);
    setExpiryReconcileStatus('idle');
    reconcileGeneration.current += 1;
  }

  useEffect(() => {
    let cancelled = false;
    const requestKey = contextKey;
    const contextChanged = previousContextIdentityKey.current !== contextIdentityKey;
    previousContextIdentityKey.current = contextIdentityKey;
    setLoading(true);
    setLoadedContextKey(null);
    setLoadError(false);
    clearLoadedState();
    if (contextChanged) setNotice('');
    setError('');
    const current = context.groupId ? gameApi.currentMinigame(context.groupId) : Promise.resolve(null);
    const roster = context.groupId ? workspaceApi.students(context.groupId, false) : Promise.resolve([]);
    Promise.all([current, gameApi.minigamePresets(), gameApi.promptDecks(), roster]).then(([loadedSession, loadedPresets, loadedDecks, loadedStudents]) => {
      if (cancelled || currentContextKey.current !== requestKey) return;
      setSession(loadedSession);
      setSelectedKind(currentKind => loadedSession?.kind ?? currentKind);
      setPresets(loadedPresets);
      setDecks(loadedDecks);
      setStudentCount(loadedStudents.length);
      setLoadedContextKey(requestKey);
      setError('');
    }).catch(() => {
      if (!cancelled && currentContextKey.current === requestKey) {
        clearLoadedState();
        setLoadedContextKey(null);
        setLoadError(true);
        setNotice('');
        setError('Could not load the activity desk.');
      }
    }).finally(() => { if (!cancelled && currentContextKey.current === requestKey) setLoading(false); });
    return () => { cancelled = true; };
  }, [context.groupId, context.yearId, context.revision]);

  useEffect(() => {
    if (visibleSession?.status !== 'RUNNING') return;
    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [visibleSession?.status, visibleSession?.startedAt]);

  const remainingSeconds = visibleSession?.status === 'RUNNING' && visibleSession.startedAt ? Math.max(0, visibleSession.remainingSeconds - Math.floor((clock - Date.parse(visibleSession.startedAt)) / 1000)) : visibleSession?.remainingSeconds ?? 0;
  const expiredSprint = visibleSession?.kind === 'FRENCH_SPRINT' && visibleSession.status === 'RUNNING' && remainingSeconds === 0;

  async function reconcileExpiredSprint() {
    if (!session || !expiredSprint || expiryReconcileStatus === 'pending') return;
    const sessionId = session.id;
    const requestKey = contextKey;
    if (!requestKey || currentContextKey.current !== requestKey) return;
    const generation = ++reconcileGeneration.current;
    setExpiryReconcileStatus('pending');
    setError(''); setNotice('');
    try {
      const value = await gameApi.currentMinigame(session.groupId);
      if (generation !== reconcileGeneration.current || currentContextKey.current !== requestKey) return;
      if (value?.id === sessionId && value.status === 'RUNNING' && value.remainingSeconds > 0) {
        setSession(value);
        setNotice('French Sprint timer synchronized.');
        setExpiryReconcileStatus('idle');
      } else if (value?.id === sessionId && value.status === 'RUNNING') {
        setExpiryReconcileStatus('error');
        setError('The French Sprint timer could not reach a terminal state. Try again.');
      } else {
        setSession(value);
        setNotice('French Sprint ended when the timer reached zero.');
        setExpiryReconcileStatus('idle');
      }
      context.refresh();
    } catch {
      if (generation === reconcileGeneration.current && currentContextKey.current === requestKey) {
        setExpiryReconcileStatus('error');
        setError('Could not reconcile the French Sprint timer. Try again.');
      }
    }
  }

  useEffect(() => {
    if (!expiredSprint || busy || expiryReconcileStatus !== 'idle') return;
    void reconcileExpiredSprint();
  }, [expiredSprint, busy, expiryReconcileStatus, session?.id, session?.groupId]);

  async function launch(action: () => Promise<MinigameSession>, message: string) {
    const requestKey = contextKey;
    if (busy || readOnly || !requestKey || currentContextKey.current !== requestKey) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const value = await action();
      if (currentContextKey.current !== requestKey) return;
      setSession(value); setExpiryReconcileStatus('idle'); setNotice(message); context.refresh();
    } catch (caught) {
      if (currentContextKey.current === requestKey) setError((caught as Error).message || 'Could not launch the minigame.');
    } finally { setBusy(false); }
  }

  async function sessionAction(action: () => Promise<MinigameSession>, message: string, ended = false) {
    const requestKey = contextKey;
    if (busy || !session || readOnly || !requestKey || currentContextKey.current !== requestKey) return;
    const endedKind = session.kind;
    setBusy(true); setError(''); setNotice('');
    try {
      const value = await action();
      if (currentContextKey.current !== requestKey) return;
      setSession(ended ? null : value); if (ended) setSelectedKind(endedKind); setExpiryReconcileStatus('idle'); setNotice(message); context.refresh();
    } catch (caught) {
      if (currentContextKey.current === requestKey) setError((caught as Error).message || 'Could not update the minigame.');
    } finally { setBusy(false); }
  }

  async function savePreset() {
    if (!presetForm || busy || readOnly) return;
    const requestKey = contextKey;
    if (!requestKey || currentContextKey.current !== requestKey) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const value = presetForm.id ? await gameApi.updateMinigamePreset(presetForm.id, { title: presetForm.title, prompt: presetForm.prompt, durationSeconds: presetForm.durationSeconds }) : await gameApi.createMinigamePreset({ title: presetForm.title, prompt: presetForm.prompt, durationSeconds: presetForm.durationSeconds });
      if (currentContextKey.current !== requestKey) return;
      setPresets(current => presetForm.id ? current.map(item => item.id === value.id ? value : item) : [value, ...current]);
      setPresetForm(null);
      setNotice(presetForm.id ? 'Sprint preset updated.' : 'Sprint preset saved.');
    } catch (caught) { if (currentContextKey.current === requestKey) setError((caught as Error).message || 'Could not save the sprint preset.'); } finally { setBusy(false); }
  }

  async function saveDeck() {
    if (!deckForm || busy || readOnly) return;
    const requestKey = contextKey;
    if (!requestKey || currentContextKey.current !== requestKey) return;
    const prompts = parsePrompts(deckForm.promptsText);
    if (!deckForm.title.trim() || !prompts.length || prompts.length > 50) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const value = deckForm.id ? await gameApi.updatePromptDeck(deckForm.id, { title: deckForm.title, prompts }) : await gameApi.createPromptDeck({ title: deckForm.title, prompts });
      if (currentContextKey.current !== requestKey) return;
      setDecks(current => deckForm.id ? current.map(item => item.id === value.id ? value : item) : [value, ...current]);
      setDeckForm(null);
      setNotice(deckForm.id ? 'Prompt deck updated.' : 'Prompt deck saved.');
    } catch (caught) { if (currentContextKey.current === requestKey) setError((caught as Error).message || 'Could not save the prompt deck.'); } finally { setBusy(false); }
  }

  async function archiveContent(action: () => Promise<MinigamePreset | PromptDeck>, message: string, kind: 'preset' | 'deck') {
    const requestKey = contextKey;
    if (busy || readOnly || !requestKey || currentContextKey.current !== requestKey) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const value = await action();
      if (currentContextKey.current !== requestKey) return;
      if (kind === 'preset') setPresets(current => current.filter(item => item.id !== value.id)); else setDecks(current => current.filter(item => item.id !== value.id)); setNotice(message);
    } catch (caught) { if (currentContextKey.current === requestKey) setError((caught as Error).message || 'Could not archive saved material.'); } finally { setBusy(false); }
  }

  function openDeckForm() {
    setSelectedKind('PROMPT_DECK');
    setPresetForm(null);
    setDeckForm(emptyDeck());
    window.setTimeout(() => document.getElementById('deck-title')?.focus(), 0);
  }

  const projection = context.groupId ? `/#/projection?group=${encodeURIComponent(context.groupId)}` : '/#/projection';
  const choiceSummary = (kind: MinigameKind) => kind === 'TEAM_DRAW' ? visibleStudentCount >= 2 ? `${visibleStudentCount} students ready` : 'Needs 2 students' : kind === 'FRENCH_SPRINT' ? visiblePresets.length ? `${visiblePresets.length} saved preset${visiblePresets.length === 1 ? '' : 's'}` : 'Quick launch available' : kind === 'PROMPT_DECK' ? visibleDecks.length ? `${visibleDecks.length} saved deck${visibleDecks.length === 1 ? '' : 's'}` : 'Create a first deck' : 'One tap to begin';

  return <WorkspaceShell activeRoute="minigames">
    <header className="product-page-header"><div><p className="eyebrow">ACADEMY ACTIVITIES</p><h1>Minigames</h1><p className="page-lede">Choose the activity that fits the room. Keep the setup light and the next action obvious.</p></div><div className="page-header-actions"><a className="action-link secondary-action" href={projection}>Open Classroom Preview</a></div></header>
    <TeacherContextBar context={context} eyebrow="Minigame classroom" />
    {notice && <p className="game-notice" role="status">{notice}</p>}{error && <p className="game-error" role="alert">{error}{loadError && <button type="button" onClick={context.refresh}>Retry</button>}</p>}
    {loading ? <p className="game-loading" role="status">Preparing the activity desk…</p> : !context.groupId ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">⊕</span><h2>Choose a classroom</h2><p>Select a group above before launching a minigame.</p></div> : visibleSession?.kind === 'RANDOM_DRAW' ? <ActiveRandomDraw session={visibleSession} busy={busy} readOnly={readOnly} onDraw={() => sessionAction(() => gameApi.drawStudent(visibleSession.id), 'Student drawn.')} onReset={() => sessionAction(() => gameApi.resetMinigame(visibleSession.id), 'Draw cycle reset.')} onEnd={() => sessionAction(() => gameApi.endMinigame(visibleSession.id), 'Minigame ended.', true)} /> : visibleSession?.kind === 'TEAM_DRAW' ? <ActiveTeamDraw session={visibleSession} busy={busy} readOnly={readOnly} onShuffle={() => sessionAction(() => gameApi.shuffleTeamDraw(visibleSession.id), 'Teams shuffled.')} onEnd={() => sessionAction(() => gameApi.endMinigame(visibleSession.id), 'Minigame ended.', true)} /> : visibleSession?.kind === 'PROMPT_DECK' ? <ActivePromptDeck session={visibleSession} busy={busy} readOnly={readOnly} onReveal={() => sessionAction(() => gameApi.revealPrompt(visibleSession.id), 'Current prompt revealed.')} onRandom={() => sessionAction(() => gameApi.randomPrompt(visibleSession.id), 'Random prompt ready.')} onNext={() => sessionAction(() => gameApi.nextPrompt(visibleSession.id), 'Next prompt ready.')} onReset={() => sessionAction(() => gameApi.resetMinigame(visibleSession.id), 'Prompt deck restarted.')} onEnd={() => sessionAction(() => gameApi.endMinigame(visibleSession.id), 'Minigame ended.', true)} /> : visibleSession ? <ActiveSprint session={visibleSession} remainingSeconds={remainingSeconds} busy={busy} readOnly={readOnly} expiryStatus={expiryReconcileStatus} onReconcile={() => void reconcileExpiredSprint()} onStart={() => sessionAction(() => visibleSession.status === 'PAUSED' ? gameApi.resumeMinigame(visibleSession.id) : gameApi.startMinigame(visibleSession.id), visibleSession.status === 'PAUSED' ? 'French Sprint resumed.' : 'French Sprint started.')} onPause={() => sessionAction(() => gameApi.pauseMinigame(visibleSession.id), 'French Sprint paused.')} onReset={() => sessionAction(() => gameApi.resetMinigame(visibleSession.id), 'French Sprint reset.')} onEnd={() => sessionAction(() => gameApi.endMinigame(visibleSession.id), 'Minigame ended.', true)} /> : <>
      <section className="minigame-intro"><p className="eyebrow">CHOOSE AN ACTIVITY</p><h2>What does the room need next?</h2><p>Pick one activity to reveal its focused launch controls. Your saved material stays separate below.</p></section>
      <div className="activity-choice-grid" aria-label="Choose a minigame">{activityChoices.map(choice => <ActivityChoice key={choice.kind} choice={choice} selected={selectedKind === choice.kind} summary={choiceSummary(choice.kind)} onSelect={() => setSelectedKind(choice.kind)} />)}</div>
      <div className="selected-minigame-panel">{selectedKind === 'RANDOM_DRAW' && <RandomDrawLaunch busy={busy} readOnly={readOnly} onLaunch={title => launch(() => gameApi.launchRandomDraw(context.groupId!, title.trim() || undefined), 'Random Student Draw launched.')} />}{selectedKind === 'FRENCH_SPRINT' && <SprintLaunch busy={busy} readOnly={readOnly} presets={visiblePresets} onLaunch={value => launch(() => gameApi.launchFrenchSprint(context.groupId!, value), 'French Sprint launched.')} onPresetLaunch={presetId => launch(() => gameApi.launchFrenchSprintFromPreset(context.groupId!, presetId), 'French Sprint launched from preset.')} />}{selectedKind === 'TEAM_DRAW' && <TeamDrawLaunch busy={busy} readOnly={readOnly} studentCount={visibleStudentCount} onLaunch={value => launch(() => gameApi.launchTeamDraw(context.groupId!, value), 'Teams created.')} />}{selectedKind === 'PROMPT_DECK' && <PromptDeckLaunch busy={busy} readOnly={readOnly} decks={visibleDecks} onLaunch={deckId => launch(() => gameApi.launchPromptDeck(context.groupId!, deckId), 'Prompt Deck launched.')} onCreateDeck={openDeckForm} />}</div>
    </>}
    {context.groupId && <ContentLibrary presets={visiblePresets} decks={visibleDecks} presetForm={visiblePresetForm} deckForm={visibleDeckForm} busy={busy} readOnly={readOnly} onPresetForm={setPresetForm} onDeckForm={setDeckForm} onSavePreset={savePreset} onSaveDeck={saveDeck} onArchivePreset={id => archiveContent(() => gameApi.archiveMinigamePreset(id), 'Sprint preset archived.', 'preset')} onArchiveDeck={id => archiveContent(() => gameApi.archivePromptDeck(id), 'Prompt deck archived.', 'deck')} />}
  </WorkspaceShell>;
}

export function MinigamesApp() { return <TeacherGate activeRoute="minigames"><MinigamesPage /></TeacherGate>; }
