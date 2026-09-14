import { useEffect, useMemo, useRef, useState } from 'react';
import { workspaceApi, type ApiFailure, type RubricDto, type RubricLevel, type XpCategory } from './workspace-api';
import type { WorkspaceStudentContext } from './workspace-state';

const labels: Record<XpCategory, { dimension:string; levels:string[] }> = {
  COMMUNICATION: { dimension:'Comunicación', levels:['Insuficiente','En desarrollo','Adecuado','Excelente'] },
  PRECISION: { dimension:'Precisión', levels:['Insuficiente','En desarrollo','Adecuado','Excelente'] },
  CONSISTENCY: { dimension:'Constancia', levels:['Insuficiente','En desarrollo','Adecuado','Excelente'] },
  COLLABORATION: { dimension:'Colaboración', levels:['Insuficiente','En desarrollo','Adecuado','Excelente'] },
};
const categories: XpCategory[] = ['COMMUNICATION','PRECISION','CONSISTENCY','COLLABORATION'];
const emptyOverrides = (): Record<XpCategory, RubricLevel|null> => ({ COMMUNICATION:null, PRECISION:null, CONSISTENCY:null, COLLABORATION:null });

export function formatRubricGrade(value:string) { return `${value.replace(/0+$/, '').replace(/\.$/, '').replace('.', ',')}/10`; }

export function QuarterlyRubric({ context, onSessionExpired }: { context: WorkspaceStudentContext; onSessionExpired?: () => void }) {
  const [terms, setTerms] = useState<Array<{id:string;code:'T1'|'T2'|'T3';startsOn:string;endsOn:string}>>([]);
  const [termId, setTermId] = useState('');
  const [rubric, setRubric] = useState<RubricDto|null>(null);
  const [draft, setDraft] = useState<Record<XpCategory, RubricLevel|null>>(emptyOverrides());
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const [rubricRetry, setRubricRetry] = useState(0);
  const [reason, setReason] = useState('');
  const [confirmReopen, setConfirmReopen] = useState(false);
  const keyRef = useRef<string|null>(null);
  const contextKey = `${context.academicYearId}:${context.groupId}:${context.studentId}`;

  useEffect(() => { keyRef.current = null; setTerms([]); setTermId(''); setRubric(null); setDraft(emptyOverrides()); setComment(''); setError(''); setReason(''); setConfirmReopen(false); }, [contextKey]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    workspaceApi.calendar(context.academicYearId, controller.signal).then(calendar => {
      if (controller.signal.aborted) return;
      if (calendar.configured) { setTerms(calendar.terms); setTermId(current => current && calendar.terms.some(term => term.id === current) ? current : calendar.terms[0]?.id ?? ''); }
      else setTerms([]);
    }).catch((caught:ApiFailure) => { if (caught.name !== 'AbortError') setError(caught.status === 401 ? 'La sesión ha caducado. Vuelve a iniciar sesión.' : 'No se pudo cargar el calendario. Reintentar.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [contextKey, retry]);
  useEffect(() => {
    if (!termId) return;
    const controller = new AbortController(); setLoading(true); setError(''); setRubric(null); keyRef.current = null;
    workspaceApi.rubric(context.studentId, termId, context.academicYearId, controller.signal).then(value => { if (!controller.signal.aborted) { setRubric(value); setDraft(Object.fromEntries(categories.map(category => [category, value.categories.find(item => item.category === category)?.overrideLevel ?? null])) as Record<XpCategory, RubricLevel|null>); setComment(value.draftComment ?? value.snapshot?.comment ?? ''); } }).catch((caught:ApiFailure) => { if (caught.name !== 'AbortError') { if (caught.status === 401) onSessionExpired?.(); setError(caught.status === 401 ? 'La sesión ha caducado. Vuelve a iniciar sesión.' : 'No se pudo cargar la rúbrica. Reintentar.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [contextKey, termId, rubricRetry]);

  const readOnly = context.readOnly || Boolean(rubric?.archived);
  const editable = !readOnly && rubric?.state !== 'CLOSED';
  const key = () => keyRef.current ?? (keyRef.current = crypto.randomUUID());
  function reload() { setRetry(value => value + 1); setRubricRetry(value => value + 1); }
  function changeTerm(next: string) { if (next !== termId && rubric && (JSON.stringify(draft) !== JSON.stringify(Object.fromEntries(categories.map(category => [category, rubric.categories.find(item => item.category === category)?.overrideLevel ?? null]))) || comment !== (rubric.draftComment ?? rubric.snapshot?.comment ?? '')) && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return; setTermId(next); }
  function cancel() { if (rubric) { setDraft(Object.fromEntries(categories.map(category => [category, rubric.categories.find(item => item.category === category)?.overrideLevel ?? null])) as Record<XpCategory, RubricLevel|null>); setComment(rubric.draftComment ?? rubric.snapshot?.comment ?? ''); } }
  async function mutate(run: (idempotencyKey:string) => Promise<RubricDto>, success:string) { if (pending) return; setPending(true); setError(''); try { const result = await run(key()); setRubric(result); setDraft(Object.fromEntries(categories.map(category => [category, result.categories.find(item => item.category === category)?.overrideLevel ?? null])) as Record<XpCategory, RubricLevel|null>); setComment(result.draftComment ?? result.snapshot?.comment ?? ''); keyRef.current = null; } catch (caught) { const failure = caught as ApiFailure; if (failure.status === 401) onSessionExpired?.(); setError(failure.status === 409 ? 'La versión cambió. Tus cambios se conservaron. Recarga para comparar.' : failure.status === 401 ? 'La sesión ha caducado. Vuelve a iniciar sesión.' : `${success} No se pudo completar. Reintentar.`); } finally { setPending(false); } }
  const selectedTerm = useMemo(() => terms.find(term => term.id === termId), [terms, termId]);
  if (loading && !rubric) return <section className="panel-section quarterly-rubric" aria-label="Rúbrica trimestral"><h3>Rúbrica trimestral</h3><p className="status" role="status">Cargando rúbrica…</p></section>;
  return <section className="panel-section quarterly-rubric" aria-label="Rúbrica trimestral">
    <div className="action-heading"><div><p className="eyebrow">OBSERVACIÓN PRIVADA</p><h3>Rúbrica trimestral</h3></div>{rubric?.state === 'CLOSED' && <strong>Versión {rubric.snapshot?.version}</strong>}</div>
    {error && <p className="error" role="alert">{error} <button type="button" onClick={reload}>Reintentar</button>{error.includes('versión') && <button type="button" onClick={reload}>Recargar</button>}</p>}
    {!terms.length ? <p className="empty-state">No hay trimestres configurados. Configura el calendario para evaluar.</p> : <>
      <label htmlFor="rubric-term">Trimestre<select id="rubric-term" aria-label="Trimestre" value={termId} onChange={event => changeTerm(event.target.value)} disabled={pending}><option value="">Selecciona un trimestre</option>{terms.map(term => <option key={term.id} value={term.id}>{term.code}</option>)}</select></label>
      {!termId ? <p className="empty-state">Selecciona un trimestre para consultar la rúbrica.</p> : !rubric ? <p className="status" role="status">Cargando rúbrica…</p> : <>
        <p className="muted">El XP es evidencia para la observación, no la calificación oficial.</p>{rubric.unattributedAnnualEventCount > 0 && <p className="read-only-note" role="status">Hay evidencia anual sin trimestre atribuido.</p>}
        {rubric.categories.every(item => item.qualifyingEventCount === 0) && <p className="empty-state">Todavía no hay evidencias en este trimestre. Puedes guardar una valoración profesional.</p>}
        <div className="rubric-rows">{rubric.categories.map(item => <div className="rubric-row" key={item.category}><strong>{labels[item.category].dimension}</strong><span>XP base: {item.baseXp}</span><span>Evidencias: {item.qualifyingEventCount}</span><span>Sugerencia: {item.suggestedLevel} — {labels[item.category].levels[item.suggestedLevel - 1]}</span>{item.lowEvidence && <small>Menos de 4 evidencias</small>}<label>Nivel final<select aria-label={`Nivel final ${labels[item.category].dimension}`} value={draft[item.category] ?? ''} onChange={event => setDraft(current => ({...current, [item.category]: event.target.value ? Number(event.target.value) as RubricLevel : null}))} disabled={!editable || pending}><option value="">Sugerencia</option>{[1,2,3,4].map(level => <option key={level} value={level}>{level} — {labels[item.category].levels[level - 1]}</option>)}</select></label></div>)}</div>
        {rubric.state === 'CLOSED' && rubric.snapshot && <div className="rubric-closed" role="status"><p>Nota exacta: <strong>{formatRubricGrade(rubric.snapshot.gradeDecimal)}</strong></p><p>Cerrada: {new Date(rubric.snapshot.closedAt).toLocaleString('es-ES')}</p>{rubric.snapshot.comment && <p>Comentario: {rubric.snapshot.comment}</p>}{rubric.stale && <p className="read-only-note">La evidencia cambió; los valores oficiales no se modificaron.</p>}</div>}
        {readOnly && <p className="read-only-note" role="status">Solo lectura: este registro está archivado.</p>}
        {rubric.state !== 'CLOSED' && <label>Comentario privado<textarea value={comment} onChange={event => setComment(event.target.value)} disabled={!editable || pending} /></label>}
        {editable && <div className="rubric-actions"><button type="button" disabled={pending} onClick={() => void mutate(keyValue => workspaceApi.saveRubric(context.studentId, termId, context.academicYearId, {expectedRevision:rubric.revision, overrides:draft, comment:comment.trim() || null}, keyValue), 'Guardar cambios')}>Guardar cambios</button><button type="button" disabled={pending} onClick={cancel}>Cancelar</button><button type="button" disabled={pending} onClick={() => void mutate(keyValue => workspaceApi.closeRubric(context.studentId, termId, context.academicYearId, rubric.revision, keyValue), 'Cerrar trimestre')}>Cerrar trimestre</button></div>}
        {rubric.state === 'CLOSED' && !readOnly && <div className="rubric-actions"><button type="button" disabled={pending} onClick={() => setConfirmReopen(true)}>Reabrir evaluación</button>{confirmReopen && <div role="dialog" aria-label="Confirmar reapertura"><label>Motivo de reapertura<textarea value={reason} onChange={event => setReason(event.target.value)} /></label><button type="button" disabled={pending || !reason.trim()} onClick={() => void mutate(keyValue => workspaceApi.reopenRubric(context.studentId, termId, context.academicYearId, rubric.revision, reason.trim(), keyValue), 'Reabrir evaluación')}>Confirmar reapertura</button><button type="button" disabled={pending} onClick={() => { setConfirmReopen(false); setReason(''); }}>Cancelar</button></div>}</div>}
      </>}
    </>}
    {pending && <p className="status" role="status">Guardando… No repitas la acción.</p>}
    {selectedTerm && <small className="muted">{selectedTerm.startsOn} — {selectedTerm.endsOn}</small>}
  </section>;
}
