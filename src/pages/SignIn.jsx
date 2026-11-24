import { useState } from 'react';
import { Layers, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/auth';

/** The sign-in page. Accounts are made by an admin, so there is no sign-up here. */
export default function SignIn() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen title="Sign in to TDPH" subtitle="Use the username and password your admin gave you.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink">Username</span>
          <input className="field" autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink">Password</span>
          <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="m-0 text-[13px] text-red-700">{error}</p>}
        <button type="submit" className="btn-primary justify-center" disabled={busy || !username.trim() || !password}>
          <LogIn size={16} />{busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="m-0 text-[12px] text-slate text-center">Forgot your password? Ask your admin to reset it.</p>
      </form>
    </AuthScreen>
  );
}

/** The centred card shared by the sign-in and first password pages. */
export function AuthScreen({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10 font-body text-ink">
      <div className="w-[400px] max-w-full flex flex-col gap-6">
        <div className="flex items-center gap-2.5 justify-center">
          <span className="w-9 h-9 rounded-lg bg-navy text-white flex items-center justify-center"><Layers size={18} /></span>
          <span className="font-heading text-[22px] font-bold text-navy tracking-tight">TDPH</span>
        </div>
        <div className="card p-7 flex flex-col gap-5">
          <div>
            <h1 className="m-0 font-heading text-[22px] font-bold text-navy">{title}</h1>
            {subtitle && <p className="m-0 mt-1 text-[14px] text-slate">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
