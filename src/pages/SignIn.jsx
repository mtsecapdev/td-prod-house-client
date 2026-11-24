import { useState } from 'react';
import { Layers, User, Lock, Eye, EyeOff } from 'lucide-react';
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
    <AuthScreen title="Sign in" subtitle="Use the details your admin gave you.">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <AuthField label="Username" icon={User} autoFocus autoComplete="username" value={username}
          onChange={setUsername} />
        <AuthField label="Password" icon={Lock} password autoComplete="current-password" value={password}
          onChange={setPassword} />
        {error && <p role="alert" className="m-0 -mt-1 text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        <AuthButton busy={busy} disabled={!username.trim() || !password}>{busy ? 'Signing in…' : 'Sign in'}</AuthButton>
      </form>
      <p className="m-0 mt-5 text-[13px] text-slate text-center">Forgot your password? Ask your admin.</p>
    </AuthScreen>
  );
}

/** The frame of the sign-in and first-password pages: one card on the navy background. */
export function AuthScreen({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-navy font-body text-ink overflow-hidden">
      {/* A cobalt glow and a faint dot grid, as on the home page. */}
      <div aria-hidden className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(ellipse 80% 70% at 0% 0%, rgba(37,99,235,0.35), transparent 70%), radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: 'auto, 22px 22px',
      }} />
      <div className="relative w-[400px] max-w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <span className="w-9 h-9 rounded-lg bg-navy text-white flex items-center justify-center"><Layers size={18} /></span>
          <span className="font-heading text-[20px] font-bold text-navy tracking-tight">TDPH</span>
        </div>
        <h1 className="m-0 font-heading text-[24px] font-bold text-navy tracking-tight text-center">{title}</h1>
        {subtitle && <p className="m-0 mt-1.5 mb-7 text-[14px] text-slate leading-relaxed text-center">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

/** A labelled input with an icon; password: hidden text with a show/hide button. */
export function AuthField({ label, icon: Icon, password = false, value, onChange, hint, ...rest }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <span className="relative flex items-center">
        {Icon && <Icon size={17} className="absolute left-3.5 text-slate/70 pointer-events-none" />}
        <input {...rest} type={password && !shown ? 'password' : 'text'} value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-12 rounded-lg border border-[#CBD5E1] bg-white text-[15px] text-ink outline-none transition-shadow
            focus:border-cobalt focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] ${Icon ? 'pl-11' : 'pl-3.5'} ${password ? 'pr-11' : 'pr-3.5'}`} />
        {password && (
          <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'}
            title={shown ? 'Hide password' : 'Show password'}
            className="absolute right-1.5 w-9 h-9 rounded-md flex items-center justify-center text-slate bg-transparent border-0 cursor-pointer hover:bg-canvas">
            {shown ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
      {hint && <span className="text-[12px] text-slate leading-snug">{hint}</span>}
    </label>
  );
}

/** The full-width submit button of the auth pages. */
export function AuthButton({ busy, disabled, children }) {
  return (
    <button type="submit" disabled={busy || disabled}
      className="h-12 rounded-lg bg-cobalt hover:bg-cobalt-hover text-white text-[15px] font-semibold border-0 cursor-pointer
        flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}
