import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import { useAuth } from '../contexts/auth';
import { AuthScreen, AuthField, AuthButton } from './SignIn';

const MIN_LENGTH = 10;

/**
 * Choosing a new password. forced: the first sign-in with a temporary password (shown on its own, nothing else
 * is reachable until it's done); otherwise a page inside the app, from the account menu.
 */
export default function ChangePassword({ forced = false }) {
  const { user, changePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const problem = next && next.length < MIN_LENGTH ? `At least ${MIN_LENGTH} characters.`
    : again && next !== again ? 'The two new passwords don\'t match.' : '';

  async function submit(e) {
    e.preventDefault();
    if (problem || !current || !next || next !== again) return;
    setBusy(true);
    setError('');
    try {
      await changePassword(current, next);
      setDone(true);
      setCurrent(''); setNext(''); setAgain('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <AuthField label={forced ? 'Temporary password' : 'Current password'} icon={KeyRound} password autoFocus
        autoComplete="current-password" value={current} onChange={setCurrent} />
      <AuthField label="New password" icon={Lock} password autoComplete="new-password" value={next} onChange={setNext}
        hint={`At least ${MIN_LENGTH} characters, not containing your username. A short sentence is easy to remember.`} />
      <AuthField label="New password again" icon={Lock} password autoComplete="new-password" value={again} onChange={setAgain} />
      {(problem || error) && <p role="alert" className="m-0 -mt-1 text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{problem || error}</p>}
      {done && !forced && <p role="status" className="m-0 text-[13px] text-[#047857]">Password changed. You've been signed out on other devices.</p>}
      <AuthButton busy={busy} disabled={Boolean(problem) || !current || !next || next !== again}>
        {busy ? 'Saving…' : forced ? 'Save and continue' : 'Change password'}
      </AuthButton>
      {forced && (
        <button type="button" onClick={signOut} className="btn-ghost justify-center text-[13px]">Not you? Sign out</button>
      )}
    </form>
  );

  if (forced) {
    return (
      <AuthScreen title="Choose your password" subtitle={`Welcome${user?.display_name ? `, ${user.display_name}` : ''}. Replace the temporary password your admin gave you.`}>
        {form}
      </AuthScreen>
    );
  }
  return (
    <div className="max-w-[440px] mx-auto px-4 py-10 flex flex-col gap-5">
      <div>
        <h1 className="m-0 font-heading text-[24px] font-bold text-navy">Change password</h1>
        <p className="m-0 mt-1 text-[14px] text-slate">Signed in as {user?.username}.</p>
      </div>
      <div className="card p-6">{form}</div>
      <button type="button" onClick={() => navigate(-1)} className="btn-ghost self-start text-[13px]">Back</button>
    </div>
  );
}
