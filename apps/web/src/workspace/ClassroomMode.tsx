import { useEffect, useRef, useState } from 'react';
import { gameApi, type ClassroomStudentDto, type ShowStudentCreation } from '../game/game-api';
import { AvatarPreview, initialsForAvatar } from './AvatarPreview';
import { LocalQrCode } from './LocalQrCode';

type Props = { groupId: string; academicYearId: string; students: Array<{ id: string; alias: string }>; historical: boolean };

function copy(value: string) {
  return navigator.clipboard?.writeText(value).then(() => undefined);
}

export function remainingSeconds(expiresAt: string, now = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
}

export function durationLabel(seconds: number) {
  return seconds === 60 || seconds % 60 === 0
    ? `${seconds / 60} minuto${seconds === 60 ? '' : 's'}`
    : `${seconds} segundos`;
}

export function ClassroomMode({ groupId, academicYearId, students, historical }: Props) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<ClassroomStudentDto[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [lease, setLease] = useState<ShowStudentCreation | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');
  const [leaseRemaining, setLeaseRemaining] = useState(0);
  const [leaseAnnouncement, setLeaseAnnouncement] = useState('');
  const generation = useRef(0);
  const contextRef = useRef({ groupId, academicYearId });
  const leaseContext = useRef<string | null>(null);
  const leaseGroupId = useRef<string | null>(null);
  const announcedLeaseSeconds = useRef<number | null>(null);
  const createController = useRef<AbortController | null>(null);
  const failedRevokeGroup = useRef<string | null>(null);
  const pendingCloseGroup = useRef<string | null>(null);
  const revokeRequests = useRef(new Map<string, Promise<void>>());
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function canonicalRevoke(issuingGroupId: string) {
    const existing = revokeRequests.current.get(issuingGroupId);
    if (existing) return existing;
    const request = gameApi.revokeShowStudent(issuingGroupId).finally(() => {
      if (revokeRequests.current.get(issuingGroupId) === request) revokeRequests.current.delete(issuingGroupId);
    });
    revokeRequests.current.set(issuingGroupId, request);
    return request;
  }

  useEffect(() => {
    const previous = contextRef.current;
    const changed = previous.groupId !== groupId || previous.academicYearId !== academicYearId;
    contextRef.current = { groupId, academicYearId };
    if (!changed) return;

    generation.current += 1;
    const hadInFlightCreate = createController.current !== null;
    createController.current?.abort();
    createController.current = null;
    const oldLeaseContext = leaseContext.current;
    const oldLeaseGroupId = leaseGroupId.current;
    const shouldRevoke = Boolean(oldLeaseContext || pendingCloseGroup.current || hadInFlightCreate || failedRevokeGroup.current);
    const oldGroupId = previous.groupId;
    setCards([]);
    setSelectedStudentId('');
    setLease(null);
    leaseContext.current = null;
    leaseGroupId.current = null;
    setCopied('');
    setMessage('');
    setState('idle');
    failedRevokeGroup.current = null;
    pendingCloseGroup.current = null;
    if (shouldRevoke && oldGroupId) {
      void canonicalRevoke(oldLeaseGroupId ?? oldGroupId).catch(() => {
        if (contextRef.current.groupId !== groupId || contextRef.current.academicYearId !== academicYearId) return;
        failedRevokeGroup.current = oldLeaseGroupId ?? oldGroupId;
        setState('error');
        setMessage('No se pudo finalizar el acceso anterior. Reintenta para confirmar la revocación.');
      });
    }
  }, [groupId, academicYearId]);
  useEffect(() => { if (!open) return; const controller = new AbortController(); const current = ++generation.current; setState('loading'); setMessage('');
    gameApi.classroomCards(groupId, academicYearId, controller.signal).then(value => { if (current === generation.current) { setCards(value); if (failedRevokeGroup.current === null) setState('idle'); } }).catch(error => { if (error.name !== 'AbortError' && current === generation.current) { setState('error'); setMessage(error.status === 401 ? 'Sign-in required.' : 'Classroom cards are unavailable.'); } });
    return () => controller.abort();
  }, [open, groupId, academicYearId]);
  useEffect(() => { if (!open) triggerRef.current?.focus(); else dialogRef.current?.focus(); }, [open]);
   useEffect(() => {
     if (!lease) { setLeaseRemaining(0); setLeaseAnnouncement(''); announcedLeaseSeconds.current = null; return; }
     const update = () => {
       const seconds = remainingSeconds(lease.expiresAt);
       setLeaseRemaining(seconds);
       if (seconds === 0) {
         setLease(null); leaseContext.current = null; leaseGroupId.current = null;
         setMessage('El acceso ha finalizado.');
         return;
       }
       // Keep the live region useful without announcing every visual tick.
       const shouldAnnounce = announcedLeaseSeconds.current === null || [60, 30, 10, 5].includes(seconds);
       if (shouldAnnounce && announcedLeaseSeconds.current !== seconds) {
         announcedLeaseSeconds.current = seconds;
         setLeaseAnnouncement(`El acceso finaliza en ${durationLabel(seconds)}.`);
       }
     };
     update();
     const timer = window.setInterval(update, 1000);
     return () => window.clearInterval(timer);
   }, [lease]);
  useEffect(() => () => {
    const issuingGroupId = leaseGroupId.current ?? pendingCloseGroup.current ?? failedRevokeGroup.current;
    if (issuingGroupId) void canonicalRevoke(issuingGroupId).catch(() => undefined);
  }, []);

  const selected = cards.find(card => card.avatar.studentId === selectedStudentId);
  async function create() {
    if (!selected || historical) return;
    const requestGeneration = generation.current;
    const controller = new AbortController();
    createController.current = controller;
    setState('loading'); setMessage('Creating temporary access…');
    try {
      const result = await gameApi.createShowStudent(groupId, selectedStudentId, crypto.randomUUID(), controller.signal);
      if (requestGeneration !== generation.current) {
        await canonicalRevoke(groupId);
        return;
      }
      leaseContext.current = `${academicYearId}:${groupId}`;
      leaseGroupId.current = groupId;
      setLease(result); setState('idle');
    } catch (error: any) {
      if (error.name !== 'AbortError' && requestGeneration === generation.current) { setState('error'); setMessage(error.status === 409 ? 'This group is read-only.' : 'Could not create access. Retry.'); }
    } finally {
      if (createController.current === controller) createController.current = null;
    }
  }
  async function revoke() {
    if (!lease) return;
    const issuingGroupId = leaseContext.current;
    const issuingGroup = leaseGroupId.current ?? groupId;
    setLease(null);
    leaseContext.current = null;
    leaseGroupId.current = null;
    setCopied('');
    if (!issuingGroupId) { setOpen(false); return; }
    pendingCloseGroup.current = issuingGroup;
    setState('loading');
    setMessage('Finalizando el acceso…');
    try {
      await canonicalRevoke(issuingGroup);
      pendingCloseGroup.current = null;
      setOpen(false);
    } catch {
      setState('error');
      setMessage('No se pudo finalizar el acceso. Reintenta para confirmar la revocación.');
    }
  }
  async function retryRevoke() {
    const issuingGroupId = pendingCloseGroup.current ?? failedRevokeGroup.current;
    if (!issuingGroupId) return;
    const explicitClose = pendingCloseGroup.current === issuingGroupId;
    try {
      await canonicalRevoke(issuingGroupId);
      pendingCloseGroup.current = null;
      failedRevokeGroup.current = null;
      if (explicitClose) setOpen(false);
      else { setState('idle'); setMessage('Acceso anterior revocado.'); }
    } catch { setState('error'); setMessage('No se pudo finalizar el acceso anterior. Reintenta para confirmar la revocación.'); }
  }
  function close() { if (pendingCloseGroup.current) return; if (lease) void revoke(); else setOpen(false); }
  return <section className="classroom-mode" aria-labelledby="classroom-mode-title">
    <button ref={triggerRef} type="button" disabled={!groupId || !students.length || historical} aria-describedby="classroom-mode-help" onClick={() => setOpen(true)}>Modo aula</button>
    <span id="classroom-mode-help" className="muted">{historical ? 'Historical groups are read-only.' : !students.length ? 'Add a student before opening Classroom Mode.' : 'Show safe classroom fields only.'}</span>
    {open && <div className="classroom-dialog-backdrop" role="presentation"><div ref={dialogRef} className="classroom-dialog panel" role="dialog" aria-modal="true" aria-labelledby="classroom-mode-title" tabIndex={-1} onKeyDown={event => { if (event.key !== 'Tab') return; const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input') ?? []); if (!focusable.length) return; const index = focusable.indexOf(document.activeElement as HTMLElement); const next = event.shiftKey ? (index <= 0 ? focusable.length - 1 : index - 1) : (index === focusable.length - 1 ? 0 : index + 1); event.preventDefault(); focusable[next].focus(); }}>
       <button type="button" className="panel-close" aria-label="Close Classroom Mode" disabled={state === 'loading' && Boolean(pendingCloseGroup.current)} onClick={close}>×</button><p className="eyebrow">CLASSROOM MODE</p><h2 id="classroom-mode-title">Safe classroom cards</h2>
      <div aria-live="polite" className="sr-status">{state === 'loading' ? 'Loading classroom cards…' : message}</div>
      {state === 'loading' && <p className="status" role="status">Loading classroom cards…</p>}
       {state === 'error' && <p className="error" role="alert">{message} <button type="button" onClick={() => { if (pendingCloseGroup.current || failedRevokeGroup.current) void retryRevoke(); else { setOpen(false); window.setTimeout(() => setOpen(true), 0); } }}>Reintentar</button></p>}
      {state !== 'loading' && !cards.length && !message && <p className="empty-state">No classroom cards are available.</p>}
      {state !== 'loading' && <div className="classroom-card-grid">{cards.map(card => <button type="button" key={card.avatar.studentId} className={selectedStudentId === card.avatar.studentId ? 'classroom-card is-selected' : 'classroom-card'} aria-pressed={selectedStudentId === card.avatar.studentId} onClick={() => setSelectedStudentId(card.avatar.studentId)}>
        <AvatarPreview profile={card.avatar.profile} initials={initialsForAvatar(card.avatar.alias)} size="card" /><strong>{card.avatar.alias}</strong><span>{card.avatar.specialty ?? 'Academy member'} · Level {card.avatar.level}</span><span>{card.energy ? `Energy: ${card.energy}` : 'Energía aún no disponible'}</span><span>Gems: {card.gems.EMERALD} · {card.gems.RUBY} · {card.gems.DIAMOND}</span><span>{card.avatar.badges.length ? `${card.avatar.badges.length} badges` : 'No badges yet'}</span>
      </button>)}</div>}
      <button type="button" disabled={!selected || historical || state === 'loading'} onClick={create}>Mostrar al alumno</button>
         {lease && leaseContext.current === `${academicYearId}:${groupId}` && <div className="show-student-creation" role="status"><strong>Acceso disponible durante {durationLabel(leaseRemaining)}</strong><span aria-label="Tiempo restante">Tiempo restante: {durationLabel(leaseRemaining)}</span><span aria-live="polite" className="sr-status">{leaseAnnouncement}</span><label>Enlace<input readOnly value={lease.accessUrl} aria-label="Show Student URL" /></label><LocalQrCode accessUrl={lease.accessUrl} /><p className="sr-status">El QR contiene el enlace temporal de acceso.</p><button type="button" onClick={() => { void copy(lease.accessUrl).then(() => setCopied('Link copied.')); }}>Copiar enlace</button><button type="button" onClick={() => { void copy(lease.accessCode).then(() => setCopied('Code copied.')); }}>Copiar código</button><span role="status">{copied}</span><code>{lease.accessCode}</code><button type="button" onClick={revoke}>Finalizar acceso</button></div>}
    </div></div>}
  </section>;
}
