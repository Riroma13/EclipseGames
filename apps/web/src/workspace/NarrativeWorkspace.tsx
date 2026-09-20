import { useEffect, useRef, useState } from 'react';
import { TeacherContextBar, useTeacherContext } from '../app/teacher-context';
import { workspaceApi, type ApiFailure, type NarrativeEvent, type NarrativeStateDto } from './workspace-api';
import { WorkspaceShell } from './WorkspaceShell';

const sceneSummaries: Record<string, string> = {
  t1_el_apagon: 'Las pantallas se apagan y una señal breve deja una fecha, una coordenada y el símbolo de Éclipse.',
  t1_el_mensaje: 'La señal contiene una frase incompleta cuya advertencia aparece al ordenar sus fragmentos.',
  t1_eclipse: 'Los primeros indicios forman el emblema de Éclipse, un protocolo que decide cuándo puede verse la información.',
  t2_el_expediente: 'Aparece un expediente sin nombre con decisiones tomadas durante el apagón y el aislamiento.',
  t2_la_anomalia: 'Una línea del expediente no encaja y se repite en tres lugares distintos.',
  t2_la_reunion: 'Un acta sin firmas y un fragmento de audio conservan una discusión sobre el archivo.',
  t3_la_prueba: 'El archivo propone comprobar si la señal, el mensaje y el expediente forman una misma historia.',
  t3_el_archivo_eclipse: 'El archivo registra cómo Éclipse conservó información y restringió comunicaciones durante la emergencia.',
  t3_la_llamada: 'La señal vuelve como una comunicación recuperable desde fuera de la isla.',
};
const mechanicRequirements: Record<string, 'REQUIRED'|'OPTIONAL'|'NONE'> = {
  t1_el_apagon: 'REQUIRED', t1_el_mensaje: 'OPTIONAL', t1_eclipse: 'NONE',
  t2_el_expediente: 'OPTIONAL', t2_la_anomalia: 'REQUIRED', t2_la_reunion: 'NONE',
  t3_la_prueba: 'OPTIONAL', t3_el_archivo_eclipse: 'REQUIRED', t3_la_llamada: 'NONE',
};
const mechanicKinds: Record<string, 'CHALLENGE'|'MINIGAME'> = {
  t1_el_apagon: 'CHALLENGE', t1_el_mensaje: 'MINIGAME', t2_el_expediente: 'CHALLENGE',
  t2_la_anomalia: 'MINIGAME', t3_la_prueba: 'CHALLENGE', t3_el_archivo_eclipse: 'MINIGAME',
};

const stateLabel: Record<NarrativeEvent['state'], string> = { BLOCKED: 'Bloqueado', AVAILABLE: 'Disponible', COMPLETED: 'Completado' };
const mechanicLabel = (event: NarrativeEvent) => {
  const requirement = mechanicRequirements[event.key];
  if (requirement === 'NONE') return 'Mecánica: ninguna';
  return `Mecánica: ${requirement === 'REQUIRED' ? 'obligatoria' : 'opcional'} · ${(event.mechanicKind ?? mechanicKinds[event.key]) === 'MINIGAME' ? 'minijuego' : 'desafío'}`;
};

function messageFor(error: unknown) {
  const failure = error as ApiFailure;
  if (failure.status === 409) return 'La narrativa cambió. Se ha actualizado la escena; revisa y vuelve a intentarlo.';
  if (failure.status === 401) return 'La sesión ha caducado.';
  if (failure.status === 404) return 'Este grupo o año ya no está disponible.';
  return failure.message || 'No se pudo completar la acción.';
}

export function NarrativeWorkspace({ groupId, academicYearId, historical = false }: { groupId: string; academicYearId: string; historical?: boolean }) {
  const [data, setData] = useState<NarrativeStateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [linkId, setLinkId] = useState('');
  const generation = useRef(0);
  const keys = useRef(new Map<string, string>());
  const contextKey = `${groupId}:${academicYearId}`;

  const load = () => {
    const request = ++generation.current;
    setLoading(true); setError('');
    void workspaceApi.narrative(groupId, academicYearId).then(value => {
      if (request !== generation.current) return;
      setData(value); setActionError('');
    }).catch(caught => { if (request === generation.current && (caught as Error).name !== 'AbortError') setError(messageFor(caught)); })
      .finally(() => { if (request === generation.current) setLoading(false); });
  };

  useEffect(() => { keys.current.clear(); setData(null); setLinkId(''); load(); return () => { generation.current += 1; }; }, [contextKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function command(event: NarrativeEvent, action: 'start'|'reveal-next-clue'|'link'|'complete') {
    if (!data || busy || effectiveReadOnly || event.state !== 'AVAILABLE') return;
    const link = action === 'link' ? { kind: (event.mechanicKind ?? mechanicKinds[event.key]), id: linkId.trim() } : undefined;
    if (action === 'link' && (!link?.kind || !linkId.trim())) return;
    const signature = `${contextKey}:${event.key}:${action}:${data.revision}:${link ? `${link.kind}:${link.id}` : ''}`;
    const key = keys.current.get(signature) ?? crypto.randomUUID();
    keys.current.set(signature, key);
    const request = ++generation.current;
    setBusy(true); setActionError('');
    try {
      const result = await workspaceApi.narrativeCommand(groupId, academicYearId, event.key, action, data.revision, key, link);
      if (request !== generation.current) return;
      keys.current.delete(signature); setData(result.value); setLinkId('');
    } catch (caught) {
      if (request !== generation.current) return;
      const failure = caught as ApiFailure;
      if (failure.name === 'AbortError') keys.current.delete(signature);
      else if (failure.status !== undefined) { keys.current.delete(signature); setActionError(messageFor(caught)); if (failure.status === 409) load(); }
      else setActionError('No se confirmó la respuesta. Puedes reintentar con la misma clave.');
    } finally { if (request === generation.current) setBusy(false); }
  }

  if (loading && !data) return <p className="status" role="status">Cargando narrativa…</p>;
  if (error) return <p className="error" role="alert">{error} <button type="button" onClick={load}>Reintentar</button></p>;
  if (!data) return <p className="empty-state">Selecciona un grupo para abrir la narrativa.</p>;
  const effectiveReadOnly = historical || data.archived;
  const current = data.events.find(event => event.state === 'AVAILABLE');
  return <section className="narrative-workspace" aria-label="Narrativa Éclipse">
    {effectiveReadOnly ? <p className="read-only-note" role="status">Año archivado — la narrativa es de solo lectura.</p> : null}
    <div className="narrative-progress"><div><p className="eyebrow">PROTOCOLO ÉCLIPSE · {data.currentTerm}</p><h1>Narrativa</h1><p className="muted">{data.completedCount} de 9 escenas completadas · controles privados del docente</p></div><strong>{Math.round(data.completedCount / 9 * 100)}%</strong></div>
    {current && <article className="narrative-current panel"><p className="eyebrow">ESCENA ACTUAL</p><h2>{current.title}</h2><p>{sceneSummaries[current.key]}</p><p className="narrative-mechanic">{mechanicLabel(current)}</p>{current.startedAt === null && <button type="button" disabled={busy || effectiveReadOnly} onClick={() => void command(current, 'start')}>Abrir escena</button>}{current.startedAt !== null && <div className="narrative-controls"><div className="narrative-clues"><h3>Pistas privadas</h3>{current.clues.map(clue => clue.revealed ? <p key={clue.ordinal}><strong>Pista {clue.ordinal}:</strong> {clue.text}</p> : null)}<button type="button" disabled={busy || effectiveReadOnly || current.clues.every(clue => clue.revealed)} onClick={() => void command(current, 'reveal-next-clue')}>{current.clues.every(clue => clue.revealed) ? 'Todas las pistas reveladas' : 'Revelar siguiente pista'}</button></div>{mechanicRequirements[current.key] !== 'NONE' && <label>Identificador del {((current.mechanicKind ?? mechanicKinds[current.key]) === 'MINIGAME') ? 'minijuego' : 'desafío'}<input value={linkId} disabled={busy || effectiveReadOnly} onChange={event => setLinkId(event.target.value)} placeholder="UUID del recurso existente" /><button type="button" disabled={busy || effectiveReadOnly || !linkId.trim()} onClick={() => void command(current, 'link')}>Vincular recurso</button></label>}<button type="button" disabled={busy || effectiveReadOnly || (mechanicRequirements[current.key] === 'REQUIRED' && !current.mechanicId)} onClick={() => void command(current, 'complete')}>Completar escena</button></div>}</article>}
    {actionError && <p className="error" role="alert">{actionError}</p>}
    <div className="narrative-timeline"><h2>Secuencia de nueve escenas</h2>{data.events.map(event => <article className={`narrative-event is-${event.state.toLowerCase()}`} key={event.key}><div><span className="narrative-ordinal">{event.ordinal}</span><div><h3>{event.title}</h3><p>{event.term} · {stateLabel[event.state]}</p></div></div><span>{event.state === 'COMPLETED' ? '✓' : event.state === 'AVAILABLE' ? '●' : '○'}</span></article>)}</div>
  </section>;
}

export function NarrativeApp() {
  const context = useTeacherContext();
  return <WorkspaceShell activeRoute="narrative"><TeacherContextBar context={context} eyebrow="Narrativa · grupo y año" />{context.loading && !context.groupId ? <p className="status" role="status">Cargando grupos…</p> : context.error ? <p className="error" role="alert">{context.error} <button type="button" onClick={context.refresh}>Reintentar</button></p> : !context.groupId || !context.yearId ? <p className="empty-state">No hay un grupo disponible para este año.</p> : <NarrativeWorkspace groupId={context.groupId} academicYearId={context.yearId} historical={context.historical} />}</WorkspaceShell>;
}
