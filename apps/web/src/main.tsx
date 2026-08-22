import * as React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type ProjectionStudent = {
  avatar: string;
  alias: string;
  specialty: string;
  unlockedBadge: string | null;
  xpLevel: number;
  progressToNextLevel: number;
  energyVisualState: string;
  coinBalance: number;
  narrativeProgress: number;
};

const groupId = '00000000-0000-4000-8000-000000000001';

async function loadProjection() {
  const response = await fetch(`/api/v1/projection/groups/${groupId}/students`);
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Projection unavailable.');
  return response.json() as Promise<ProjectionStudent[]>;
}

function App() {
  const [students, setStudents] = React.useState<ProjectionStudent[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loadProjection().then(setStudents).catch(() => setError('Projection unavailable.')).finally(() => setLoading(false));
  }, []);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/auth/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
    if (!response.ok) {
      setError('Sign-in failed. Check your credentials.');
      return;
    }
    setLoading(true);
    try { setStudents(await loadProjection()); } catch { setError('Projection unavailable.'); } finally { setLoading(false); }
  }

  if (loading) return <main className="shell"><p className="status">Connecting to classroom signal…</p></main>;
  if (!students) return <main className="shell"><section className="panel login-panel"><p className="eyebrow">PROTOCOL ECLIPSE · TEACHER ACCESS</p><h1>Open the classroom signal</h1><p className="muted">Sign in to view the classroom-safe projection.</p><form onSubmit={signIn}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required /><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /><button type="submit">Sign in</button>{error && <p className="error" role="alert">{error}</p>}</form></section></main>;
  return <main className="shell"><header className="masthead"><div><p className="eyebrow">CLASSROOM VIEW · SAFE FIELDS ONLY</p><h1>Classroom signal</h1></div><span className="live-dot">LIVE</span></header><section className="signal-grid" aria-label="Classroom projection">{students.map((student) => <article className="student-card" data-testid="projection-card" key={student.alias}><div className="avatar" aria-hidden="true">{student.avatar === 'default' ? '◌' : '•'}</div><div className="student-copy"><h2>{student.alias}</h2><p>{student.specialty}</p><div className="student-meta"><span>Level {student.xpLevel}</span><span>{student.energyVisualState}</span></div></div></article>)}</section></main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
