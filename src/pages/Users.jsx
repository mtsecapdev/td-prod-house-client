import { useEffect, useState } from 'react';
import { UserPlus, KeyRound, ShieldCheck, Shield, Ban, CheckCircle2, X } from 'lucide-react';
import { users as usersApi } from '../services/api';
import { useAuth } from '../contexts/auth';
import CopyButton from '../components/workspace/CopyButton';

function when(date) {
  if (!date) return 'Never';
  return new Date(date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** A temporary password, shown once after creating an account or resetting a password. */
function TemporaryPassword({ shown, onClose }) {
  if (!shown) return null;
  return (
    <div role="status" className="card p-4 border-[#BFD3F5] bg-[#F4F8FE] flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <p className="m-0 flex-1 text-[14px] text-ink">
          {shown.created ? 'Account created for' : 'New temporary password for'} <strong>{shown.username}</strong>.
          Give them this password; they'll choose their own when they sign in. It won't be shown again.
        </p>
        <button type="button" onClick={onClose} className="icon-btn w-7 h-7" aria-label="Close"><X size={15} /></button>
      </div>
      <div className="flex items-center gap-2">
        <code className="px-3 py-1.5 rounded-md bg-white border border-border text-[16px] tracking-wider font-mono">{shown.password}</code>
        <CopyButton text={shown.password} />
      </div>
    </div>
  );
}

/** Admin: who can use TDPH. Accounts are made here; nobody signs up on their own. */
export default function Users() {
  const { user: me } = useAuth();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(null);
  const [form, setForm] = useState({ username: '', displayName: '', role: 'user' });
  const [busy, setBusy] = useState(false);

  const load = () => usersApi.list().then((d) => setList(d.users)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    if (!form.username.trim()) return;
    setBusy(true);
    setError('');
    try {
      const d = await usersApi.create(form);
      setShown({ username: d.user.username, password: d.temporaryPassword, created: true });
      setForm({ username: '', displayName: '', role: 'user' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function act(fn) {
    setError('');
    try {
      await fn();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const resetPassword = (u) => act(async () => {
    const d = await usersApi.resetPassword(u.id);
    setShown({ username: u.username, password: d.temporaryPassword, created: false });
  });

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-heading text-[24px] font-bold text-navy">Users</h1>
        <p className="m-0 mt-1 text-[14px] text-slate">Add the people who can use TDPH.</p>
      </div>

      <form onSubmit={create} className="card p-5 flex flex-col gap-4">
        <h2 className="m-0 text-[15px] font-semibold text-ink">Add a person</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto] items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Username</span>
            <input className="field" value={form.username} 
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Name</span>
            <input className="field" value={form.displayName} 
              onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Role</span>
            <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" className="btn-primary justify-center h-[46px]" disabled={busy || !form.username.trim()}>
            <UserPlus size={16} />Add
          </button>
        </div>
      </form>

      <TemporaryPassword shown={shown} onClose={() => setShown(null)} />
      {error && <p role="alert" className="m-0 text-[14px] text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-[14px] border-collapse min-w-[640px]">
          <thead>
            <tr className="text-left text-[12px] text-slate uppercase tracking-wide border-b border-border">
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Last signed in</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list === null && <tr><td colSpan={4} className="px-4 py-6 text-slate">Loading…</td></tr>}
            {list?.map((u) => {
              const self = u.id === me?.id;
              return (
                <tr key={u.id} className={`border-b border-border last:border-0 ${u.disabled ? 'text-slate' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{u.display_name || u.username}{self && <span className="text-slate font-normal"> (you)</span>}</div>
                    <div className="text-[12px] text-slate">
                      {u.username}
                      {u.disabled && <span className="ml-2 text-red-700">Disabled</span>}
                      {!u.disabled && u.must_change_password && <span className="ml-2 text-amber-700">Hasn't set a password yet</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{u.role === 'admin' ? 'Admin' : 'User'}</td>
                  <td className="px-4 py-3 text-slate">{when(u.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <button type="button" className="btn-ghost text-[13px] disabled:opacity-35 disabled:cursor-not-allowed" onClick={() => resetPassword(u)} disabled={self}
                        title={self ? 'Change your own password from the account menu' : 'Give them a new temporary password'}>
                        <KeyRound size={14} />Reset password
                      </button>
                      <button type="button" className="btn-ghost text-[13px] disabled:opacity-35 disabled:cursor-not-allowed" disabled={self}
                        onClick={() => act(() => usersApi.update(u.id, { role: u.role === 'admin' ? 'user' : 'admin' }))}>
                        {u.role === 'admin' ? <><Shield size={14} />Make user</> : <><ShieldCheck size={14} />Make admin</>}
                      </button>
                      <button type="button" className="btn-ghost text-[13px] disabled:opacity-35 disabled:cursor-not-allowed" disabled={self}
                        onClick={() => act(() => usersApi.update(u.id, { disabled: !u.disabled }))}>
                        {u.disabled ? <><CheckCircle2 size={14} />Enable</> : <><Ban size={14} />Disable</>}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
