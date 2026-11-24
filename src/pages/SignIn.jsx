import { useState } from 'react';
import { Layers, User, Lock, Eye, EyeOff, ArrowRight, MessagesSquare, FileSliders, ShieldCheck } from 'lucide-react';
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
    <AuthScreen title="Welcome back" subtitle="Sign in with the username and password your admin gave you.">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <AuthField label="Username" icon={User} autoFocus autoComplete="username" value={username}
          onChange={setUsername} />
        <AuthField label="Password" icon={Lock} password autoComplete="current-password" value={password}
          onChange={setPassword} />
        {error && <p role="alert" className="m-0 -mt-1 text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        <AuthButton busy={busy} disabled={!username.trim() || !password}>{busy ? 'Signing in…' : 'Sign in'}</AuthButton>
      </form>
      <p className="m-0 mt-6 text-[13px] text-slate">
        Forgot your password or need an account? Ask your admin.
      </p>
    </AuthScreen>
  );
}

const POINTS = [
  [MessagesSquare, 'Ask questions and get answers from your own documents, with page references.'],
  [FileSliders, 'Turn what you find into slide decks and training documents.'],
  [ShieldCheck, 'Runs on your company network. Your documents never leave it.'],
];

/**
 * The frame of the sign-in and first-password pages: a navy brand panel beside the form (the panel folds into a
 * small header on narrow screens).
 */
export function AuthScreen({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex bg-white font-body text-ink">
      <aside className="hidden lg:flex relative w-[46%] max-w-[680px] bg-navy text-white overflow-hidden">
        {/* The home page's cobalt glow and dot grid, on navy. */}
        <div aria-hidden className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(ellipse 70% 55% at 20% 0%, rgba(37,99,235,0.45), transparent 70%), radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)',
          backgroundSize: 'auto, 22px 22px',
        }} />
        <div aria-hidden className="absolute -right-24 -bottom-24 w-[420px] h-[420px] rounded-full bg-cobalt/20 blur-3xl" />
        <div className="relative flex flex-col justify-between w-full px-14 py-12">
          <Brand light />
          <div className="max-w-[440px]">
            <h2 className="m-0 font-heading text-[34px] leading-tight font-bold tracking-tight">
              Training material from the documents you already have.
            </h2>
            <ul className="list-none m-0 mt-8 p-0 flex flex-col gap-5">
              {POINTS.map(([Icon, text]) => (
                <li key={text} className="flex gap-3.5 items-start">
                  <span className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon size={17} className="text-[#93B4F8]" />
                  </span>
                  <span className="text-[15px] text-white/80 leading-relaxed pt-1.5">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="m-0 text-[12px] text-white/45">TD Prod House</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col bg-canvas lg:bg-white">
        <div className="lg:hidden px-6 pt-6"><Brand /></div>
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-[380px] max-w-full">
            <h1 className="m-0 font-heading text-[30px] font-bold text-navy tracking-tight">{title}</h1>
            {subtitle && <p className="m-0 mt-2 mb-8 text-[15px] text-slate leading-relaxed">{subtitle}</p>}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function Brand({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${light ? 'bg-cobalt' : 'bg-navy'} text-white`}><Layers size={18} /></span>
      <span className={`font-heading text-[20px] font-bold tracking-tight ${light ? 'text-white' : 'text-navy'}`}>TDPH</span>
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
      className="group h-12 rounded-lg bg-cobalt hover:bg-cobalt-hover text-white text-[15px] font-semibold border-0 cursor-pointer
        flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
      {children}
      {!busy && <ArrowRight size={17} className="transition-transform group-enabled:group-hover:translate-x-0.5" />}
    </button>
  );
}
