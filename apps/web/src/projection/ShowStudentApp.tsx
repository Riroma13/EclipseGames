import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gameApi, type ShowStudentDto } from '../game/game-api';
import { AvatarPreview, initialsForAvatar } from '../workspace/AvatarPreview';

export function credentialFromHash() {
  const query = window.location.hash.split('?')[1] ?? '';
  const params = new URLSearchParams(query);
  const token = params.get('token');
  const code = params.get('code');
  window.history.replaceState(null, '', '/#/show-student');
  return token ? { token } : code ? { code } : null;
}

export function ShowStudentApp() {
  const location = useLocation();
  const [student, setStudent] = useState<ShowStudentDto | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'expired'>('loading');
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const loadedLocation = useRef<string | null>(null);
  const load = async () => { setState('loading'); setError(''); try { const credential = credentialFromHash(); if (credential) await gameApi.exchangeShowStudent(credential); const value = await gameApi.showStudent(); if (Date.parse(value.expiresAt) <= Date.now()) throw new Error('expired'); setStudent(value); setState('ready'); } catch { setStudent(null); setState('expired'); setError('El acceso ha finalizado.'); } };
  useEffect(() => {
    const routeLocation = `${location.pathname}${location.search}`;
    if (loadedLocation.current === routeLocation) return;
    loadedLocation.current = routeLocation;
    void load();
  }, [location.pathname, location.search]);
  useEffect(() => { if (state === 'expired') heading.current?.focus(); }, [state]);
  useEffect(() => { if (!student) return; const delay = Math.max(0, Date.parse(student.expiresAt) - Date.now()); const timer = window.setTimeout(() => { setStudent(null); setState('expired'); setError('El acceso ha finalizado.'); }, delay); return () => window.clearTimeout(timer); }, [student]);
  if (state !== 'ready' || !student) return <main className="projection-screen show-student-screen"><h1 ref={heading} tabIndex={-1}>{state === 'loading' ? 'Opening temporary student view…' : 'El acceso ha finalizado'}</h1><p role={state === 'expired' ? 'status' : 'status'}>{state === 'loading' ? 'Loading safe classroom fields.' : error}</p>{state === 'expired' && <button type="button" onClick={() => void load()}>Retry</button>}</main>;
  const card = student.student;
  return <main className="projection-screen show-student-screen"><header><p className="display-kicker">VISTA TEMPORAL DEL ALUMNO</p><h1>{card.avatar.alias}</h1></header><section className="show-student-card" aria-live="polite"><AvatarPreview profile={card.avatar.profile} initials={initialsForAvatar(card.avatar.alias)} /><p>{card.avatar.specialty ?? 'Academy member'}</p><p>Level {card.avatar.level} · Progress {card.avatar.progress.progressPercent}%</p><p>{card.energy ? `Energy: ${card.energy}` : 'Energía aún no disponible'}</p><p>Gems: {card.gems.EMERALD} · {card.gems.RUBY} · {card.gems.DIAMOND}</p><p>{card.avatar.badges.length ? card.avatar.badges.map(b => b.label).join(' · ') : 'No badges yet'}</p>{student.behaviour && <p aria-label="Current behaviour">{student.behaviour.state === 'ALERT' ? 'Alerta' : student.behaviour.state}</p>}</section></main>;
}
