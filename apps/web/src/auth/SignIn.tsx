import { useState } from 'react';
import { WorkspaceShell, type WorkspaceRoute } from '../workspace/WorkspaceShell';

export function SignIn({ onSignedIn, activeRoute = 'home' }: { onSignedIn: () => void; activeRoute?: WorkspaceRoute }) {
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/auth/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
    if (!response.ok) {
      setError('Sign-in failed. Check your credentials.');
      return;
    }
    onSignedIn();
  }

  return <WorkspaceShell activeRoute={activeRoute}><section className="panel login-panel">
    <p className="eyebrow">ACADEMY CHRONICLE · TEACHER ACCESS</p>
    <h1>Open the Game Master desk</h1>
    <p className="muted">Prepare the room, reward the moment, and keep teaching.</p>
    <form onSubmit={submit}><label htmlFor="teacher-email">Email</label><input id="teacher-email" name="email" type="email" autoComplete="username" required /><label htmlFor="teacher-password">Password</label><input id="teacher-password" name="password" type="password" autoComplete="current-password" required /><button type="submit">Sign in</button>{error && <p className="error" role="alert">{error}</p>}</form>
  </section></WorkspaceShell>;
}
